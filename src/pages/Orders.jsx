import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  FaSearch,
  FaUser,
  FaReceipt,
  FaCheckCircle,
  FaArrowUp,
  FaPrint,
  FaCalendar,
  FaTachometerAlt,
  FaTrash,
  FaBan,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaSync,
  FaExclamationTriangle,
  FaFileExcel,
  FaFileCsv,
  FaDownload,
  FaList,
  FaTh,
  FaTable,
  FaEye,
  FaFilter,
  FaSpinner,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import { getOrders, getAdminOrders, updateOrderStatus } from "../https";
import BottomNav from "../components/shared/BottomNav";
import BackButton from "../components/shared/BackButton";
import Invoice from "../components/invoice/Invoice";

const Orders = () => {
  // State variables
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [totalSales, setTotalSales] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [dateFilter, setDateFilter] = useState("today");
  const [customDateRange, setCustomDateRange] = useState({
    startDate: null,
    endDate: null,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectingStartDate, setSelectingStartDate] = useState(true);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState("excel");
  const [viewMode, setViewMode] = useState("grid");
  const [isCancelling, setIsCancelling] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasMoreOrders, setHasMoreOrders] = useState(true);
  const [totalOrderCount, setTotalOrderCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const scrollRef = useRef(null);
  const datePickerRef = useRef(null);
  const downloadMenuRef = useRef(null);

  const user = useSelector((state) => state.user);
  const navigate = useNavigate();

  // Initial fetch with pagination
  useEffect(() => {
    document.title = "POS | Orders";
    fetchOrders(1, pageSize);

    const handleClickOutside = (event) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target)
      ) {
        setShowDatePicker(false);
      }
    };

    const handleDownloadMenuClickOutside = (event) => {
      if (
        downloadMenuRef.current &&
        !downloadMenuRef.current.contains(event.target)
      ) {
        setShowDownloadMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("mousedown", handleDownloadMenuClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("mousedown", handleDownloadMenuClickOutside);
    };
  }, []);

  // Fetch orders with pagination
  const fetchOrders = async (page = 1, limit = pageSize) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);
      console.log(`🔄 Fetching orders page ${page} (${limit} per page)...`);

      let ordersData = [];
      let totalCount = 0;
      let fetchedPage = page;

      // For admins
      if (user.role?.toLowerCase() === "admin") {
        console.log(`🛠️ Using admin API to fetch page ${page}`);
        try {
          const response = await getAdminOrders({
            page,
            limit,
            ...(dateFilter === "custom" &&
            customDateRange.startDate &&
            customDateRange.endDate
              ? {
                  startDate: customDateRange.startDate.toISOString(),
                  endDate: customDateRange.endDate.toISOString(),
                }
              : {}),
          });
          console.log("📦 Admin API response:", response);

          // Handle different response structures
          if (response?.data?.data) {
            ordersData = response.data.data;
            totalCount = response.data.total || response.data.count || 0;
            fetchedPage = response.data.page || page;
          } else if (response?.data?.orders) {
            ordersData = response.data.orders;
            totalCount = response.data.total || 0;
            fetchedPage = response.data.page || page;
          } else if (Array.isArray(response?.data)) {
            ordersData = response.data;
            totalCount = response.data.length;
          } else if (Array.isArray(response)) {
            ordersData = response;
            totalCount = response.length;
          }
        } catch (error) {
          console.error("❌ Admin API failed, trying user API:", error);
          // Fallback to regular orders API
          const response = await getOrders({
            page,
            limit,
            ...(dateFilter === "custom" &&
            customDateRange.startDate &&
            customDateRange.endDate
              ? {
                  startDate: customDateRange.startDate.toISOString(),
                  endDate: customDateRange.endDate.toISOString(),
                }
              : {}),
          });
          const extracted = extractOrdersFromResponse(response);
          ordersData = extracted;
          totalCount = extracted.length;
        }
      } else {
        // For regular users
        console.log(`👤 Using user API to fetch page ${page}`);
        const response = await getOrders({
          page,
          limit,
          ...(dateFilter === "custom" &&
          customDateRange.startDate &&
          customDateRange.endDate
            ? {
                startDate: customDateRange.startDate.toISOString(),
                endDate: customDateRange.endDate.toISOString(),
              }
            : {}),
        });
        const extracted = extractOrdersFromResponse(response);
        ordersData = extracted;
        totalCount = extracted.length;
      }

      // Process orders
      ordersData = ordersData
        .map((order) => {
          const dateString =
            order.createdAt ||
            order.orderDate ||
            order.date ||
            order.created_at ||
            order.order_date ||
            order.createdDate ||
            order.timestamp;

          let parsedDate = new Date();
          if (dateString) {
            parsedDate = new Date(dateString);
            if (isNaN(parsedDate.getTime())) {
              console.warn(
                "Invalid date found, using current date:",
                dateString
              );
              parsedDate = new Date();
            }
          }

          return {
            ...order,
            createdAt: parsedDate.toISOString(),
            parsedDate: parsedDate,
          };
        })
        .filter((order) => order && order.parsedDate);

      console.log(
        `✅ Successfully fetched ${ordersData.length} orders (page ${fetchedPage})`
      );

      // Update orders state
      if (page === 1) {
        setOrders(ordersData || []);
      } else {
        setOrders((prev) => [...prev, ...(ordersData || [])]);
      }

      // Update pagination state
      setTotalOrderCount(totalCount);
      setHasMoreOrders(ordersData.length === limit);
      setCurrentPage(fetchedPage);

      // Apply filters to fetched data
      applyDateFilter(page === 1 ? ordersData : [...orders, ...ordersData]);
    } catch (err) {
      console.error("❌ Failed to fetch orders:", err);
      setError("Failed to load orders. Please try again.");
      enqueueSnackbar("Failed to load orders", { variant: "error" });
      if (page === 1) {
        setOrders([]);
      }
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Refresh all orders (first page)
  const refreshOrders = () => {
    setCurrentPage(1);
    fetchOrders(1, pageSize);
  };

  const extractOrdersFromResponse = (response) => {
    if (!response) return [];

    const data = response.data || response;
    console.log("📦 Extracting orders from response:", typeof data);

    if (Array.isArray(data)) {
      console.log("✅ Response is an array");
      return data.filter((order) => order && typeof order === "object");
    }

    if (data.data && Array.isArray(data.data)) {
      console.log("✅ Found orders in data.data");
      return data.data.filter((order) => order && typeof order === "object");
    }

    if (data.orders && Array.isArray(data.orders)) {
      console.log("✅ Found orders in data.orders");
      return data.orders.filter((order) => order && typeof order === "object");
    }

    if (data.result && Array.isArray(data.result)) {
      console.log("✅ Found orders in data.result");
      return data.result.filter((order) => order && typeof order === "object");
    }

    if (data.items && Array.isArray(data.items)) {
      console.log("✅ Found orders in data.items");
      return data.items.filter((order) => order && typeof order === "object");
    }

    if (data.docs && Array.isArray(data.docs)) {
      console.log("✅ Found orders in data.docs");
      return data.docs.filter((order) => order && typeof order === "object");
    }

    // Check any array property
    for (const key in data) {
      if (Array.isArray(data[key])) {
        const arr = data[key];
        if (arr.length > 0 && arr[0] && typeof arr[0] === "object") {
          console.log(`✅ Found orders in data.${key}`);
          return arr.filter((order) => order && typeof order === "object");
        }
      }
    }

    console.warn("⚠️ Could not find orders array");
    return [];
  };

  // Apply date filter to current orders
  const applyDateFilter = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      setFilteredOrders([]);
      return;
    }

    const filtered = data.filter((order) => {
      if (!order || !order.parsedDate) return false;

      let orderDate;
      if (order.parsedDate) {
        orderDate = new Date(order.parsedDate);
      } else if (order.createdAt) {
        orderDate = new Date(order.createdAt);
      } else if (order.orderDate) {
        orderDate = new Date(order.orderDate);
      } else if (order.date) {
        orderDate = new Date(order.date);
      } else {
        return false;
      }

      if (isNaN(orderDate.getTime())) return false;
      orderDate.setHours(0, 0, 0, 0);

      if (
        dateFilter === "custom" &&
        (customDateRange.startDate || customDateRange.endDate)
      ) {
        const startDate = customDateRange.startDate
          ? new Date(customDateRange.startDate)
          : null;
        const endDate = customDateRange.endDate
          ? new Date(customDateRange.endDate)
          : null;

        if (startDate && endDate) {
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          return orderDate >= startDate && orderDate <= endDate;
        } else if (startDate) {
          startDate.setHours(0, 0, 0, 0);
          return orderDate.getTime() === startDate.getTime();
        } else if (endDate) {
          endDate.setHours(0, 0, 0, 0);
          return orderDate.getTime() === endDate.getTime();
        }
      }

      if (dateFilter === "all") return true;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (dateFilter) {
        case "today":
          return orderDate.getTime() === today.getTime();
        case "yesterday":
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          return orderDate.getTime() === yesterday.getTime();
        case "thisWeek":
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          return orderDate >= startOfWeek;
        case "thisMonth":
          return (
            orderDate.getMonth() === today.getMonth() &&
            orderDate.getFullYear() === today.getFullYear()
          );
        case "lastMonth":
          const lastMonth = new Date(today);
          lastMonth.setMonth(today.getMonth() - 1);
          return (
            orderDate.getMonth() === lastMonth.getMonth() &&
            orderDate.getFullYear() === lastMonth.getFullYear()
          );
        case "thisYear":
          return orderDate.getFullYear() === today.getFullYear();
        case "lastYear":
          return orderDate.getFullYear() === today.getFullYear() - 1;
        default:
          return true;
      }
    });

    console.log(`📊 Filtered ${filtered.length} orders for ${dateFilter}`);
    setFilteredOrders(filtered || []);
    calculateTotals(filtered);
  };

  // Re-fetch when date filter changes
  useEffect(() => {
    if (
      dateFilter === "custom" &&
      customDateRange.startDate &&
      customDateRange.endDate
    ) {
      setCurrentPage(1);
      fetchOrders(1, pageSize);
    } else if (dateFilter !== "all") {
      applyDateFilter(orders);
    }
  }, [dateFilter, customDateRange]);

  // Calculate totals
  const calculateTotals = (ordersList) => {
    if (!Array.isArray(ordersList) || ordersList.length === 0) {
      setTotalOrders(0);
      setTotalSales(0);
      return;
    }

    const activeOrders = ordersList.filter(
      (order) => order.orderStatus?.toLowerCase() !== "cancelled"
    );

    const salesTotal = activeOrders.reduce((sum, order) => {
      if (!order) return sum;
      const amount =
        order.totalAmount || order.bills?.totalWithTax || order.amount || 0;
      return sum + (Number(amount) || 0);
    }, 0);

    setTotalOrders(activeOrders.length);
    setTotalSales(salesTotal);
  };

  // Scroll handling
  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollTop = scrollRef.current.scrollTop;
      const scrollHeight = scrollRef.current.scrollHeight;
      const clientHeight = scrollRef.current.clientHeight;

      setShowScrollButton(scrollTop > 300);

      // Infinite scroll - load more when near bottom
      if (
        scrollTop + clientHeight >= scrollHeight - 100 &&
        hasMoreOrders &&
        !isLoadingMore &&
        !loading
      ) {
        loadMoreOrders();
      }
    }
  };

  // Load more orders for infinite scroll
  const loadMoreOrders = () => {
    if (hasMoreOrders && !isLoadingMore && !loading) {
      const nextPage = currentPage + 1;
      fetchOrders(nextPage, pageSize);
    }
  };

  // Check if user can cancel order
  const canUserCancelOrder = (order) => {
    const userRole = user.role?.toLowerCase();

    if (userRole === "admin") return true;

    if (userRole === "cashier") {
      const orderCashierId = order.cashierId || order.user?._id || order.userId;
      const currentUserId = user._id || user.id;

      if (orderCashierId && currentUserId) {
        return orderCashierId === currentUserId;
      }

      const orderCashierName = getUserDisplayName(order);
      const currentUserName = user.name;

      return orderCashierName === currentUserName;
    }

    return false;
  };

  // Cancel order handler
  const handleCancelOrder = async (order) => {
    try {
      setIsCancelling(true);
      console.log("🗑️ Cancelling order:", order._id);

      if (!order._id) {
        throw new Error("Order ID is required");
      }

      const response = await updateOrderStatus({
        orderId: order._id,
        orderStatus: "cancelled",
      });

      console.log("✅ Cancel response:", response);

      if (!response || response.status !== 200) {
        throw new Error("Failed to cancel order");
      }

      // Update local state
      const updatedOrders = orders.map((o) =>
        o._id === order._id ? { ...o, orderStatus: "cancelled" } : o
      );

      setOrders(updatedOrders);
      applyDateFilter(updatedOrders);

      setShowDeleteModal(false);
      setOrderToDelete(null);

      enqueueSnackbar("Order cancelled successfully!", {
        variant: "success",
      });
    } catch (error) {
      console.error("❌ Cancel order error:", error);
      enqueueSnackbar("Failed to cancel order. Please try again.", {
        variant: "error",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // Status configuration
  const getStatusConfig = (orderStatus) => {
    const status = orderStatus?.toLowerCase() || "completed";

    switch (status) {
      case "cancelled":
        return {
          icon: FaBan,
          color: "text-red-500",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          text: "Cancelled",
        };
      case "pending":
        return {
          icon: FaCheckCircle,
          color: "text-yellow-500",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          text: "Pending",
        };
      case "in progress":
      case "processing":
        return {
          icon: FaSpinner,
          color: "text-blue-500",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          text: "In Progress",
        };
      case "completed":
      default:
        return {
          icon: FaCheckCircle,
          color: "text-green-500",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          text: "Completed",
        };
    }
  };

  // Filter orders with search
  const filteredOrdersWithSearch = React.useMemo(() => {
    try {
      if (!Array.isArray(filteredOrders)) {
        return [];
      }

      if (!searchQuery.trim()) {
        return filteredOrders;
      }

      const searchLower = searchQuery.toLowerCase();
      return filteredOrders.filter((order) => {
        if (!order) return false;

        const orderId = order._id || order.id || "";
        const customerName =
          order.customerDetails?.name || order.customerName || "";
        const cashierName =
          order.cashier || order.user?.name || order.userDetails?.name || "";
        const orderStatus = order.orderStatus || "completed";
        const tableNo = order.table?.tableNo || "";

        return (
          orderId.toLowerCase().includes(searchLower) ||
          customerName.toLowerCase().includes(searchLower) ||
          cashierName.toLowerCase().includes(searchLower) ||
          orderStatus.toLowerCase().includes(searchLower) ||
          tableNo.toString().includes(searchLower)
        );
      });
    } catch (error) {
      console.error("❌ Error filtering orders:", error);
      return filteredOrders;
    }
  }, [filteredOrders, searchQuery]);

  // Utility functions (keep existing)
  const calculateTotalAmount = (order) => {
    if (!order) return 0;

    if (order.totalAmount !== undefined && order.totalAmount !== null) {
      return Number(order.totalAmount) || 0;
    }
    if (
      order.bills?.totalWithTax !== undefined &&
      order.bills.totalWithTax !== null
    ) {
      return Number(order.bills.totalWithTax) || 0;
    }
    if (order.amount !== undefined && order.amount !== null) {
      return Number(order.amount) || 0;
    }
    if (order.items && Array.isArray(order.items)) {
      return order.items.reduce((total, item) => {
        const price = Number(
          item.price || item.unitPrice || item.totalPrice || 0
        );
        const quantity = Number(item.quantity || 1);
        return total + price * quantity;
      }, 0);
    }
    return 0;
  };

  const formatCurrency = (amount) => {
    const numericAmount =
      typeof amount === "number" ? amount : parseFloat(amount) || 0;
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatDateShort = (date) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const formatDateForExport = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().split("T")[0];
    } catch (error) {
      return "";
    }
  };

  const getItemsCount = (order) => {
    if (!order) return 0;

    if (order.items && Array.isArray(order.items)) {
      return order.items.reduce(
        (total, item) => total + (Number(item.quantity) || 1),
        0
      );
    }
    return Number(order.itemsCount || order.quantity || order.totalItems || 0);
  };

  const getItemsPreview = (order) => {
    if (!order) return "No items";

    if (!order.items || !Array.isArray(order.items)) {
      return "No items";
    }

    const itemsText = order.items
      .slice(0, 3)
      .map((item) => {
        const name =
          item.name || item.productName || item.itemName || "Unknown Item";
        const quantity = item.quantity > 1 ? ` (${item.quantity})` : "";
        return name + quantity;
      })
      .join(", ");

    const totalItems = getItemsCount(order);
    const shownItems = order.items
      .slice(0, 3)
      .reduce((total, item) => total + (Number(item.quantity) || 1), 0);

    if (totalItems > shownItems) {
      return `${itemsText} +${totalItems - shownItems} more`;
    }

    return itemsText;
  };

  const handleViewReceipt = (order) => {
    setSelectedOrder(order);
    setShowInvoice(true);
  };

  const confirmCancel = () => {
    if (orderToDelete && orderToDelete._id) {
      handleCancelOrder(orderToDelete);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setOrderToDelete(null);
  };

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const navigateToDashboard = () => {
    navigate("/dashboard");
  };

  const navigateToHome = () => {
    navigate("/");
  };

  const getUserDisplayName = (order) => {
    if (order.cashier) return order.cashier;
    if (order.user?.name) return order.user.name;
    if (order.userDetails?.name) return order.userDetails.name;
    if (user.name && order.user?._id === user._id) return user.name;
    return "Cashier";
  };

  const hasDiscount = (order) => {
    if (!order) return false;

    if (order.bills) {
      return (
        (order.bills.discount && order.bills.discount > 0) ||
        (order.bills.pwdSeniorDiscount && order.bills.pwdSeniorDiscount > 0) ||
        (order.bills.employeeDiscount && order.bills.employeeDiscount > 0) ||
        (order.bills.shareholderDiscount &&
          order.bills.shareholderDiscount > 0) ||
        (order.bills.redemptionDiscount && order.bills.redemptionDiscount > 0)
      );
    }

    return (
      (order.discount && order.discount > 0) ||
      (order.totalDiscount && order.totalDiscount > 0)
    );
  };

  const getDiscountType = (order) => {
    if (!order) return null;

    if (order.bills) {
      if (order.bills.pwdSeniorDiscount > 0) return "PWD/Senior";
      if (order.bills.employeeDiscount > 0) return "Employee";
      if (order.bills.shareholderDiscount > 0) return "Shareholder";
      if (order.bills.redemptionDiscount > 0) return "Redemption";
      if (order.bills.discount > 0) return "Discount";
    }

    if (order.discountType) return order.discountType;
    if (order.discount > 0) return "Discount";

    return null;
  };

  // Calendar functions (keep existing)
  const generateCalendarDays = () => {
    const days = [];
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const startingDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const prevMonth = new Date(calendarYear, calendarMonth, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        month: calendarMonth - 1,
        year: calendarYear,
        isCurrentMonth: false,
        date: new Date(calendarYear, calendarMonth - 1, prevMonthDays - i),
      });
    }

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(calendarYear, calendarMonth, day);
      days.push({
        day,
        month: calendarMonth,
        year: calendarYear,
        isCurrentMonth: true,
        date,
      });
    }

    const totalCells = 42;
    const nextMonthDays = totalCells - days.length;
    for (let i = 1; i <= nextMonthDays; i++) {
      days.push({
        day: i,
        month: calendarMonth + 1,
        year: calendarMonth === 11 ? calendarYear + 1 : calendarYear,
        isCurrentMonth: false,
        date: new Date(
          calendarMonth === 11 ? calendarYear + 1 : calendarYear,
          calendarMonth + 1,
          i
        ),
      });
    }

    return days;
  };

  const handleDateSelect = (date) => {
    if (selectingStartDate) {
      setCustomDateRange({
        startDate: date,
        endDate: customDateRange.endDate,
      });
      setSelectingStartDate(false);
    } else {
      if (customDateRange.startDate && date < customDateRange.startDate) {
        setCustomDateRange({
          startDate: date,
          endDate: customDateRange.startDate,
        });
      } else {
        setCustomDateRange({
          startDate: customDateRange.startDate,
          endDate: date,
        });
      }
      setSelectingStartDate(true);
    }
  };

  const handleTodayClick = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectingStartDate) {
      setCustomDateRange({
        startDate: today,
        endDate: customDateRange.endDate,
      });
    } else {
      setCustomDateRange({
        startDate: customDateRange.startDate,
        endDate: today,
      });
    }
  };

  const handleClearClick = () => {
    setCustomDateRange({
      startDate: null,
      endDate: null,
    });
    setSelectingStartDate(true);
  };

  const handleApplyDateRange = () => {
    setDateFilter("custom");
    setCurrentPage(1);
    fetchOrders(1, pageSize);
    setShowDatePicker(false);
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const isDateInRange = (date) => {
    if (!customDateRange.startDate || !customDateRange.endDate) return false;
    return date >= customDateRange.startDate && date <= customDateRange.endDate;
  };

  const isStartDate = (date) => {
    if (!customDateRange.startDate) return false;
    return date.getTime() === customDateRange.startDate.getTime();
  };

  const isEndDate = (date) => {
    if (!customDateRange.endDate) return false;
    return date.getTime() === customDateRange.endDate.getTime();
  };

  const getDateRangeLabel = () => {
    if (customDateRange.startDate && customDateRange.endDate) {
      return `${formatDateShort(customDateRange.startDate)} - ${formatDateShort(
        customDateRange.endDate
      )}`;
    } else if (customDateRange.startDate) {
      return `From ${formatDateShort(customDateRange.startDate)}`;
    }
    return "Select dates";
  };

  // Export functions (keep existing)
  const prepareExportData = () => {
    const dataToExport = filteredOrdersWithSearch.map((order) => {
      const totalAmount = calculateTotalAmount(order);
      const itemsCount = getItemsCount(order);
      const discountType = getDiscountType(order);

      let discountAmount = 0;
      if (order.bills) {
        discountAmount = order.bills.discount || 0;
        if (order.bills.pwdSeniorDiscount)
          discountAmount += order.bills.pwdSeniorDiscount;
        if (order.bills.employeeDiscount)
          discountAmount += order.bills.employeeDiscount;
        if (order.bills.shareholderDiscount)
          discountAmount += order.bills.shareholderDiscount;
        if (order.bills.redemptionDiscount)
          discountAmount += order.bills.redemptionDiscount;
      } else if (order.discount) {
        discountAmount = order.discount;
      }

      const subtotal = totalAmount + discountAmount;

      return {
        "Order ID": order._id?.slice(-8) || "N/A",
        "Full Order ID": order._id || order.id || "N/A",
        "Customer Name":
          order.customerDetails?.name ||
          order.customerName ||
          "Unknown Customer",
        "Cashier Name": getUserDisplayName(order),
        "Order Date": formatDateForExport(
          order.createdAt || order.orderDate || order.date
        ),
        "Order Time": new Date(
          order.createdAt || order.orderDate || order.date
        ).toLocaleTimeString(),
        "Order Status": order.orderStatus || "completed",
        "Table No": order.table?.tableNo || "N/A",
        "Order Type": order.table?.tableNo ? "Dine In" : "Take Out",
        Subtotal: subtotal.toFixed(2),
        "Discount Type": discountType || "None",
        "Discount Amount": discountAmount.toFixed(2),
        "Total Amount": totalAmount.toFixed(2),
        "Items Count": itemsCount,
        "Payment Method": order.paymentMethod || order.paymentType || "Cash",
        "Payment Status": order.paymentStatus || "Paid",
        "Tax Amount": order.bills?.taxAmount || 0,
        "Service Charge": order.bills?.serviceCharge || 0,
        Notes: order.notes || "",
        "Created At": formatDateForExport(order.createdAt),
        "Updated At": formatDateForExport(order.updatedAt),
      };
    });

    const summaryRow = {
      "Order ID": "SUMMARY",
      "Full Order ID": "",
      "Customer Name": "",
      "Cashier Name": "",
      "Order Date": "",
      "Order Time": "",
      "Order Status": "",
      "Table No": "",
      "Order Type": "",
      Subtotal: filteredOrdersWithSearch
        .reduce((sum, order) => {
          const totalAmount = calculateTotalAmount(order);
          const discountAmount = order.bills
            ? (order.bills.discount || 0) +
              (order.bills.pwdSeniorDiscount || 0) +
              (order.bills.employeeDiscount || 0) +
              (order.bills.shareholderDiscount || 0) +
              (order.bills.redemptionDiscount || 0)
            : order.discount || 0;
          return sum + totalAmount + discountAmount;
        }, 0)
        .toFixed(2),
      "Discount Type": "Total Discount",
      "Discount Amount": filteredOrdersWithSearch
        .reduce((sum, order) => {
          if (order.bills) {
            return (
              sum +
              (order.bills.discount || 0) +
              (order.bills.pwdSeniorDiscount || 0) +
              (order.bills.employeeDiscount || 0) +
              (order.bills.shareholderDiscount || 0) +
              (order.bills.redemptionDiscount || 0)
            );
          }
          return sum + (order.discount || 0);
        }, 0)
        .toFixed(2),
      "Total Amount": filteredOrdersWithSearch
        .reduce((sum, order) => {
          return sum + calculateTotalAmount(order);
        }, 0)
        .toFixed(2),
      "Items Count": filteredOrdersWithSearch.reduce(
        (sum, order) => sum + getItemsCount(order),
        0
      ),
      "Payment Method": "",
      "Payment Status": "",
      "Tax Amount": filteredOrdersWithSearch
        .reduce((sum, order) => sum + (order.bills?.taxAmount || 0), 0)
        .toFixed(2),
      "Service Charge": filteredOrdersWithSearch
        .reduce((sum, order) => sum + (order.bills?.serviceCharge || 0), 0)
        .toFixed(2),
      Notes: `Total Orders: ${filteredOrdersWithSearch.length}`,
      "Created At": "",
      "Updated At": "",
    };

    return [...dataToExport, summaryRow];
  };

  const exportToCSV = () => {
    try {
      setIsDownloading(true);
      const data = prepareExportData();

      if (data.length === 0) {
        enqueueSnackbar("No data to export", { variant: "warning" });
        return;
      }

      const headers = Object.keys(data[0]);
      let csvContent = headers.join(",") + "\n";

      data.forEach((row) => {
        const rowData = headers.map((header) => {
          const cell = row[header];
          if (
            typeof cell === "string" &&
            (cell.includes(",") || cell.includes('"') || cell.includes("\n"))
          ) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        });
        csvContent += rowData.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const dateStr =
        dateFilter === "custom" &&
        customDateRange.startDate &&
        customDateRange.endDate
          ? `${formatDateForExport(
              customDateRange.startDate
            )}_to_${formatDateForExport(customDateRange.endDate)}`
          : dateFilter;

      link.download = `orders_${dateStr}_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      link.click();

      URL.revokeObjectURL(url);
      setShowDownloadMenu(false);

      enqueueSnackbar(`Exported ${data.length - 1} orders to CSV`, {
        variant: "success",
      });
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      enqueueSnackbar("Failed to export data. Please try again.", {
        variant: "error",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const exportToExcel = () => {
    try {
      setIsDownloading(true);
      const data = prepareExportData();

      if (data.length === 0) {
        enqueueSnackbar("No data to export", { variant: "warning" });
        return;
      }

      const headers = Object.keys(data[0]);
      let csvContent = headers.join(",") + "\n";

      data.forEach((row) => {
        const rowData = headers.map((header) => {
          const cell = row[header];
          if (
            typeof cell === "string" &&
            (cell.includes(",") || cell.includes('"') || cell.includes("\n"))
          ) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        });
        csvContent += rowData.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: "application/vnd.ms-excel" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const dateStr =
        dateFilter === "custom" &&
        customDateRange.startDate &&
        customDateRange.endDate
          ? `${formatDateForExport(
              customDateRange.startDate
            )}_to_${formatDateForExport(customDateRange.endDate)}`
          : dateFilter;

      link.download = `orders_${dateStr}_${
        new Date().toISOString().split("T")[0]
      }.xls`;
      link.click();

      URL.revokeObjectURL(url);
      setShowDownloadMenu(false);

      enqueueSnackbar(`Exported ${data.length - 1} orders to Excel`, {
        variant: "success",
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      enqueueSnackbar("Failed to export data. Please try again.", {
        variant: "error",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownload = () => {
    if (filteredOrdersWithSearch.length === 0) {
      enqueueSnackbar("No orders to export", { variant: "warning" });
      return;
    }

    if (downloadFormat === "csv") {
      exportToCSV();
    } else {
      exportToExcel();
    }
  };

  // Component for grid view
  const OrderCard = ({ order, onViewReceipt, onCancelOrder }) => {
    if (!order) return null;

    const orderStatus = order.orderStatus || "completed";
    const statusConfig = getStatusConfig(orderStatus);
    const StatusIcon = statusConfig.icon;
    const totalAmount = calculateTotalAmount(order);
    const itemsCount = getItemsCount(order);
    const itemsPreview = getItemsPreview(order);
    const userDisplayName = getUserDisplayName(order);
    const discountExists = hasDiscount(order);
    const discountType = getDiscountType(order);
    const isCancelled = orderStatus.toLowerCase() === "cancelled";
    const canCancel = canUserCancelOrder(order) && orderStatus !== "cancelled";

    return (
      <div
        className={`border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-all duration-200 w-full h-full flex flex-col relative group ${
          isCancelled ? "opacity-75" : ""
        }`}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <FaReceipt className="text-gray-600 text-sm" />
            <span className="font-mono text-xs text-gray-700">
              #{order._id?.slice(-8) || order.id?.slice(-8) || "N/A"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <StatusIcon className={`text-xs ${statusConfig.color}`} />
            <span
              className={`text-xs font-medium capitalize ${statusConfig.color}`}
            >
              {statusConfig.text}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <FaUser className="text-gray-500 text-xs" />
          <span className="text-xs font-medium text-gray-800">
            {order.customerDetails?.name ||
              order.customerName ||
              "Unknown Customer"}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-3 text-xs text-gray-600">
          <span>Cashier:</span>
          <span className="font-medium text-gray-800">{userDisplayName}</span>
          {user.name && userDisplayName === user.name && (
            <span className="bg-blue-100 text-blue-800 text-[9px] px-1.5 py-0.5 rounded-full">
              You
            </span>
          )}
        </div>

        {discountExists && discountType && (
          <div className="mb-3">
            <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-1 rounded-full font-medium">
              {discountType} Discount Applied
            </span>
          </div>
        )}

        {order.table?.tableNo && (
          <div className="flex items-center gap-2 mb-3 text-xs text-gray-600">
            <span>Table {order.table.tableNo}</span>
            <span>•</span>
            <span>Dine In</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-xs mb-3">
          <div className="space-y-1">
            <div className="text-gray-600">Date</div>
            <div className="font-medium text-gray-800">
              {formatDate(order.createdAt || order.orderDate || order.date)}
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="text-gray-600">Amount</div>
            <div
              className={`font-semibold ${
                isCancelled ? "text-red-600 line-through" : "text-gray-800"
              }`}
            >
              {formatCurrency(totalAmount)}
            </div>
          </div>
        </div>

        {((order.items && order.items.length > 0) || itemsCount > 0) && (
          <div className="mt-2 pt-2 border-t border-gray-200 mb-3">
            <div className="text-xs text-gray-600 mb-1">
              Items {itemsCount > 0 && `(${itemsCount})`}
            </div>
            <div className="text-xs text-gray-800 line-clamp-2">
              {itemsPreview}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-gray-200 mt-auto">
          <button
            onClick={() => onViewReceipt(order)}
            className="flex-1 bg-[#025cca] text-white px-2 py-2 rounded text-xs font-medium flex items-center gap-2 justify-center hover:bg-[#014aa3] transition-colors"
            disabled={isCancelled}
          >
            <FaPrint className="text-[10px]" />
            {isCancelled ? "Cancelled" : "View Receipt"}
          </button>

          {canCancel && (
            <button
              onClick={() => onCancelOrder(order)}
              className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-2 rounded text-xs font-medium flex items-center gap-1 justify-center transition-colors"
              title="Cancel Order"
            >
              <FaTrash className="text-[10px]" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // Component for table view
  const OrderRow = ({ order, onViewReceipt, onCancelOrder }) => {
    if (!order) return null;

    const orderStatus = order.orderStatus || "completed";
    const statusConfig = getStatusConfig(orderStatus);
    const StatusIcon = statusConfig.icon;
    const totalAmount = calculateTotalAmount(order);
    const itemsCount = getItemsCount(order);
    const userDisplayName = getUserDisplayName(order);
    const isCancelled = orderStatus.toLowerCase() === "cancelled";
    const canCancel = canUserCancelOrder(order) && orderStatus !== "cancelled";
    const orderDate = formatDate(
      order.createdAt || order.orderDate || order.date
    );
    const shortOrderId = order._id?.slice(-8) || order.id?.slice(-8) || "N/A";

    return (
      <tr
        className={`border-b hover:bg-gray-50 ${
          isCancelled ? "bg-red-50" : ""
        }`}
      >
        <td className="py-3 px-2">
          <div className="flex items-center gap-2">
            <FaReceipt className="text-gray-500 text-xs" />
            <span className="font-mono text-xs font-medium">
              {shortOrderId}
            </span>
          </div>
        </td>
        <td className="py-3 px-2">
          <div className="text-xs">
            {order.customerDetails?.name || order.customerName || "Walk-in"}
          </div>
        </td>
        <td className="py-3 px-2">
          <div className="text-xs">{userDisplayName}</div>
          {user.name && userDisplayName === user.name && (
            <span className="text-[9px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
              You
            </span>
          )}
        </td>
        <td className="py-3 px-2">
          <div className="text-xs">{itemsCount}</div>
        </td>
        <td className="py-3 px-2">
          <div
            className={`text-xs font-medium ${
              isCancelled ? "text-red-600 line-through" : "text-gray-800"
            }`}
          >
            {formatCurrency(totalAmount)}
          </div>
        </td>
        <td className="py-3 px-2">
          <div
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusConfig.bgColor}`}
          >
            <StatusIcon className={`${statusConfig.color}`} />
            <span className={statusConfig.color}>{statusConfig.text}</span>
          </div>
        </td>
        <td className="py-3 px-2">
          <div className="text-xs whitespace-nowrap">
            {orderDate.split(",")[0]}
          </div>
        </td>
        <td className="py-3 px-2">
          <div className="flex gap-1">
            <button
              onClick={() => onViewReceipt(order)}
              disabled={isCancelled}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs flex items-center gap-1"
              title="View Receipt"
            >
              <FaPrint className="text-[10px]" />
            </button>
            {canCancel && (
              <button
                onClick={() => onCancelOrder(order)}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded text-xs flex items-center gap-1"
                title="Cancel Order"
              >
                <FaBan className="text-[10px]" />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Calculate counts for display
  const activeOrdersCount = React.useMemo(() => {
    return filteredOrders.filter(
      (order) => order.orderStatus?.toLowerCase() !== "cancelled"
    ).length;
  }, [filteredOrders]);

  const cancelledOrdersCount = React.useMemo(() => {
    return filteredOrders.filter(
      (order) => order.orderStatus?.toLowerCase() === "cancelled"
    ).length;
  }, [filteredOrders]);

  const totalActiveOrdersInDB = React.useMemo(() => {
    return orders.filter(
      (order) => order.orderStatus?.toLowerCase() !== "cancelled"
    ).length;
  }, [orders]);

  return (
    <section className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 min-h-screen flex flex-col relative pb-20 md:pb-6">
      <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-30">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-6 py-4 gap-4">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-[#333333] text-xl sm:text-2xl font-bold tracking-wider">
              Orders
            </h1>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                user.role?.toLowerCase() === "admin"
                  ? "bg-green-100 text-green-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {user.role?.toLowerCase() === "admin"
                ? "Admin View"
                : "Cashier View"}
            </span>
            <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
              {user.role?.toLowerCase() === "admin"
                ? "Can Cancel All Orders"
                : "Can Cancel Your Orders"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 ${
                  viewMode === "grid"
                    ? "bg-white shadow-sm text-blue-600"
                    : "text-gray-600 hover:text-gray-800"
                }`}
                title="Grid View"
              >
                <FaTh />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 ${
                  viewMode === "table"
                    ? "bg-white shadow-sm text-blue-600"
                    : "text-gray-600 hover:text-gray-800"
                }`}
                title="Table View"
              >
                <FaTable />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 md:gap-4 items-center">
              <div className="relative" ref={downloadMenuRef}>
                <button
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  disabled={
                    filteredOrdersWithSearch.length === 0 || isDownloading
                  }
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download orders data"
                >
                  {isDownloading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <FaDownload className="text-sm" />
                      Download Data
                    </>
                  )}
                </button>

                {showDownloadMenu && (
                  <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-40 w-64">
                    <div className="p-3 border-b border-gray-200">
                      <h4 className="font-semibold text-sm text-gray-700 mb-2">
                        Export Options
                      </h4>
                      <p className="text-xs text-gray-500">
                        Exporting {filteredOrdersWithSearch.length} orders
                      </p>
                    </div>

                    <div className="p-2">
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Format
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDownloadFormat("excel")}
                            className={`flex-1 py-2 px-3 rounded text-xs font-medium flex items-center justify-center gap-2 ${
                              downloadFormat === "excel"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            <FaFileExcel className="text-green-600" />
                            Excel (.xls)
                          </button>
                          <button
                            onClick={() => setDownloadFormat("csv")}
                            className={`flex-1 py-2 px-3 rounded text-xs font-medium flex items-center justify-center gap-2 ${
                              downloadFormat === "csv"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            <FaFileCsv className="text-green-500" />
                            CSV
                          </button>
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Date Range
                        </label>
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          {dateFilter === "custom" &&
                          customDateRange.startDate &&
                          customDateRange.endDate
                            ? `${formatDateShort(
                                customDateRange.startDate
                              )} - ${formatDateShort(customDateRange.endDate)}`
                            : dateFilter.charAt(0).toUpperCase() +
                              dateFilter.slice(1)}
                        </div>
                      </div>

                      <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                      >
                        {isDownloading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Exporting...
                          </>
                        ) : (
                          <>
                            <FaDownload className="text-xs" />
                            Export{" "}
                            {downloadFormat === "excel" ? "Excel" : "CSV"} File
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={refreshOrders}
                disabled={loading}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh orders"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <FaSync className="text-sm" />
                    Refresh
                  </>
                )}
              </button>

              <button
                onClick={navigateToHome}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <FaTachometerAlt className="text-sm" />
                Dashboard
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="px-4 pb-2">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm flex items-center gap-2">
                <FaExclamationTriangle />
                {error}
              </p>
              <button
                onClick={refreshOrders}
                className="mt-2 text-red-600 hover:text-red-800 text-xs underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        <div className="px-4 pb-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative" ref={datePickerRef}>
              <div
                className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border cursor-pointer hover:border-blue-300 transition-colors"
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                <FaCalendar className="text-gray-600 text-xs" />
                <span className="text-xs sm:text-sm text-gray-700">
                  Filter by Order Date
                </span>
                <FaTimes
                  className="text-gray-400 hover:text-gray-600 ml-auto cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDateFilter("today");
                    setCustomDateRange({ startDate: null, endDate: null });
                    refreshOrders();
                  }}
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1">
                  <div className="text-xs text-gray-600 mb-1">From Date</div>
                  <div
                    className="bg-gray-100 rounded px-3 py-2 text-sm cursor-pointer hover:bg-gray-200 transition-colors flex items-center justify-between"
                    onClick={() => {
                      setShowDatePicker(true);
                      setSelectingStartDate(true);
                    }}
                  >
                    <span
                      className={
                        customDateRange.startDate
                          ? "text-gray-800"
                          : "text-gray-400"
                      }
                    >
                      {customDateRange.startDate
                        ? formatDateShort(customDateRange.startDate)
                        : "mm/dd/yyyy"}
                    </span>
                  </div>
                </div>
                <div className="pt-5">-</div>
                <div className="flex-1">
                  <div className="text-xs text-gray-600 mb-1">To Date</div>
                  <div
                    className="bg-gray-100 rounded px-3 py-2 text-sm cursor-pointer hover:bg-gray-200 transition-colors flex items-center justify-between"
                    onClick={() => {
                      setShowDatePicker(true);
                      setSelectingStartDate(false);
                    }}
                  >
                    <span
                      className={
                        customDateRange.endDate
                          ? "text-gray-800"
                          : "text-gray-400"
                      }
                    >
                      {customDateRange.endDate
                        ? formatDateShort(customDateRange.endDate)
                        : "mm/dd/yyyy"}
                    </span>
                  </div>
                </div>
              </div>

              {showDatePicker && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-40 w-80 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={handlePrevMonth}
                      className="p-2 hover:bg-gray-100 rounded-full"
                    >
                      <FaChevronLeft className="text-gray-600" />
                    </button>
                    <div className="text-lg font-semibold">
                      {monthNames[calendarMonth]} {calendarYear}
                    </div>
                    <button
                      onClick={handleNextMonth}
                      className="p-2 hover:bg-gray-100 rounded-full"
                    >
                      <FaChevronRight className="text-gray-600" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                      <div
                        key={day}
                        className="text-center text-xs text-gray-500 py-1"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((dayInfo, index) => {
                      const isSelected =
                        isStartDate(dayInfo.date) || isEndDate(dayInfo.date);
                      const isInRange = isDateInRange(dayInfo.date);
                      const isToday =
                        dayInfo.date.toDateString() ===
                        new Date().toDateString();

                      return (
                        <button
                          key={index}
                          onClick={() => handleDateSelect(dayInfo.date)}
                          disabled={!dayInfo.isCurrentMonth}
                          className={`
                            h-8 rounded text-sm flex items-center justify-center
                            ${
                              !dayInfo.isCurrentMonth
                                ? "text-gray-300"
                                : "text-gray-700"
                            }
                            ${isSelected ? "bg-blue-500 text-white" : ""}
                            ${isInRange && !isSelected ? "bg-blue-100" : ""}
                            ${
                              isToday && !isSelected
                                ? "border border-blue-300"
                                : ""
                            }
                            ${dayInfo.isCurrentMonth ? "hover:bg-gray-100" : ""}
                            ${isSelected ? "font-semibold" : ""}
                          `}
                        >
                          {dayInfo.day}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-between mt-4 pt-4 border-t">
                    <button
                      onClick={handleClearClick}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleTodayClick}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                    >
                      Today
                    </button>
                    <button
                      onClick={handleApplyDateRange}
                      className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                      disabled={
                        !customDateRange.startDate || !customDateRange.endDate
                      }
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                "today",
                "yesterday",
                "thisWeek",
                "thisMonth",
                "lastMonth",
                "thisYear",
                "all",
              ].map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setDateFilter(filter);
                    setCustomDateRange({ startDate: null, endDate: null });
                    setShowDatePicker(false);
                    if (filter === "all") {
                      refreshOrders();
                    }
                  }}
                  className={`
                    px-3 py-1.5 text-xs rounded-full transition-colors
                    ${
                      dateFilter === filter && !customDateRange.startDate
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }
                  `}
                >
                  {filter === "today"
                    ? "Today"
                    : filter === "yesterday"
                    ? "Yesterday"
                    : filter === "thisWeek"
                    ? "This Week"
                    : filter === "thisMonth"
                    ? "This Month"
                    : filter === "lastMonth"
                    ? "Last Month"
                    : filter === "thisYear"
                    ? "This Year"
                    : "All Time"}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            <div className="flex flex-wrap gap-2 md:gap-4">
              <span className="text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
                Page: <span className="text-lg">{currentPage}</span>
              </span>
              <span className="text-xs sm:text-sm font-semibold text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                Showing: <span className="text-lg">{orders.length}</span>
              </span>
              <span className="text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
                Active Orders: <span className="text-lg">{totalOrders}</span>
              </span>
              <span className="text-xs sm:text-sm font-semibold text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                Sales: {formatCurrency(totalSales)}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                Cancelled:{" "}
                <span className="text-lg">{cancelledOrdersCount}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 rounded-md px-3 py-2 mx-4 mb-4">
          <FaSearch className="text-gray-600 text-xs sm:text-sm" />
          <input
            type="text"
            placeholder="Search by name, order ID, status, or cashier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none text-black w-full text-xs sm:text-sm placeholder-gray-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes className="text-sm" />
            </button>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 mb-16 md:mb-6"
      >
        <div className="mb-4 px-2 text-sm text-gray-600">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              Showing {filteredOrdersWithSearch.length} of{" "}
              {filteredOrders.length} filtered orders
              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {viewMode === "grid" ? "Grid View" : "Table View"}
              </span>
              {filteredOrders.length > 0 && (
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  Active: {activeOrdersCount}
                </span>
              )}
            </div>

            {filteredOrdersWithSearch.length > 0 && (
              <button
                onClick={() => setShowDownloadMenu(true)}
                className="text-green-600 hover:text-green-800 text-xs font-medium flex items-center gap-1"
              >
                <FaDownload className="text-xs" />
                Export {filteredOrdersWithSearch.length} orders
              </button>
            )}
          </div>

          {dateFilter === "custom" &&
            customDateRange.startDate &&
            customDateRange.endDate && (
              <span className="text-gray-800 font-medium">
                {" "}
                • Filtered by {getDateRangeLabel()}
              </span>
            )}
          {dateFilter !== "custom" && dateFilter !== "all" && (
            <span className="text-gray-800 font-medium">
              {" "}
              • Filtered by {dateFilter}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="text-center bg-white rounded-lg p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
              <p className="text-gray-500 text-sm">Loading orders...</p>
            </div>
          </div>
        ) : filteredOrdersWithSearch.length > 0 ? (
          viewMode === "table" ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
              <div className="min-w-full">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="py-3 px-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="py-3 px-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Cashier
                      </th>
                      <th className="py-3 px-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="py-3 px-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="py-3 px-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="py-3 px-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="py-3 px-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredOrdersWithSearch.map((order) => (
                      <OrderRow
                        key={order._id || Math.random().toString()}
                        order={order}
                        onViewReceipt={handleViewReceipt}
                        onCancelOrder={(order) => {
                          setOrderToDelete(order);
                          setShowDeleteModal(true);
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 auto-rows-fr">
                {filteredOrdersWithSearch.map((order) => (
                  <OrderCard
                    key={order._id || Math.random().toString()}
                    order={order}
                    onViewReceipt={handleViewReceipt}
                    onCancelOrder={(order) => {
                      setOrderToDelete(order);
                      setShowDeleteModal(true);
                    }}
                  />
                ))}
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-col items-center gap-4 py-6 mt-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      const newPage = Math.max(1, currentPage - 1);
                      setCurrentPage(newPage);
                      fetchOrders(newPage, pageSize);
                    }}
                    disabled={currentPage === 1 || loading}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <FaChevronLeft className="text-sm" />
                    Previous
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Page</span>
                    <input
                      type="number"
                      min="1"
                      value={currentPage}
                      onChange={(e) => {
                        const page = Math.max(1, parseInt(e.target.value) || 1);
                        setCurrentPage(page);
                        fetchOrders(page, pageSize);
                      }}
                      className="w-16 px-2 py-1 border rounded text-center text-sm"
                    />
                    <span className="text-sm text-gray-700">
                      of {Math.ceil(totalOrderCount / pageSize) || 1}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      const newPage = currentPage + 1;
                      setCurrentPage(newPage);
                      fetchOrders(newPage, pageSize);
                    }}
                    disabled={!hasMoreOrders || loading}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Next
                    <FaChevronRight className="text-sm" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Show:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      const newSize = parseInt(e.target.value);
                      setPageSize(newSize);
                      setCurrentPage(1);
                      fetchOrders(1, newSize);
                    }}
                    className="px-3 py-1 border rounded text-sm"
                  >
                    <option value="10">10 per page</option>
                    <option value="20">20 per page</option>
                    <option value="50">50 per page</option>
                    <option value="100">100 per page</option>
                  </select>
                  <span className="text-sm text-gray-700">
                    • Total orders: {totalOrderCount}
                  </span>
                </div>

                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                    Loading more orders...
                  </div>
                )}

                {hasMoreOrders && !isLoadingMore && (
                  <button
                    onClick={loadMoreOrders}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Load More Orders
                  </button>
                )}
              </div>
            </>
          )
        ) : (
          <div className="flex justify-center items-center py-8">
            <div className="text-center bg-white rounded-lg p-6">
              <FaReceipt className="mx-auto text-gray-400 text-2xl mb-2" />
              <p className="text-gray-500 text-sm">
                {searchQuery || dateFilter !== "all"
                  ? "No orders found matching your criteria"
                  : orders.length === 0
                  ? "No orders available"
                  : "No orders match the current filter"}
              </p>
              {(searchQuery || dateFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setDateFilter("all");
                    setCustomDateRange({ startDate: null, endDate: null });
                  }}
                  className="text-[#025cca] text-xs mt-2 hover:underline"
                >
                  Clear all filters
                </button>
              )}
              {orders.length === 0 && (
                <button
                  onClick={refreshOrders}
                  className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Load Orders
                </button>
              )}
            </div>
          </div>
        )}

        {showDeleteModal && orderToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <FaTrash className="text-red-600 text-xl" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Cancel Order
              </h3>
              <p className="text-gray-600 text-sm text-center mb-4">
                Are you sure you want to cancel order #
                <span className="font-mono font-semibold">
                  {orderToDelete._id?.slice(-8) || "N/A"}
                </span>
                ? This will mark the order as cancelled and remove it from sales
                totals.
              </p>

              <div className="bg-blue-50 p-3 rounded-lg mb-3">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Cancelling as:</span>{" "}
                  {user.name} ({user.role})
                </p>
                {user.role?.toLowerCase() === "cashier" && (
                  <p className="text-xs text-blue-600 mt-1">
                    Note: You can only cancel orders that you created
                  </p>
                )}
              </div>

              {orderToDelete.customerDetails?.name && (
                <div className="bg-gray-50 p-3 rounded-lg mb-6">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Customer:</span>{" "}
                    {orderToDelete.customerDetails.name}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Amount:</span>{" "}
                    {formatCurrency(calculateTotalAmount(orderToDelete))}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Date:</span>{" "}
                    {formatDate(
                      orderToDelete.createdAt || orderToDelete.orderDate
                    )}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Created by:</span>{" "}
                    {getUserDisplayName(orderToDelete)}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  disabled={isCancelling}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={confirmCancel}
                  disabled={isCancelling}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCancelling ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Cancelling...
                    </>
                  ) : (
                    "Cancel Order"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {showScrollButton && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-24 md:bottom-6 right-4 sm:right-6 bg-[#025cca] text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all z-20"
          >
            <FaArrowUp />
          </button>
        )}
      </div>

      {showInvoice && selectedOrder && (
        <Invoice orderInfo={selectedOrder} setShowInvoice={setShowInvoice} />
      )}

      <div className="fixed bottom-0 left-0 right-0 md:relative">
        <BottomNav />
      </div>
    </section>
  );
};

export default Orders;
