import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import { 
  FaSearch, 
  FaCalendar, 
  FaHome, 
  FaTimes, 
  FaChevronDown,
  FaSpinner,
  FaSync 
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { getOrders } from "../https";
import BottomNav from "../components/shared/BottomNav";
import BackButton from "../components/shared/BackButton";
import Invoice from "../components/invoice/Invoice";
import OrderCard from "../components/orders/OrderCard";

const CACHE_KEY = "pos_orders_cache";
const CACHE_EXPIRY = 60 * 60 * 1000; // 60 minutes
const MAX_CACHE_ITEMS = 50; // Limit number of orders to cache
const MAX_ORDER_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days - remove old orders

// Helper function to safely set localStorage with error handling
const safeSetLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      console.warn('LocalStorage quota exceeded. Clearing old cache...');
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (storageKey && (storageKey.includes('pos_') || storageKey.includes('cache'))) {
          keysToRemove.push(storageKey);
        }
      }
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (removeError) {
          console.error('Failed to remove item:', key);
        }
      });
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        console.error('Still failed to set localStorage after clearing:', retryError);
        return false;
      }
    } else {
      console.error('Failed to save to localStorage:', e);
      return false;
    }
  }
};

const getOptimizedCacheData = (orders) => {
  if (!orders || orders.length === 0) return null;
  const sortedOrders = [...orders]
    .sort((a, b) => {
      const dateA = a.parsedDate || new Date(a.createdAt || 0);
      const dateB = b.parsedDate || new Date(b.createdAt || 0);
      return dateB - dateA;
    })
    .slice(0, MAX_CACHE_ITEMS);
  const now = Date.now();
  const recentOrders = sortedOrders.filter(order => {
    const orderDate = order.parsedDate || new Date(order.createdAt || 0);
    return now - orderDate.getTime() < MAX_ORDER_AGE;
  });
  return recentOrders.map(o => ({
    _id: o._id,
    orderStatus: o.orderStatus,
    totalAmount: o.totalAmount,
    bills: o.bills ? { totalWithTax: o.bills.totalWithTax } : undefined,
    customerDetails: o.customerDetails ? { name: o.customerDetails.name } : undefined,
    createdAt: o.createdAt,
    orderDate: o.orderDate,
    items: o.items ? o.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price
    })).slice(0, 5) : [],
    table: o.table ? { tableNo: o.table.tableNo } : undefined,
    parsedDate: o.parsedDate instanceof Date ? o.parsedDate.toISOString() : o.parsedDate
  }));
};

