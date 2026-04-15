// ProfitLoss.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import BottomNav from '../components/shared/BottomNav';
import Greetings from '../components/home/Greetings';
import {
  getProfitLossReport,
  generateProfitLossReport,
  generateDailyProfitLoss,
  getAllProfitLossReports,
  getAllTimeProfitLossSummary,
  deleteProfitLossReport,
  getExpenses,
  getOrders,
} from '../https';
import { FaChartLine, FaDownload, FaTrash, FaCalendar, FaDollarSign, FaBox, FaFileAlt, FaSpinner, FaEye, FaPrint, FaSync, FaExclamationTriangle } from 'react-icons/fa';

// Constants
const CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes cache
const STALE_TIME = 30000; // 30 seconds stale time

// Global cache object to prevent re-fetching
const globalCache = new Map();

// Helper functions
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

const formatNumber = (num) => {
  return new Intl.NumberFormat('en-PH').format(num || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

const formatShortDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

// Date helpers
const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getYesterdayDate = () => {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStartOfWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const dayNum = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayNum}`;
};

const getEndOfWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? 0 : 7);
  const sunday = new Date(now);
  sunday.setDate(diff);
  const year = sunday.getFullYear();
  const month = String(sunday.getMonth() + 1).padStart(2, '0');
  const dayNum = String(sunday.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayNum}`;
};

const getStartOfMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

const getEndOfMonth = () => {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const year = lastDay.getFullYear();
  const month = String(lastDay.getMonth() + 1).padStart(2, '0');
  const day = String(lastDay.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStartOfLastMonth = () => {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = lastMonth.getFullYear();
  const month = String(lastMonth.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

const getEndOfLastMonth = () => {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
  const year = lastDay.getFullYear();
  const month = String(lastDay.getMonth() + 1).padStart(2, '0');
  const day = String(lastDay.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStartOfYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  return `${year}-01-01`;
};

const getEndOfYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  return `${year}-12-31`;
};

const getDateRange = (period, customStart = null, customEnd = null) => {
  switch(period) {
    case 'today': return { startDate: getTodayDate(), endDate: getTodayDate() };
    case 'yesterday': return { startDate: getYesterdayDate(), endDate: getYesterdayDate() };
    case 'thisWeek': return { startDate: getStartOfWeek(), endDate: getEndOfWeek() };
    case 'thisMonth': return { startDate: getStartOfMonth(), endDate: getEndOfMonth() };
    case 'lastMonth': return { startDate: getStartOfLastMonth(), endDate: getEndOfLastMonth() };
    case 'thisYear': return { startDate: getStartOfYear(), endDate: getEndOfYear() };
    case 'custom': return { startDate: customStart || '', endDate: customEnd || '' };
    default: return { startDate: getTodayDate(), endDate: getTodayDate() };
  }
};

// Optimized components with memo
const StatCard = React.memo(({ title, value, icon: Icon, color }) => (
  <div className="bg-white rounded-xl shadow-sm p-4 border-l-4" style={{ borderLeftColor: color }}>
    <div className="flex justify-between items-center">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-lg font-semibold mt-1">{value}</p>
      </div>
      {Icon && <Icon className="text-gray-400 text-xl" />}
    </div>
  </div>
));

const TabButton = React.memo(({ tab, label, icon: Icon, isActive, onClick }) => (
  <button
    onClick={() => onClick(tab)}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium capitalize transition-all duration-150 ${
      isActive 
        ? 'bg-blue-600 text-white shadow-md' 
        : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    {Icon && <Icon className="text-sm" />}
    {label}
  </button>
));

const DatePeriodButton = React.memo(({ label, icon, description, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-start gap-1 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
      isActive 
        ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-300' 
        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-blue-300'
    }`}
  >
    <div className="flex items-center gap-2 w-full">
      <span className="text-lg">{icon}</span>
      <span className="font-semibold">{label}</span>
    </div>
    {description && (
      <p className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>
        {description}
      </p>
    )}
  </button>
));

const ProfitLoss = () => {
  // State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [quickReport, setQuickReport] = useState(null);
  const [savedReports, setSavedReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [datePeriod, setDatePeriod] = useState('today');
  const [dateRange, setDateRange] = useState({ startDate: getTodayDate(), endDate: getTodayDate() });
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [expensesList, setExpensesList] = useState([]);
  const [ordersData, setOrdersData] = useState([]);
  
  // Refs for preventing duplicate requests
  const fetchingRef = useRef(false);
  const lastFetchRef = useRef({});
  const abortControllerRef = useRef(null);

  const datePeriods = [
    { value: 'today', label: 'Today', icon: '📅', description: 'Current day only' },
    { value: 'yesterday', label: 'Yesterday', icon: '📆', description: 'Previous day' },
    { value: 'thisWeek', label: 'This Week', icon: '📊', description: 'Monday - Sunday' },
    { value: 'thisMonth', label: 'This Month', icon: '📈', description: 'Current month' },
    { value: 'lastMonth', label: 'Last Month', icon: '📉', description: 'Previous month' },
    { value: 'thisYear', label: 'This Year', icon: '🎯', description: 'Current year' },
    { value: 'custom', label: 'Custom Range', icon: '📅', description: 'Select your own dates' }
  ];

  // Update date range when period changes - IMMEDIATE, no loading
  useEffect(() => {
    if (datePeriod === 'custom') {
      setShowCustomPicker(true);
      if (customStartDate && customEndDate) {
        const range = getDateRange(datePeriod, customStartDate, customEndDate);
        setDateRange(range);
      }
    } else {
      setShowCustomPicker(false);
      const range = getDateRange(datePeriod);
      setDateRange(range);
    }
  }, [datePeriod, customStartDate, customEndDate]);

  // Fetch all orders once and cache them
  const fetchAllOrders = useCallback(async () => {
    const cacheKey = 'all_orders_data';
    const cached = globalCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
      setOrdersData(cached.data);
      return cached.data;
    }

    try {
      const response = await getOrders();
      let orders = [];
      
      if (response?.data?.data) orders = response.data.data;
      else if (Array.isArray(response?.data)) orders = response.data;
      else if (Array.isArray(response)) orders = response;
      
      globalCache.set(cacheKey, { data: orders, timestamp: Date.now() });
      setOrdersData(orders);
      return orders;
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }, []);

  // Get filtered orders based on date range - PURE COMPUTATION, no API call
  const getFilteredOrders = useCallback((startDate, endDate) => {
    if (!ordersData.length || !startDate || !endDate) return { totalOrders: 0, totalIncome: 0 };
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const completedOrders = ordersData.filter(order => {
      const orderDate = new Date(order.createdAt || order.orderDate);
      const isCompleted = order.orderStatus?.toLowerCase() === 'completed' || 
                         order.orderStatus?.toLowerCase() === 'delivered';
      return isCompleted && orderDate >= start && orderDate <= end;
    });
    
    const totalOrders = completedOrders.length;
    const totalIncome = completedOrders.reduce((sum, order) => {
      const amount = Number(order?.bills?.totalWithTax || order?.totalAmount || 0);
      return sum + amount;
    }, 0);
    
    return { totalOrders, totalIncome };
  }, [ordersData]);

  // Fetch quick report - OPTIMIZED with cache and no duplicate requests
  const fetchQuickReport = useCallback(async () => {
    if (!dateRange.startDate || !dateRange.endDate) return;
    
    const cacheKey = `pl_${dateRange.startDate}_${dateRange.endDate}`;
    const now = Date.now();
    
    // Check cache first
    const cached = globalCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_EXPIRY) {
      setQuickReport(cached.data);
      return;
    }
    
    // Prevent duplicate requests
    if (fetchingRef.current) return;
    if (lastFetchRef.current[cacheKey] && now - lastFetchRef.current[cacheKey] < STALE_TIME) return;
    
    fetchingRef.current = true;
    lastFetchRef.current[cacheKey] = now;
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setError(null);
    
    try {
      const [plResponse] = await Promise.all([
        getProfitLossReport(dateRange),
        fetchAllOrders()
      ]);
      
      const { totalOrders, totalIncome } = getFilteredOrders(dateRange.startDate, dateRange.endDate);
      
      let data = null;
      if (plResponse?.data?.data) data = plResponse.data.data;
      else if (plResponse?.data) data = plResponse.data;
      else if (plResponse) data = plResponse;
      
      if (data) {
        if (data.summary) {
          data.summary.totalOrders = totalOrders;
          data.summary.totalIncome = totalIncome;
          data.summary.totalProfit = totalIncome - (data.summary.totalExpenses || 0);
          data.summary.profitMargin = totalIncome > 0 
            ? ((totalIncome - (data.summary.totalExpenses || 0)) / totalIncome * 100).toFixed(2) + '%'
            : '0%';
          data.summary.averageOrderValue = totalOrders > 0 ? totalIncome / totalOrders : 0;
        }
        
        setQuickReport(data);
        globalCache.set(cacheKey, { data, timestamp: Date.now() });
      } else {
        const fallbackData = {
          summary: {
            totalIncome,
            totalExpenses: 0,
            totalProfit: totalIncome,
            totalOrders,
          },
          expenses: [],
          ordersBreakdown: []
        };
        setQuickReport(fallbackData);
        globalCache.set(cacheKey, { data: fallbackData, timestamp: Date.now() });
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching quick report:', error);
        setError('Failed to load report');
      }
    } finally {
      fetchingRef.current = false;
    }
  }, [dateRange, fetchAllOrders, getFilteredOrders]);

  // Fetch saved reports - with cache
  const fetchSavedReports = useCallback(async () => {
    const cacheKey = 'saved_reports';
    const cached = globalCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
      setSavedReports(cached.data);
      return;
    }

    try {
      const response = await getAllProfitLossReports();
      const reports = response?.data?.data || response?.data || [];
      setSavedReports(reports);
      globalCache.set(cacheKey, { data: reports, timestamp: Date.now() });
    } catch (error) {
      console.error('Error fetching saved reports:', error);
      setSavedReports([]);
    }
  }, []);

  // Fetch expenses - with cache
  const fetchExpenses = useCallback(async () => {
    const cacheKey = 'expenses_list';
    const cached = globalCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
      setExpensesList(cached.data);
      return;
    }

    try {
      const response = await getExpenses();
      const expenses = response?.data?.data || response?.data || [];
      setExpensesList(expenses);
      globalCache.set(cacheKey, { data: expenses, timestamp: Date.now() });
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setExpensesList([]);
    }
  }, []);

  // Load initial data - ONCE
  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        fetchAllOrders(),
        fetchExpenses(),
        fetchSavedReports()
      ]);
      
      if (activeTab === 'dashboard') {
        await fetchQuickReport();
      }
    };
    
    loadInitialData();
  }, []); // Empty deps - runs once

  // Fetch when date range changes - but debounced
  useEffect(() => {
    if (activeTab === 'dashboard' && dateRange.startDate && dateRange.endDate && ordersData.length) {
      const timeoutId = setTimeout(() => {
        fetchQuickReport();
      }, 100); // 100ms debounce
      
      return () => clearTimeout(timeoutId);
    }
  }, [dateRange, activeTab, ordersData.length, fetchQuickReport]);

  // Fetch when tab changes
  useEffect(() => {
    if (activeTab === 'reports') {
      fetchSavedReports();
    } else if (activeTab === 'expenses') {
      fetchExpenses();
    } else if (activeTab === 'dashboard' && dateRange.startDate && dateRange.endDate) {
      fetchQuickReport();
    }
  }, [activeTab, fetchSavedReports, fetchExpenses, fetchQuickReport, dateRange]);

  // Compute quick stats - PURE COMPUTATION, very fast
  const quickStats = useMemo(() => {
    if (!quickReport?.summary && !ordersData.length) return null;
    
    const { totalOrders, totalIncome } = getFilteredOrders(dateRange.startDate, dateRange.endDate);
    const totalExpenses = quickReport?.summary?.totalExpenses || 0;
    const totalProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? ((totalProfit / totalIncome) * 100).toFixed(2) : '0';
    
    return {
      totalIncome: formatCurrency(totalIncome),
      totalExpenses: formatCurrency(totalExpenses),
      totalProfit: formatCurrency(totalProfit),
      profitMargin: `${profitMargin}%`,
      totalOrders: formatNumber(totalOrders),
      avgOrderValue: totalOrders > 0 ? formatCurrency(totalIncome / totalOrders) : formatCurrency(0),
      totalExpenseItems: formatNumber(quickReport?.summary?.totalExpenseItems || 0),
    };
  }, [quickReport, ordersData, dateRange, getFilteredOrders]);

  const handleCustomDateChange = useCallback(() => {
    if (customStartDate && customEndDate && customStartDate <= customEndDate) {
      setDateRange({ startDate: customStartDate, endDate: customEndDate });
      setError(null);
    } else if (customStartDate && customEndDate) {
      setError('Start date must be before or equal to end date');
    }
  }, [customStartDate, customEndDate]);

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    if (!generateData.startDate || !generateData.endDate) {
      setError('Please select both start and end dates');
      return;
    }
    
    setLoading(true);
    try {
      await generateProfitLossReport(generateData);
      alert('Report generated successfully!');
      setGenerateData({ startDate: '', endDate: '', reportType: 'custom' });
      
      // Clear relevant caches
      globalCache.delete('saved_reports');
      await fetchSavedReports();
      setActiveTab('reports');
    } catch (error) {
      setError('Failed to generate report: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const [generateData, setGenerateData] = useState({
    startDate: '',
    endDate: '',
    reportType: 'custom',
  });

  const handleGenerateDaily = async () => {
    setLoading(true);
    try {
      await generateDailyProfitLoss();
      alert('Daily report generated successfully!');
      globalCache.delete('saved_reports');
      await fetchSavedReports();
      setActiveTab('reports');
    } catch (error) {
      setError('Failed to generate daily report: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (id) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      setLoading(true);
      try {
        await deleteProfitLossReport(id);
        alert('Report deleted successfully');
        globalCache.delete('saved_reports');
        await fetchSavedReports();
      } catch (error) {
        setError('Failed to delete report');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setShowReportModal(true);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleRefresh = useCallback(() => {
    // Clear all caches for current date range
    const cacheKey = `pl_${dateRange.startDate}_${dateRange.endDate}`;
    globalCache.delete(cacheKey);
    globalCache.delete('all_orders_data');
    globalCache.delete('saved_reports');
    globalCache.delete('expenses_list');
    
    fetchAllOrders();
    fetchQuickReport();
    if (activeTab === 'reports') fetchSavedReports();
    if (activeTab === 'expenses') fetchExpenses();
  }, [dateRange, fetchAllOrders, fetchQuickReport, fetchSavedReports, fetchExpenses, activeTab]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setError(null);
  }, []);

  // Loading indicator
  if (!ordersData.length && loading) {
    return (
      <div className="bg-gray-50 min-h-screen pb-20">
        <Greetings />
        <div className="p-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <Greetings />
      
      <div className="p-4">
        <div className="flex justify-between items-center mb-1 mt-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Profit & Loss Statement</h1>
            <p className="text-gray-500 text-sm">Track business profitability and financial performance</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 bg-white rounded-xl p-2 shadow-sm">
          <TabButton tab="dashboard" label="Dashboard" icon={FaChartLine} isActive={activeTab === 'dashboard'} onClick={handleTabChange} />
          <TabButton tab="generate" label="Generate Report" icon={FaDownload} isActive={activeTab === 'generate'} onClick={handleTabChange} />
          <TabButton tab="reports" label="Saved Reports" icon={FaFileAlt} isActive={activeTab === 'reports'} onClick={handleTabChange} />
          <TabButton tab="expenses" label="Expenses List" icon={FaBox} isActive={activeTab === 'expenses'} onClick={handleTabChange} />
        </div>

        {activeTab === 'dashboard' && (
          <div>
            <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                <FaCalendar className="text-blue-500 text-lg" />
                <h3 className="font-semibold text-gray-800">Select Reporting Period</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                {datePeriods.map(period => (
                  <DatePeriodButton
                    key={period.value}
                    label={period.label}
                    icon={period.icon}
                    description={period.description}
                    isActive={datePeriod === period.value}
                    onClick={() => setDatePeriod(period.value)}
                  />
                ))}
              </div>
              
              {showCustomPicker && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Custom Date Range</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleCustomDateChange}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    Apply Range
                  </button>
                  {customStartDate && customEndDate && (
                    <div className="mt-3 text-sm text-gray-600">
                      Selected: {formatShortDate(customStartDate)} - {formatShortDate(customEndDate)}
                    </div>
                  )}
                </div>
              )}
              
              {dateRange.startDate && dateRange.endDate && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-600 font-medium">REPORTING PERIOD</p>
                      <p className="text-sm font-semibold text-blue-800">
                        {formatDate(dateRange.startDate)} — {formatDate(dateRange.endDate)}
                      </p>
                    </div>
                    <button onClick={handleRefresh} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition">
                      <FaSync className="inline mr-1" /> Refresh
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error ? (
              <div className="text-center py-12 bg-white rounded-xl">
                <FaExclamationTriangle className="text-5xl text-red-300 mx-auto mb-3" />
                <p className="text-red-500">{error}</p>
                <button onClick={handleRefresh} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Retry</button>
              </div>
            ) : quickStats ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-xl shadow-sm p-4 border-b-4 border-green-500 transition hover:shadow-md">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm text-gray-500">Total Income</p>
                      <FaDollarSign className="text-green-500" />
                    </div>
                    <p className="text-2xl font-bold text-green-600">{quickStats.totalIncome}</p>
                    <p className="text-xs text-gray-400 mt-1">from completed orders</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-4 border-b-4 border-red-500 transition hover:shadow-md">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm text-gray-500">Total Expenses</p>
                      <FaBox className="text-red-500" />
                    </div>
                    <p className="text-2xl font-bold text-red-600">{quickStats.totalExpenses}</p>
                    <p className="text-xs text-gray-400 mt-1">All purchased expenses</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-4 border-b-4 border-blue-500 transition hover:shadow-md">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm text-gray-500">Net Profit</p>
                      <FaChartLine className="text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{quickStats.totalProfit}</p>
                    <p className="text-xs text-gray-400 mt-1">Income - All Expenses</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  <StatCard title="Profit Margin" value={quickStats.profitMargin} color="#10B981" icon={FaChartLine} />
                  <StatCard title="Total Orders" value={quickStats.totalOrders} color="#3B82F6" icon={FaFileAlt} />
                  <StatCard title="Avg Order Value" value={quickStats.avgOrderValue} color="#8B5CF6" icon={FaDollarSign} />
                  <StatCard title="Expense Items" value={quickStats.totalExpenseItems} color="#F59E0B" icon={FaBox} />
                </div>
              </>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl">
                <FaChartLine className="text-5xl text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Select a date range to view report</p>
                <p className="text-gray-400 text-sm mt-1">The report shows income minus all purchased expenses</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'generate' && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <form onSubmit={handleGenerateReport}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date *</label>
                  <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
                    <FaCalendar className="text-gray-400" />
                    <input
                      type="date"
                      required
                      value={generateData.startDate}
                      onChange={(e) => setGenerateData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="flex-1 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date *</label>
                  <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
                    <FaCalendar className="text-gray-400" />
                    <input
                      type="date"
                      required
                      value={generateData.endDate}
                      onChange={(e) => setGenerateData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="flex-1 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Report Type</label>
                  <select
                    value={generateData.reportType}
                    onChange={(e) => setGenerateData(prev => ({ ...prev, reportType: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 outline-none"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium transition"
                >
                  {loading ? <FaSpinner className="animate-spin" /> : <FaDownload />}
                  {loading ? 'Generating...' : 'Generate Profit & Loss Report'}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-4 border-t">
              <h3 className="font-semibold mb-3">Quick Actions</h3>
              <button
                onClick={handleGenerateDaily}
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50 font-medium transition"
              >
                {loading ? <FaSpinner className="animate-spin" /> : <FaFileAlt />}
                Generate Today's Report
              </button>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Generated Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Income</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expenses</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Orders</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margin</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {savedReports.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                        <FaFileAlt className="text-4xl text-gray-300 mx-auto mb-2" />
                        No saved reports yet. Generate one first.
                       </td>
                     </tr>
                  ) : (
                    savedReports.map((report) => (
                      <tr key={report._id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm">{formatDate(report.createdAt)}</td>
                        <td className="px-4 py-3 text-sm">
                          {formatShortDate(report.startDate)} - {formatShortDate(report.endDate)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 capitalize">{report.reportType}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-green-600">{formatCurrency(report.totalIncome)}</td>
                        <td className="px-4 py-3 text-right text-sm text-red-600">{formatCurrency(report.totalExpenses)}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-blue-600">{formatCurrency(report.totalProfit)}</td>
                        <td className="px-4 py-3 text-right text-sm">{formatNumber(report.totalOrders)}</td>
                        <td className="px-4 py-3 text-right text-sm">{report.profitMargin?.toFixed(2)}%</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleViewReport(report)} className="text-blue-600 hover:text-blue-800 p-1 transition" title="View Details">
                              <FaEye />
                            </button>
                            <button onClick={() => handleDeleteReport(report._id)} className="text-red-600 hover:text-red-800 p-1 transition" title="Delete">
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h2 className="font-semibold">📦 All Purchased Expenses</h2>
              <p className="text-xs text-gray-500 mt-1">Note: All purchased expenses are deducted from income</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date Purchased</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {expensesList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500">No expenses found</td>
                    </tr>
                  ) : (
                    expensesList.map((expense) => (
                      <tr key={expense._id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-2 font-medium text-sm">{expense.itemName}</td>
                        <td className="px-4 py-2 text-sm">{expense.category}</td>
                        <td className="px-4 py-2 text-right text-sm">{expense.quantity} {expense.unit}</td>
                        <td className="px-4 py-2 text-right text-sm">{formatCurrency(expense.unitPrice)}</td>
                        <td className="px-4 py-2 text-right text-sm text-red-600">{formatCurrency(expense.totalCost)}</td>
                        <td className="px-4 py-2 text-left text-sm text-gray-500">{formatDate(expense.datePurchased)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="4" className="px-4 py-2 text-right font-semibold">TOTAL EXPENSES:</td>
                    <td className="px-4 py-2 text-right font-bold text-red-600">
                      {formatCurrency(expensesList.reduce((sum, exp) => sum + (exp.totalCost || 0), 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {showReportModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowReportModal(false)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Profit & Loss Report</h2>
              <div className="flex gap-2">
                <button onClick={handlePrintReport} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
                  <FaPrint />
                </button>
                <button onClick={() => setShowReportModal(false)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold">Delish POS</h3>
                <p className="text-gray-500">Profit & Loss Report</p>
                <p className="text-sm text-gray-400">
                  Period: {formatDate(selectedReport.startDate)} - {formatDate(selectedReport.endDate)}
                </p>
                <p className="text-xs text-gray-400">Generated: {formatDate(selectedReport.generatedAt)}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-gray-500">Total Income</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(selectedReport.totalIncome)}</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-xs text-gray-500">Total Expenses</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(selectedReport.totalExpenses)}</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-500">Net Profit</p>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(selectedReport.totalProfit)}</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-gray-500">Profit Margin</p>
                  <p className="text-lg font-bold text-purple-600">{selectedReport.profitMargin?.toFixed(2)}%</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-xs text-gray-500">Total Orders</p>
                  <p className="text-lg font-bold text-orange-600">{formatNumber(selectedReport.totalOrders)}</p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold mb-2">📊 Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span>Average Order Value:</span>
                    <span className="font-medium">{formatCurrency(selectedReport.averageOrderValue)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span>Total Expense Items:</span>
                    <span className="font-medium">{formatNumber(selectedReport.totalExpenseItems)}</span>
                  </div>
                </div>
              </div>

              {selectedReport.expensesBreakdown?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">📦 Expenses Breakdown</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Item</th>
                          <th className="px-3 py-2 text-left">Category</th>
                          <th className="px-3 py-2 text-right">Quantity</th>
                          <th className="px-3 py-2 text-right">Unit Price</th>
                          <th className="px-3 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReport.expensesBreakdown.map((exp, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="px-3 py-2">{exp.itemName}</td>
                            <td className="px-3 py-2">{exp.category}</td>
                            <td className="px-3 py-2 text-right">{exp.quantity} {exp.unit}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(exp.unitPrice)}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(exp.totalCost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default ProfitLoss;