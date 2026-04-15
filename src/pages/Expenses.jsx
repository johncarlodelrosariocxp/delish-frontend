// Expenses.jsx
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import BottomNav from '../components/shared/BottomNav';
import {
  getExpenses,
  addExpense,
  deleteExpense,
  getInventoryValue,
} from '../https';
import { FaPlus, FaTrash, FaFilter, FaCalendar, FaBox, FaDollarSign, FaChartLine, FaSpinner } from 'react-icons/fa';

// Constants
const CACHE_KEY = 'pos_expenses_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

// Helper functions
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Date helper functions
const getDateRange = (period) => {
  const today = new Date();
  const start = new Date();
  const end = new Date();
  
  switch(period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'weekly':
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(today.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yearly':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      // weekly default
      const weekDay = today.getDay();
      const weekDiff = today.getDate() - weekDay + (weekDay === 0 ? -6 : 1);
      start.setDate(weekDiff);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
  }
  
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
};

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [inventoryValue, setInventoryValue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [datePeriod, setDatePeriod] = useState('weekly'); // Default to weekly
  const [filters, setFilters] = useState({ startDate: '', endDate: '', category: '' });
  const [formData, setFormData] = useState({
    itemName: '',
    description: '',
    category: 'Ingredients',
    quantity: '',
    unit: 'pcs',
    unitPrice: '',
    supplier: '',
    datePurchased: new Date().toISOString().split('T')[0],
    receiptNumber: '',
    notes: '',
  });

  const categories = ['Ingredients', 'Supplies', 'Equipment', 'Utilities', 'Other'];
  const units = ['pcs', 'kg', 'g', 'L', 'ml', 'box', 'pack', 'sack', 'bottle'];
  const datePeriods = [
    { value: 'today', label: 'Today', icon: '📅' },
    { value: 'weekly', label: 'This Week', icon: '📆' },
    { value: 'monthly', label: 'This Month', icon: '📊' },
    { value: 'yearly', label: 'This Year', icon: '🎯' }
  ];

  // Update date range when period changes
  useEffect(() => {
    const range = getDateRange(datePeriod);
    setFilters(prev => ({ ...prev, startDate: range.startDate, endDate: range.endDate }));
  }, [datePeriod]);

  // Memoized total cost calculation
  const totalCost = useMemo(() => {
    const qty = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.unitPrice) || 0;
    return (qty * price).toFixed(2);
  }, [formData.quantity, formData.unitPrice]);

  // Memoized filtered expenses
  const filteredExpenses = useMemo(() => {
    if (!expenses.length) return [];
    let result = expenses;
    
    if (filters.startDate) {
      result = result.filter(e => e.datePurchased >= filters.startDate);
    }
    if (filters.endDate) {
      result = result.filter(e => e.datePurchased <= filters.endDate);
    }
    if (filters.category) {
      result = result.filter(e => e.category === filters.category);
    }
    
    return result;
  }, [expenses, filters]);

  // Fetch expenses with caching
  const fetchExpenses = useCallback(async () => {
    // Check cache first
    const cacheKey = `${CACHE_KEY}_${filters.startDate}_${filters.endDate}_${filters.category}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_EXPIRY) {
        setExpenses(data.expenses || []);
        setSummary(data.summary);
        return;
      }
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await getExpenses(filters);
      const expensesData = response.data.data || [];
      const summaryData = response.data.summary;
      
      setExpenses(expensesData);
      setSummary(summaryData);
      
      // Cache data
      localStorage.setItem(cacheKey, JSON.stringify({
        data: { expenses: expensesData, summary: summaryData },
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setError(error.response?.data?.message || error.message || 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchInventoryValue = useCallback(async () => {
    try {
      const response = await getInventoryValue();
      setInventoryValue(response.data.data);
    } catch (error) {
      console.error('Error fetching inventory value:', error);
    }
  }, []);

  // Debounced filter changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchExpenses();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [fetchExpenses]);

  useEffect(() => {
    fetchInventoryValue();
  }, [fetchInventoryValue]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Validate
    if (!formData.itemName.trim()) {
      setError('Item name is required');
      return;
    }
    if (!formData.quantity || formData.quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }
    if (!formData.unitPrice || formData.unitPrice <= 0) {
      setError('Unit price must be greater than 0');
      return;
    }

    const expenseData = {
      itemName: formData.itemName.trim(),
      description: formData.description || '',
      category: formData.category,
      quantity: Number(formData.quantity),
      unit: formData.unit,
      unitPrice: Number(formData.unitPrice),
      supplier: formData.supplier || '',
      datePurchased: formData.datePurchased,
      receiptNumber: formData.receiptNumber || '',
      notes: formData.notes || '',
    };

    try {
      await addExpense(expenseData);
      setSuccess('Expense added successfully!');
      
      setFormData({
        itemName: '',
        description: '',
        category: 'Ingredients',
        quantity: '',
        unit: 'pcs',
        unitPrice: '',
        supplier: '',
        datePurchased: new Date().toISOString().split('T')[0],
        receiptNumber: '',
        notes: '',
      });
      
      setShowForm(false);
      
      // Clear cache and refresh
      const cacheKey = `${CACHE_KEY}_${filters.startDate}_${filters.endDate}_${filters.category}`;
      localStorage.removeItem(cacheKey);
      await fetchExpenses();
      await fetchInventoryValue();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error adding expense:', error);
      setError(error.response?.data?.message || 'Failed to add expense');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this expense?')) {
      try {
        await deleteExpense(id);
        setSuccess('Expense deleted');
        const cacheKey = `${CACHE_KEY}_${filters.startDate}_${filters.endDate}_${filters.category}`;
        localStorage.removeItem(cacheKey);
        await fetchExpenses();
        await fetchInventoryValue();
        setTimeout(() => setSuccess(null), 3000);
      } catch (error) {
        setError('Failed to delete expense');
      }
    }
  };

  // Quick stats component
  const StatCard = ({ title, value, icon: Icon, color, bgColor }) => (
    <div className={`${bgColor} rounded-xl shadow-sm p-4`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-600">{title}</p>
        <Icon className={`${color} text-lg`} />
      </div>
      <p className="text-xl font-bold text-gray-800">{value}</p>
    </div>
  );

  // Date Period Button Component
  const DatePeriodButton = ({ period, label, icon, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
        isActive 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Expenses</h1>
            <p className="text-gray-500 text-sm">Track purchases and inventory</p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setError(null);
              setSuccess(null);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <FaPlus size={14} />
            {showForm ? 'Cancel' : 'Add'}
          </button>
        </div>

        {/* Messages */}
        {(success || error) && (
          <div className={`mb-4 p-3 rounded-lg ${success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {success || error}
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard title="Total Purchased" value={formatCurrency(summary.totalPurchased)} icon={FaDollarSign} color="text-blue-500" bgColor="bg-white" />
            <StatCard title="Remaining Value" value={formatCurrency(summary.totalRemaining)} icon={FaBox} color="text-green-500" bgColor="bg-white" />
            {inventoryValue && (
              <StatCard title="Inventory Value" value={formatCurrency(inventoryValue.totalInventoryValue)} icon={FaBox} color="text-purple-500" bgColor="bg-white" />
            )}
          </div>
        )}

        {/* Date Period Selector */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <FaCalendar className="text-gray-500" />
            <span className="font-medium">Date Range</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {datePeriods.map(period => (
              <DatePeriodButton
                key={period.value}
                period={period.value}
                label={period.label}
                icon={period.icon}
                isActive={datePeriod === period.value}
                onClick={() => setDatePeriod(period.value)}
              />
            ))}
          </div>
          {filters.startDate && filters.endDate && (
            <p className="text-xs text-gray-500 mt-3">
              Showing: {new Date(filters.startDate).toLocaleDateString()} - {new Date(filters.endDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Filters - Category only */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FaFilter className="text-gray-500" />
            <span className="font-medium">Category Filter</span>
          </div>
          <div className="grid grid-cols-1">
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>

        {/* Add Expense Form - Conditionally Rendered */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
            <h2 className="text-lg font-semibold mb-4">Add Item</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  required
                  placeholder="Item Name *"
                  value={formData.itemName}
                  onChange={(e) => setFormData(prev => ({ ...prev, itemName: e.target.value }))}
                  className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder="Quantity *"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {units.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                </select>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder="Unit Price *"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, unitPrice: e.target.value }))}
                  className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={`Total: ${formatCurrency(totalCost)}`}
                    className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-700"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                  className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={formData.datePurchased}
                  onChange={(e) => setFormData(prev => ({ ...prev, datePurchased: e.target.value }))}
                  className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="md:col-span-2">
                  <textarea
                    placeholder="Description (optional)"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Expenses Table - Optimized with Date Column */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Purchased</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Used</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading && !expenses.length ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-8 text-center">
                      <FaSpinner className="animate-spin mx-auto text-gray-400 text-2xl" />
                    </td>
                  </tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-8 text-center text-gray-500">No expenses found</td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => (
                    <tr key={expense._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{expense.itemName}</div>
                        {expense.description && <div className="text-xs text-gray-500">{expense.description}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100">{expense.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <FaCalendar className="text-gray-400 text-xs" />
                          <span>{formatDate(expense.datePurchased)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">{expense.quantity} {expense.unit}</td>
                      <td className="px-4 py-3 text-right">{expense.usedQuantity || 0} {expense.unit}</td>
                      <td className="px-4 py-3 text-right font-medium">{expense.remainingQuantity} {expense.unit}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(expense.unitPrice)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(expense.totalCost)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDelete(expense._id)} className="text-red-600 hover:text-red-800">
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Expenses;