const Orders = () => {
  const [orders, setOrders] = useState(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data } = JSON.parse(cached);
        if (data && Array.isArray(data) && data.length > 0) {
          console.log("Loading orders from cache:", data.length);
          return data.map(order => ({
            ...order,
            parsedDate: order.parsedDate ? new Date(order.parsedDate) : new Date()
          }));
        }
      } catch (e) {
        console.error("Failed to parse cached orders:", e);
        localStorage.removeItem(CACHE_KEY);
      }
    }
    return [];
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [dateFilter, setDateFilter] = useState(() => {
    return localStorage.getItem("pos_date_filter") || "today";
  });
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    return localStorage.getItem("pos_start_date") || "";
  });
  const [endDate, setEndDate] = useState(() => {
    return localStorage.getItem("pos_end_date") || "";
  });
  const [lastFetchTime, setLastFetchTime] = useState(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { timestamp } = JSON.parse(cached);
        return timestamp;
      } catch (e) {
        return 0;
      }
    }
    return 0;
  });
  const [wsConnected, setWsConnected] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [autoRefreshing, setAutoRefreshing] = useState(false);

  const user = useSelector((state) => state.user);
  const navigate = useNavigate();
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const initialFetchDone = useRef(false);
  const saveTimeoutRef = useRef(null);
  const refreshTimeoutRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const refreshButtonRef = useRef(null);

  // Save orders to localStorage
  useEffect(() => {
    if (orders && orders.length > 0) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        console.log("Saving orders to cache:", orders.length);
        const optimizedData = getOptimizedCacheData(orders);
        if (optimizedData && optimizedData.length > 0) {
          const cacheData = {
            data: optimizedData,
            timestamp: Date.now()
          };
          const success = safeSetLocalStorage(CACHE_KEY, JSON.stringify(cacheData));
          if (success) {
            setLastFetchTime(Date.now());
          }
        }
      }, 2000);
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [orders]);

  // Save filter states
  useEffect(() => {
    safeSetLocalStorage("pos_date_filter", dateFilter);
  }, [dateFilter]);
  useEffect(() => {
    safeSetLocalStorage("pos_start_date", startDate);
  }, [startDate]);
  useEffect(() => {
    safeSetLocalStorage("pos_end_date", endDate);
  }, [endDate]);

  // Animate refresh button on auto-refresh
  useEffect(() => {
    if (autoRefreshing && refreshButtonRef.current) {
      refreshButtonRef.current.classList.add('animate-pulse', 'bg-blue-100');
      const timer = setTimeout(() => {
        if (refreshButtonRef.current) {
          refreshButtonRef.current.classList.remove('animate-pulse', 'bg-blue-100');
        }
        setAutoRefreshing(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [refreshTrigger, autoRefreshing]);

  // MAIN AUTO REFRESH FUNCTION
  const autoRefreshOrders = useCallback(async (source = "unknown") => {
    console.log(`🔄 AUTO REFRESH [${source}]: Fetching latest orders...`);
    
    setAutoRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    
    try {
      const response = await getOrders();
      let ordersData = [];
      if (response?.data?.data) {
        ordersData = response.data.data;
      } else if (Array.isArray(response?.data)) {
        ordersData = response.data;
      } else if (Array.isArray(response)) {
        ordersData = response;
      }

      console.log(`✅ AUTO REFRESH [${source}]: Fetched`, ordersData.length, "orders");

      const processedOrders = ordersData.map(order => {
        const dateString = order.createdAt || order.orderDate || order.date;
        let parsedDate = new Date();
        if (dateString) {
          parsedDate = new Date(dateString);
        }
        return {
          ...order,
          _id: order._id || order.id,
          parsedDate: parsedDate
        };
      });

      // Check if we have new orders
      const existingIds = new Set(orders.map(o => o._id));
      const newOrders = processedOrders.filter(o => !existingIds.has(o._id));
      
      if (newOrders.length > 0) {
        console.log(`🎉 AUTO REFRESH [${source}]: ${newOrders.length} new orders found!`);
        
        // Show notification for new orders
        if (Notification.permission === 'granted') {
          newOrders.forEach(order => {
            new Notification('New Order Received!', {
              body: `Order #${order._id.slice(-6)} - ₱${order.bills?.totalWithTax || order.totalAmount || 0}`,
              icon: '/favicon.ico'
            });
          });
        }
        
        // Force refresh button to pulse
        setRefreshTrigger(prev => prev + 1);
      }

      setOrders(processedOrders);
      setError(null);
      
      // Force a re-render by updating a timestamp
      setLastFetchTime(Date.now());
      
    } catch (err) {
      console.error(`❌ AUTO REFRESH [${source}]: Failed:`, err);
      setError("Failed to refresh orders");
    } finally {
      setTimeout(() => {
        setAutoRefreshing(false);
      }, 1000);
    }
  }, [orders]);

  // WebSocket Connection for real-time updates
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        // Use secure WebSocket if on HTTPS
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/orders`;
        
        wsRef.current = new WebSocket(wsUrl);
        
        wsRef.current.onopen = () => {
          console.log("✅ WebSocket Connected");
          setWsConnected(true);
          // Send subscription message
          wsRef.current.send(JSON.stringify({
            type: 'subscribe',
            channel: 'orders'
          }));
        };
        
        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("📢 WebSocket Message:", data);
            
            // Auto refresh on any order-related message
            if (data.type === 'order_created' || 
                data.type === 'order_updated' || 
                data.type === 'order_paid' ||
                data.type === 'order_status_changed' ||
                data.channel === 'orders') {
              
              console.log("🔥 New order event via WebSocket!");
              
              // Set a flag in localStorage for cross-tab sync
              localStorage.setItem('pos_new_order_timestamp', Date.now().toString());
              localStorage.setItem('pos_new_order_data', JSON.stringify(data));
              
              // Trigger auto refresh
              autoRefreshOrders("websocket");
              
              // Force refresh button animation
              setRefreshTrigger(prev => prev + 1);
              setAutoRefreshing(true);
            }
          } catch (e) {
            console.error("Failed to parse WebSocket message:", e);
          }
        };
        
        wsRef.current.onclose = () => {
          console.log("❌ WebSocket Disconnected");
          setWsConnected(false);
          
          // Attempt to reconnect after 3 seconds
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("🔄 Attempting WebSocket reconnection...");
            connectWebSocket();
          }, 3000);
        };
        
        wsRef.current.onerror = (error) => {
          console.error("WebSocket Error:", error);
          setWsConnected(false);
        };
      } catch (e) {
        console.error("Failed to create WebSocket:", e);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [autoRefreshOrders]);

  // SSE (Server-Sent Events) fallback
  useEffect(() => {
    let eventSource;
    
    try {
      eventSource = new EventSource('/api/orders/events');
      
      eventSource.onmessage = (event) => {
        console.log("📢 SSE Event:", event.data);
        
        // Set flag for new order
        localStorage.setItem('pos_new_order_sse', Date.now().toString());
        
        // Trigger refresh with animation
        setRefreshTrigger(prev => prev + 1);
        setAutoRefreshing(true);
        autoRefreshOrders("sse");
      };
      
      eventSource.addEventListener('order_created', (event) => {
        console.log("🔥 Order created via SSE");
        
        // Parse order data if available
        try {
          const orderData = JSON.parse(event.data);
          localStorage.setItem('pos_new_order_data', JSON.stringify(orderData));
        } catch (e) {}
        
        setRefreshTrigger(prev => prev + 1);
        setAutoRefreshing(true);
        autoRefreshOrders("sse_order_created");
      });
      
      eventSource.addEventListener('order_updated', () => {
        console.log("🔥 Order updated via SSE");
        setRefreshTrigger(prev => prev + 1);
        setAutoRefreshing(true);
        autoRefreshOrders("sse_order_updated");
      });
      
      eventSource.onerror = (error) => {
        console.error("SSE Error:", error);
        eventSource.close();
      };
    } catch (e) {
      console.error("Failed to create EventSource:", e);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [autoRefreshOrders]);

  // Manual fetch function
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("📥 Manual fetch: Getting orders...");
      const response = await getOrders();
      let ordersData = [];
      if (response?.data?.data) {
        ordersData = response.data.data;
      } else if (Array.isArray(response?.data)) {
        ordersData = response.data;
      } else if (Array.isArray(response)) {
        ordersData = response;
      }
      console.log("✅ Manual fetch: Got", ordersData.length, "orders");
      
      const processedOrders = ordersData.map(order => {
        const dateString = order.createdAt || order.orderDate || order.date;
        let parsedDate = new Date();
        if (dateString) {
          parsedDate = new Date(dateString);
        }
        return {
          ...order,
          _id: order._id || order.id,
          parsedDate: parsedDate
        };
      });
      
      setOrders(processedOrders);
      setLastFetchTime(Date.now());
    } catch (err) {
      console.error("❌ Manual fetch failed:", err);
      setError("Failed to load orders. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (orders.length > 0) {
      console.log("Using cached orders:", orders.length);
      initialFetchDone.current = true;
      return;
    }
    if (!initialFetchDone.current) {
      console.log("No cached orders, fetching...");
      initialFetchDone.current = true;
      fetchOrders();
    }
  }, [fetchOrders, orders.length]);

  // POLLING - Check every 5 seconds (AGGRESSIVE)
  useEffect(() => {
    console.log("🚀 Starting aggressive polling...");
    const pollInterval = setInterval(() => {
      console.log("🔄 Polling: Checking for new orders...");
      
      // Only auto-refresh if not already refreshing
      if (!autoRefreshing) {
        autoRefreshOrders("polling");
      }
    }, 3000); // 3 seconds
    
    return () => clearInterval(pollInterval);
  }, [autoRefreshOrders, autoRefreshing]);

  // Listen for localStorage changes (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'pos_new_order_timestamp' || 
          e.key === 'pos_new_order_data' ||
          e.key === 'pos_new_order_sse') {
        
        console.log(`📢 New order detected from another tab!`);
        
        // Trigger refresh with animation
        setRefreshTrigger(prev => prev + 1);
        setAutoRefreshing(true);
        autoRefreshOrders("cross_tab");
        
        // Clear the flag after 1 second
        setTimeout(() => {
          localStorage.removeItem(e.key);
        }, 1000);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [autoRefreshOrders]);

  // Custom event listener for order creation
  useEffect(() => {
    const handleOrderCreated = (event) => {
      console.log("🎯 Order created event received:", event.detail);
      
      // Force refresh button animation
      setRefreshTrigger(prev => prev + 1);
      setAutoRefreshing(true);
      
      // Trigger auto refresh
      autoRefreshOrders("custom_event");
      
      // Show notification
      if (event.detail?.order && Notification.permission === 'granted') {
        const order = event.detail.order;
        new Notification('New Order!', {
          body: `Order #${order._id?.slice(-6) || ''} - ₱${order.bills?.totalWithTax || order.totalAmount || 0}`,
          icon: '/favicon.ico'
        });
      }
    };
    
    window.addEventListener('order:created', handleOrderCreated);
    window.addEventListener('pos:orderCreated', handleOrderCreated);
    window.addEventListener('newOrder', handleOrderCreated);
    
    return () => {
      window.removeEventListener('order:created', handleOrderCreated);
      window.removeEventListener('pos:orderCreated', handleOrderCreated);
      window.removeEventListener('newOrder', handleOrderCreated);
    };
  }, [autoRefreshOrders]);

  // Event Listeners - Multiple events
  useEffect(() => {
    const handleAnyOrderEvent = (event) => {
      console.log("📢 ORDER EVENT DETECTED:", event.type, event.detail);
      
      // Clear any pending refresh
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      // Trigger refresh button animation
      setRefreshTrigger(prev => prev + 1);
      setAutoRefreshing(true);
      
      // Immediate refresh
      autoRefreshOrders(`event_${event.type}`);
      
      // Also update local state if order data is included
      if (event.detail?.order) {
        setOrders(prevOrders => {
          const existingIndex = prevOrders.findIndex(o => o._id === event.detail.order._id);
          const newOrder = {
            ...event.detail.order,
            parsedDate: new Date(event.detail.order.createdAt || event.detail.order.orderDate || event.detail.order.date || Date.now())
          };
          
          if (existingIndex >= 0) {
            const updated = [...prevOrders];
            updated[existingIndex] = newOrder;
            return updated;
          } else {
            return [newOrder, ...prevOrders].slice(0, MAX_CACHE_ITEMS * 2);
          }
        });
      }
    };

    // Add all possible event listeners
    const events = [
      'orderUpdate', 'orderCreated', 'orderUpdated', 'orderPaid',
      'orderStatusChanged', 'newOrder', 'orderAdded', 'orderCompleted',
      'orderCancelled', 'orderRefunded', 'paymentReceived'
    ];
    
    events.forEach(eventType => {
      window.addEventListener(eventType, handleAnyOrderEvent);
    });

    // Also listen for custom events with different naming
    window.addEventListener('order:created', handleAnyOrderEvent);
    window.addEventListener('order:updated', handleAnyOrderEvent);
    window.addEventListener('order:paid', handleAnyOrderEvent);
    window.addEventListener('pos:orderCreated', handleAnyOrderEvent);
    window.addEventListener('pos:orderUpdated', handleAnyOrderEvent);

    return () => {
      events.forEach(eventType => {
        window.removeEventListener(eventType, handleAnyOrderEvent);
      });
      window.removeEventListener('order:created', handleAnyOrderEvent);
      window.removeEventListener('order:updated', handleAnyOrderEvent);
      window.removeEventListener('order:paid', handleAnyOrderEvent);
      window.removeEventListener('pos:orderCreated', handleAnyOrderEvent);
      window.removeEventListener('pos:orderUpdated', handleAnyOrderEvent);
    };
  }, [autoRefreshOrders]);

  // Set a flag when component mounts to signal we're ready for updates
  useEffect(() => {
    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Set a ready flag
    localStorage.setItem('pos_orders_page_ready', 'true');
    
    // Simulate a new order every 30 seconds for testing (remove in production)
    const testInterval = setInterval(() => {
      if (process.env.NODE_ENV === 'development') {
        console.log("🧪 Dev mode: Simulating new order...");
        setRefreshTrigger(prev => prev + 1);
        setAutoRefreshing(true);
      }
    }, 30000);  
    
    return () => {
      localStorage.removeItem('pos_orders_page_ready');
      clearInterval(testInterval);
    };
  }, []);

  // Clear old cache
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > CACHE_EXPIRY * 2) {
          localStorage.removeItem(CACHE_KEY);
          console.log("Cleared old cache");
        }
      }
    } catch (e) {
      console.error("Failed to clear old cache:", e);
    }
  }, []);

  // Date filter functions
  const getDateRange = (filterType) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    switch (filterType) {
      case "today":
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return { start: yesterday, end: today };
      case "this week":
        return { start: startOfWeek, end: new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000) };
      case "last week":
        return { start: startOfLastWeek, end: new Date(startOfLastWeek.getTime() + 7 * 24 * 60 * 60 * 1000) };
      case "this month":
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return { start: startOfMonth, end: endOfMonth };
      case "last month":
        return { start: startOfLastMonth, end: endOfLastMonth };
      case "custom":
        if (startDate && endDate) {
          const customStart = new Date(startDate);
          const customEnd = new Date(endDate);
          customEnd.setHours(23, 59, 59, 999);
          return { start: customStart, end: customEnd };
        }
        return { start: null, end: null };
      default:
        return { start: null, end: null };
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (dateFilter !== "all") {
      const { start, end } = getDateRange(dateFilter);
      if (start && end && order.parsedDate) {
        const orderDate = order.parsedDate;
        if (orderDate < start || orderDate > end) {
          return false;
        }
      }
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const orderId = order._id || "";
      const customerName = order.customerDetails?.name || order.customerName || "";
      const orderStatus = order.orderStatus || "";
      return (
        orderId.toLowerCase().includes(query) ||
        customerName.toLowerCase().includes(query) ||
        orderStatus.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Calculate totals
  const totalSales = filteredOrders
    .filter(order => order.orderStatus?.toLowerCase() !== "cancelled")
    .reduce((sum, order) => {
      const amount = order?.bills?.totalWithTax || order?.totalAmount || 0;
      return sum + (Number(amount) || 0);
    }, 0);

  const activeOrdersCount = filteredOrders.filter(
    order => order.orderStatus?.toLowerCase() !== "cancelled"
  ).length;

  const completedOrdersCount = filteredOrders.filter(
    order => order.orderStatus?.toLowerCase() === "completed"
  ).length;

  // Handle order status change
  const handleStatusChange = async (order, newStatus) => {
    if (!order?._id) return;
    setUpdatingOrderId(order._id);
    try {
      setOrders(prevOrders => 
        prevOrders.map(o =>
          o._id === order._id ? { ...o, orderStatus: newStatus } : o
        )
      );
    } catch (err) {
      console.error("Failed to update order status:", err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Handle order deletion
  const handleDeleteOrder = async (orderId) => {
    if (!orderId) return;
    setDeletingOrderId(orderId);
    try {
      setOrders(prevOrders => 
        prevOrders.filter(o => o._id !== orderId)
      );
    } catch (err) {
      console.error("Failed to delete order:", err);
    } finally {
      setDeletingOrderId(null);
    }
  };

  // Handle view receipt
  const handleViewReceipt = (order) => {
    setSelectedOrder(order);
    setShowInvoice(true);
  };

  const goToHome = () => {
    navigate("/");
  };

  const handleCustomDateApply = () => {
    if (startDate && endDate) {
      setDateFilter("custom");
      setShowCalendar(false);
    }
  };

  const handleCustomDateClear = () => {
    setStartDate("");
    setEndDate("");
    setDateFilter("today");
  };

  const dateFilterOptions = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "this week", label: "This Week" },
    { value: "last week", label: "Last Week" },
    { value: "this month", label: "This Month" },
    { value: "last month", label: "Last Month" },
    { value: "custom", label: "Custom Date Range" },
    { value: "all", label: "All Time" }
  ];

  const getDateFilterLabel = () => {
    if (dateFilter === "custom" && startDate && endDate) {
      const start = new Date(startDate).toLocaleDateString();
      const end = new Date(endDate).toLocaleDateString();
      return `${start} - ${end}`;
    }
    return dateFilterOptions.find(opt => opt.value === dateFilter)?.label || "Today";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton />
            <h1 className="text-xl font-bold text-gray-800">Orders</h1>
            <span className={`px-2 py-1 text-xs rounded-full ${
              isAdmin ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
            }`}>
              {isAdmin ? "Admin" : "Cashier"}
            </span>
            <div className="flex items-center gap-2">
              {wsConnected && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Live
                </span>
              )}
              {lastFetchTime > 0 && (
                <span className="text-[10px] text-gray-500">
                  {orders.length} orders • {new Date(lastFetchTime).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              ref={refreshButtonRef}
              onClick={() => {
                console.log("Manual refresh clicked");
                fetchOrders();
              }}
              className={`bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-all duration-300 ${
                autoRefreshing ? 'bg-blue-100 border-blue-300 scale-105' : ''
              }`}
              disabled={loading}
            >
              {loading || autoRefreshing ? (
                <FaSpinner className="animate-spin" />
              ) : (
                <FaSync className={`${refreshTrigger > 0 ? 'animate-spin' : ''}`} />
              )}
              {autoRefreshing ? 'Updating...' : 'Refresh'}
            </button>
            <button
              onClick={goToHome}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
            >
              <FaHome />
              Home
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="px-4 py-3 border-t">
          <div className="relative mb-3">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <FaSearch />
            </div>
            <input
              type="text"
              placeholder="Search orders by ID, customer, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <div className="relative">
              <button
                onClick={() => setShowDateDropdown(!showDateDropdown)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <FaCalendar />
                {getDateFilterLabel()}
                <FaChevronDown className="text-xs" />
              </button>
              
              {showDateDropdown && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border rounded-lg shadow-lg z-30">
                  {dateFilterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        if (option.value === "custom") {
                          setShowCalendar(true);
                        } else {
                          setDateFilter(option.value);
                          setStartDate("");
                          setEndDate("");
                        }
                        setShowDateDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${
                        dateFilter === option.value ? "bg-blue-50 text-blue-600" : ""
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {showCalendar && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-40 p-4 w-64">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCustomDateApply}
                    disabled={!startDate || !endDate}
                    className={`flex-1 px-3 py-2 rounded-lg ${
                      startDate && endDate
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => setShowCalendar(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {dateFilter === "custom" && startDate && endDate && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                </span>
                <button
                  onClick={handleCustomDateClear}
                  className="text-red-500 text-sm"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        {orders.length > 0 && (
          <div className="px-4 py-3 border-t bg-gray-50">
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm">
                <div className="text-gray-500">Total Orders</div>
                <div className="font-bold">{filteredOrders.length}</div>
              </div>
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm">
                <div className="text-gray-500">Active</div>
                <div className="font-bold text-green-600">{activeOrdersCount}</div>
              </div>
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm">
                <div className="text-gray-500">Completed</div>
                <div className="font-bold text-blue-600">{completedOrdersCount}</div>
              </div>
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm">
                <div className="text-gray-500">Sales</div>
                <div className="font-bold">PHP{totalSales.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-4 mb-48">
        {loading && orders.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3"></div>
              <p className="text-gray-600">Loading orders...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <p className="text-red-500 mb-3">{error}</p>
              <button
                onClick={() => fetchOrders()}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-gray-600 mb-2">
                {orders.length === 0 ? "No orders found" : "No orders match your filters"}
              </p>
              {orders.length > 0 && dateFilter !== "all" && (
                <button
                  onClick={() => setDateFilter("all")}
                  className="text-blue-500 text-sm"
                >
                  Show all orders
                </button>
              )}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-blue-500 text-sm ml-2"
                >
                  Clear search
                </button>
              )}
              {orders.length === 0 && (
                <button
                  onClick={() => fetchOrders()}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 mt-2"
                >
                  Refresh Orders
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-48">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                onViewReceipt={handleViewReceipt}
                onDelete={handleDeleteOrder}
                onStatusChange={handleStatusChange}
                isDeleting={deletingOrderId === order._id}
                isUpdating={updatingOrderId === order._id}
              />
            ))}
          </div>
        )}
      </div>

      {showInvoice && selectedOrder && (
        <Invoice orderInfo={selectedOrder} setShowInvoice={setShowInvoice} />
      )}

      <BottomNav />
    </div>
  );
};

export default Orders;