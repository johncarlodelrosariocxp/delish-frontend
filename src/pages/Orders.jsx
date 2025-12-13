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
  FaFilter,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaSync,
  FaExclamationTriangle,
  FaFileExcel,
  FaFileCsv,
  FaDownload,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getOrders, getAdminOrders, updateOrderStatus } from "../https";
import BottomNav from "../components/shared/BottomNav";
import BackButton from "../components/shared/BackButton";
import Invoice from "../components/invoice/Invoice";

const Orders = () => {
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
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    totalPages: 1,
    totalItems: 0,
    hasMore: true,
  });
  const [isFetchingAll, setIsFetchingAll] = useState(false);
  const [allOrdersFetched, setAllOrdersFetched] = useState([]);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState("excel"); // 'excel' or 'csv'

  const scrollRef = useRef(null);
  const datePickerRef = useRef(null);
  const observerRef = useRef(null);
  const downloadMenuRef = useRef(null);

  const user = useSelector((state) => state.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    document.title = "POS | Orders";

    // Close date picker when clicking outside
    const handleClickOutside = (event) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target)
      ) {
        setShowDatePicker(false);
      }
    };

    // Close download menu when clicking outside
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

  // Function to fetch ALL orders from the database using existing APIs
  const fetchAllOrdersFromDatabase = useCallback(async () => {
    try {
      setIsLoadingAll(true);
      console.log("🔄 Starting to fetch ALL orders from database...");

      let allOrders = [];
      let currentPage = 1;
      let hasMorePages = true;
      const limit = 100; // Fetch 100 orders per request

      // For admins, use getAdminOrders API with pagination
      if (user.role?.toLowerCase() === "admin") {
        console.log("🛠️ Using admin API to fetch all orders");

        while (hasMorePages) {
          console.log(`📄 Fetching page ${currentPage}...`);

          let response;
          try {
            response = await getAdminOrders();
          } catch (error) {
            console.log(
              `⚠️ Error on page ${currentPage}, trying without params:`,
              error
            );
            // Try without params if the API doesn't support them
            response = await getAdminOrders();
          }

          if (!response || !response.data) {
            throw new Error("Invalid response from server");
          }

          // Extract orders based on response structure
          const ordersArray = extractOrdersFromResponse(response.data);

          if (ordersArray.length > 0) {
            allOrders = [...allOrders, ...ordersArray];
            console.log(
              `✅ Fetched ${ordersArray.length} orders from page ${currentPage}`
            );

            // If we got fewer orders than the limit, we've reached the end
            if (ordersArray.length < limit) {
              hasMorePages = false;
            } else {
              currentPage++;
            }
          } else {
            // No more orders
            hasMorePages = false;
          }

          // Safety limit to prevent infinite loops
          if (currentPage > 10) {
            console.warn("⚠️ Safety limit reached: stopped after 10 pages");
            break;
          }
        }
      } else {
        // For regular users - try to get all pages
        console.log("👤 Using user API to fetch all orders");
        let response;
        try {
          response = await getOrders();
        } catch (error) {
          console.log("⚠️ Error fetching user orders:", error);
          throw error;
        }

        if (!response || !response.data) {
          throw new Error("Invalid response from server");
        }

        const ordersArray = extractOrdersFromResponse(response.data);
        allOrders = ordersArray;
      }

      console.log(
        `✅ Successfully fetched ALL ${allOrders.length} orders from database`
      );
      return allOrders;
    } catch (error) {
      console.error("❌ Error fetching all orders:", error);

      // Show user-friendly error message
      let errorMessage = "Failed to load orders. Please try again.";

      if (error.message.includes("401") || error.response?.status === 401) {
        errorMessage = "Session expired. Please login again.";
        setTimeout(() => navigate("/auth"), 2000);
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to view orders.";
      } else if (!navigator.onLine) {
        errorMessage = "You are offline. Please check your connection.";
      }

      enqueueSnackbar(errorMessage, {
        variant: "error",
      });

      throw error;
    } finally {
      setIsLoadingAll(false);
    }
  }, [user.role, navigate]);

  // Helper function to extract orders from API response
  const extractOrdersFromResponse = (data) => {
    if (!data) return [];

    console.log("📦 Extracting orders from response:", typeof data);

    // Try different possible response structures
    if (Array.isArray(data)) {
      console.log("✅ Response is an array, returning directly");
      return data.filter((order) => order && typeof order === "object");
    }

    if (data.data && Array.isArray(data.data)) {
      console.log("✅ Found orders in data.data array");
      return data.data.filter((order) => order && typeof order === "object");
    }

    if (data.orders && Array.isArray(data.orders)) {
      console.log("✅ Found orders in data.orders array");
      return data.orders.filter((order) => order && typeof order === "object");
    }

    if (data.result && Array.isArray(data.result)) {
      console.log("✅ Found orders in data.result array");
      return data.result.filter((order) => order && typeof order === "object");
    }

    if (data.items && Array.isArray(data.items)) {
      console.log("✅ Found orders in data.items array");
      return data.items.filter((order) => order && typeof order === "object");
    }

    if (data.docs && Array.isArray(data.docs)) {
      console.log("✅ Found orders in data.docs array");
      return data.docs.filter((order) => order && typeof order === "object");
    }

    // Check if any property is an array of orders
    const arrayProperties = Object.values(data).filter((value) =>
      Array.isArray(value)
    );
    if (arrayProperties.length > 0) {
      console.log("✅ Found array in response properties");
      // Find the array that contains order-like objects
      const ordersArray = arrayProperties.find(
        (arr) => arr.length > 0 && arr[0] && typeof arr[0] === "object"
      );
      if (ordersArray) {
        return ordersArray.filter(
          (order) => order && typeof order === "object"
        );
      }
    }

    console.warn(
      "⚠️ Could not find orders array in response structure, returning empty array"
    );
    return [];
  };

  // Main query to fetch orders
  const {
    data: resData,
    isError,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["orders", user.role],
    queryFn: async () => {
      try {
        console.log("📋 Fetching orders...", {
          role: user.role,
        });

        let response;

        if (user.role?.toLowerCase() === "admin") {
          console.log("🛠️ Calling getAdminOrders API");
          response = await getAdminOrders();
        } else {
          console.log("👤 Calling getOrders API for user");
          response = await getOrders();
        }

        console.log("✅ API Response received:", {
          status: response?.status,
          hasData: !!response?.data,
        });

        if (!response) {
          throw new Error("No response from server");
        }

        if (response.status !== 200 && response.status !== 201) {
          throw new Error(`API returned status ${response.status}`);
        }

        // Extract orders from response
        const ordersArray = extractOrdersFromResponse(response.data);

        // Update pagination info
        setPagination((prev) => ({
          ...prev,
          totalItems: ordersArray.length,
          hasMore: false, // Assuming single page if API doesn't support pagination
        }));

        return {
          orders: ordersArray,
          rawData: response.data,
        };
      } catch (error) {
        console.error("❌ Error fetching orders:", error);

        // Show specific error messages
        if (error.response?.status === 401) {
          enqueueSnackbar("Session expired. Please login again.", {
            variant: "error",
          });
          setTimeout(() => navigate("/auth"), 2000);
        } else if (error.response?.status === 403) {
          enqueueSnackbar("You don't have permission to view orders.", {
            variant: "error",
          });
        } else if (error.response?.status === 404) {
          enqueueSnackbar("Orders endpoint not found.", {
            variant: "error",
          });
        } else if (!navigator.onLine) {
          enqueueSnackbar("You are offline. Please check your connection.", {
            variant: "warning",
          });
        } else {
          enqueueSnackbar("Failed to fetch orders. Please try again.", {
            variant: "error",
          });
        }

        throw error;
      }
    },
    placeholderData: keepPreviousData,
    retry: 3, // Retry failed requests 3 times
    enabled: !!user?.token, // Only fetch if user is authenticated
  });

  // Function to load ALL orders at once
  const handleFetchAllOrders = async () => {
    try {
      setIsFetchingAll(true);
      const allOrders = await fetchAllOrdersFromDatabase();
      setAllOrdersFetched(allOrders);

      enqueueSnackbar(
        `Successfully loaded ${allOrders.length} orders from database`,
        {
          variant: "success",
        }
      );
    } catch (error) {
      console.error("Failed to fetch all orders:", error);
    } finally {
      setIsFetchingAll(false);
    }
  };

  // Reset to show paginated view
  const handleResetPagination = () => {
    setAllOrdersFetched([]);
    refetch(); // Refetch the normal query
  };

  // Check if user can cancel an order
  const canUserCancelOrder = (order) => {
    // Check user role and permissions
    const userRole = user.role?.toLowerCase();

    // Admin can cancel any order
    if (userRole === "admin") return true;

    // Cashier can cancel orders they created
    if (userRole === "cashier") {
      // Check if the current user is the creator of this order
      const orderCashierId = order.cashierId || order.user?._id || order.userId;
      const currentUserId = user._id || user.id;

      // If order has cashier/user ID, check if it matches current user
      if (orderCashierId && currentUserId) {
        return orderCashierId === currentUserId;
      }

      // If no IDs available, check by name (fallback)
      const orderCashierName = getUserDisplayName(order);
      const currentUserName = user.name;

      return orderCashierName === currentUserName;
    }

    return false;
  };

  // FIXED: Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId) => {
      try {
        console.log("🗑️ Cancelling order:", orderId);
        if (!orderId) {
          throw new Error("Order ID is required");
        }

        const response = await updateOrderStatus({
          orderId,
          orderStatus: "cancelled",
        });

        console.log("✅ Cancel response:", response);

        if (!response || response.status !== 200) {
          throw new Error("Failed to cancel order");
        }

        return response.data;
      } catch (error) {
        console.error("❌ Cancel order error:", error);
        throw error;
      }
    },
    onSuccess: (data, orderId) => {
      console.log("✅ Order cancelled successfully:", orderId);

      // Invalidate and refetch orders query
      queryClient.invalidateQueries({ queryKey: ["orders", user.role] });

      // Also update allOrdersFetched if it exists
      if (allOrdersFetched.length > 0) {
        setAllOrdersFetched((prev) =>
          prev.map((order) =>
            order._id === orderId
              ? { ...order, orderStatus: "cancelled" }
              : order
          )
        );
      }

      // Close delete modal
      setShowDeleteModal(false);
      setOrderToDelete(null);

      // Show success message
      enqueueSnackbar("Order cancelled successfully!", {
        variant: "success",
      });
    },
    onError: (error) => {
      console.error("❌ Cancel order error:", error);

      let errorMessage = "Failed to cancel order. Please try again.";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      enqueueSnackbar(errorMessage, {
        variant: "error",
      });
    },
  });

  // Get status configuration based on order status
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

  // FIXED: Proper data extraction from query response
  const orders = React.useMemo(() => {
    try {
      // Use allOrdersFetched if available, otherwise use paginated data
      if (allOrdersFetched.length > 0) {
        console.log(
          `📊 Using ${allOrdersFetched.length} orders from allOrdersFetched`
        );
        return allOrdersFetched;
      }

      if (!resData) {
        console.log("📦 No response data available");
        return [];
      }

      console.log("📦 Raw response data type:", typeof resData);

      // Extract orders from the response structure
      let ordersArray = [];

      if (resData.orders && Array.isArray(resData.orders)) {
        ordersArray = resData.orders;
      } else if (Array.isArray(resData)) {
        ordersArray = resData;
      } else if (resData.data && Array.isArray(resData.data)) {
        ordersArray = resData.data;
      } else if (resData.rawData) {
        // Extract from rawData if it exists
        ordersArray = extractOrdersFromResponse(resData.rawData);
      }

      console.log("📦 Extracted orders:", ordersArray.length);

      // Ensure we have valid orders
      const validOrders = ordersArray.filter(
        (order) => order && typeof order === "object"
      );

      return validOrders;
    } catch (error) {
      console.error("❌ Error processing orders data:", error);
      return [];
    }
  }, [resData, allOrdersFetched]);

  // Combine all orders from all pages for display
  const allOrdersCombined = React.useMemo(() => {
    // If we have fetched all orders, use that
    if (allOrdersFetched.length > 0) {
      return allOrdersFetched;
    }

    // Otherwise use the orders from query
    return orders || [];
  }, [orders, allOrdersFetched]);

  useEffect(() => {
    if (isError && error) {
      console.error("❌ Query error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
    }
  }, [isError, error]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollTop = scrollRef.current.scrollTop;
      setShowScrollButton(scrollTop > 300);
    }
  };

  // Generate calendar days for the current month
  const generateCalendarDays = () => {
    const days = [];
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const startingDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    // Previous month days
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

    // Current month days
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

    // Next month days
    const totalCells = 42; // 6 weeks * 7 days
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

  const filterByDateRange = (order) => {
    if (!order) return false;

    let orderDate;

    // Try different possible date fields
    if (order.createdAt) {
      orderDate = new Date(order.createdAt);
    } else if (order.orderDate) {
      orderDate = new Date(order.orderDate);
    } else if (order.date) {
      orderDate = new Date(order.date);
    } else if (order.timestamp) {
      orderDate = new Date(order.timestamp);
    } else {
      return false; // No date available
    }

    if (isNaN(orderDate.getTime())) return false;

    // Reset time for date comparison
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
  };

  // Calculate totals when orders or filters change
  useEffect(() => {
    if (!allOrdersCombined || !Array.isArray(allOrdersCombined)) {
      setTotalSales(0);
      setTotalOrders(0);
      return;
    }

    const filteredByDate = allOrdersCombined.filter(filterByDateRange);

    // Calculate total sales
    const salesTotal = filteredByDate.reduce((sum, order) => {
      if (!order) return sum;
      // Don't include cancelled orders in sales total
      if (order.orderStatus?.toLowerCase() === "cancelled") return sum;
      const amount =
        order.totalAmount || order.bills?.totalWithTax || order.amount || 0;
      return sum + (Number(amount) || 0);
    }, 0);

    setTotalSales(salesTotal);

    // Calculate total orders count
    const ordersCount = filteredByDate.length;
    setTotalOrders(ordersCount);
  }, [allOrdersCombined, dateFilter, customDateRange]);

  const filteredOrders = React.useMemo(() => {
    try {
      if (!Array.isArray(allOrdersCombined)) {
        console.log("❌ Orders is not an array:", allOrdersCombined);
        return [];
      }

      const filtered = allOrdersCombined.filter((order) => {
        if (!order) return false;

        const dateMatch = filterByDateRange(order);

        // Search in multiple fields
        const searchLower = searchQuery.toLowerCase();
        const orderId = order._id || order.id || "";
        const customerName =
          order.customerDetails?.name || order.customerName || "";
        const cashierName =
          order.cashier || order.user?.name || order.userDetails?.name || "";
        const orderStatus = order.orderStatus || "completed";

        const searchMatch =
          orderId.toLowerCase().includes(searchLower) ||
          customerName.toLowerCase().includes(searchLower) ||
          cashierName.toLowerCase().includes(searchLower) ||
          orderStatus.toLowerCase().includes(searchLower);

        return dateMatch && searchMatch;
      });

      console.log("🔍 Filtered orders:", filtered.length);
      return filtered;
    } catch (error) {
      console.error("❌ Error filtering orders:", error);
      return [];
    }
  }, [allOrdersCombined, searchQuery, dateFilter, customDateRange]);

  const calculateTotalAmount = (order) => {
    if (!order) return 0;

    // Try different possible amount fields
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
      return date.toISOString().split("T")[0]; // YYYY-MM-DD format
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

  const handleCancelOrder = (order) => {
    setOrderToDelete(order);
    setShowDeleteModal(true);
  };

  const confirmCancel = () => {
    if (orderToDelete && orderToDelete._id) {
      console.log("🔄 Cancelling order:", orderToDelete._id);
      cancelOrderMutation.mutate(orderToDelete._id);
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

    // Check other possible discount fields
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

  const handleDateSelect = (date) => {
    if (selectingStartDate) {
      setCustomDateRange({
        startDate: date,
        endDate: customDateRange.endDate,
      });
      setSelectingStartDate(false);
    } else {
      // If end date is before start date, swap them
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

  // Function to prepare data for export
  const prepareExportData = () => {
    const dataToExport = filteredOrders.map((order) => {
      const totalAmount = calculateTotalAmount(order);
      const itemsCount = getItemsCount(order);
      const discountType = getDiscountType(order);
      const hasDisc = hasDiscount(order);

      // Get discount amount if available
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

      // Calculate subtotal (amount before discount)
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

    // Add summary row
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
      Subtotal: filteredOrders
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
      "Discount Amount": filteredOrders
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
      "Total Amount": filteredOrders
        .reduce((sum, order) => {
          return sum + calculateTotalAmount(order);
        }, 0)
        .toFixed(2),
      "Items Count": filteredOrders.reduce(
        (sum, order) => sum + getItemsCount(order),
        0
      ),
      "Payment Method": "",
      "Payment Status": "",
      "Tax Amount": filteredOrders
        .reduce((sum, order) => sum + (order.bills?.taxAmount || 0), 0)
        .toFixed(2),
      "Service Charge": filteredOrders
        .reduce((sum, order) => sum + (order.bills?.serviceCharge || 0), 0)
        .toFixed(2),
      Notes: `Total Orders: ${filteredOrders.length}`,
      "Created At": "",
      "Updated At": "",
    };

    return [...dataToExport, summaryRow];
  };

  // Function to export to CSV
  const exportToCSV = () => {
    try {
      setIsDownloading(true);
      const data = prepareExportData();

      if (data.length === 0) {
        enqueueSnackbar("No data to export", { variant: "warning" });
        return;
      }

      // Define headers
      const headers = Object.keys(data[0]);

      // Create CSV content
      let csvContent = headers.join(",") + "\n";

      data.forEach((row) => {
        const rowData = headers.map((header) => {
          const cell = row[header];
          // Wrap in quotes if contains comma, quotes, or newline
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

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Generate filename with date range
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

  // Function to export to Excel (using CSV with .xls extension for simplicity)
  const exportToExcel = () => {
    try {
      setIsDownloading(true);
      const data = prepareExportData();

      if (data.length === 0) {
        enqueueSnackbar("No data to export", { variant: "warning" });
        return;
      }

      // Define headers
      const headers = Object.keys(data[0]);

      // Create CSV content (Excel can open CSV)
      let csvContent = headers.join(",") + "\n";

      data.forEach((row) => {
        const rowData = headers.map((header) => {
          const cell = row[header];
          // Wrap in quotes if contains comma, quotes, or newline
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

      // Create blob and download with .xls extension
      const blob = new Blob([csvContent], { type: "application/vnd.ms-excel" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Generate filename with date range
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

  // Handle download based on selected format
  const handleDownload = () => {
    if (filteredOrders.length === 0) {
      enqueueSnackbar("No orders to export", { variant: "warning" });
      return;
    }

    if (downloadFormat === "csv") {
      exportToCSV();
    } else {
      exportToExcel();
    }
  };

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

    // Check if current user can cancel this order
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
          {/* Show "You" indicator if current user created this order */}
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

  return (
    <section className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 min-h-screen flex flex-col relative pb-20 md:pb-6">
      <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-30">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-6 py-4 gap-4">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-[#333333] text-xl sm:text-2xl font-bold tracking-wider">
              Orders
            </h1>
            {user.role?.toLowerCase() !== "admin" && (
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                Your Orders
              </span>
            )}
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
            {/* Cancel Permission Badge */}
            <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
              {user.role?.toLowerCase() === "admin"
                ? "Can Cancel All Orders"
                : "Can Cancel Your Orders"}
            </span>
          </div>

          {/* Download and Fetch Buttons */}
          <div className="flex flex-wrap gap-2 md:gap-4 items-center">
            {/* Download Button with Dropdown */}
            <div className="relative" ref={downloadMenuRef}>
              <button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                disabled={filteredOrders.length === 0 || isDownloading}
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

              {/* Download Menu Dropdown */}
              {showDownloadMenu && (
                <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-40 w-64">
                  <div className="p-3 border-b border-gray-200">
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">
                      Export Options
                    </h4>
                    <p className="text-xs text-gray-500">
                      Exporting {filteredOrders.length} orders
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
                          Export {downloadFormat === "excel"
                            ? "Excel"
                            : "CSV"}{" "}
                          File
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleFetchAllOrders}
              disabled={isFetchingAll || isLoadingAll}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Fetch ALL orders from database"
            >
              {isFetchingAll || isLoadingAll ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Loading All...
                </>
              ) : (
                <>
                  <FaSync className="text-sm" />
                  Fetch All Orders
                </>
              )}
            </button>

            <button
              onClick={navigateToDashboard}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <FaTachometerAlt className="text-sm" />
              Dashboard
            </button>
          </div>
        </div>

        {/* Connection Status & Stats */}
        {isError && (
          <div className="px-4 pb-2">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm flex items-center gap-2">
                <FaExclamationTriangle />
                Unable to connect to server. Please check:
              </p>
              <ul className="text-red-600 text-xs mt-1 ml-4 list-disc">
                <li>Backend server is running</li>
                <li>Network connection is active</li>
                <li>You are logged in</li>
              </ul>
            </div>
          </div>
        )}

        {/* Fetch Status */}
        {allOrdersFetched.length > 0 && (
          <div className="px-4 pb-2">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-700 text-sm">
                ✅ Successfully loaded{" "}
                <strong>{allOrdersFetched.length}</strong> orders from database
                <button
                  onClick={handleResetPagination}
                  className="ml-3 text-blue-600 hover:text-blue-800 text-xs underline"
                >
                  Switch back to paginated view
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Date Filter Section */}
        <div className="px-4 pb-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            {/* Date Range Selector */}
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
                  }}
                />
              </div>

              {/* Date Range Display */}
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

              {/* Calendar Popup */}
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

            {/* Quick Date Filters */}
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

            {/* Stats Section */}
            <div className="flex flex-wrap gap-2 md:gap-4">
              <span className="text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
                Orders: <span className="text-lg">{totalOrders}</span>
              </span>
              <span className="text-xs sm:text-sm font-semibold text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                Sales: {formatCurrency(totalSales)}
              </span>

              {/* Database Stats */}
              {allOrdersFetched.length > 0 && (
                <span className="text-xs sm:text-sm font-semibold text-purple-700 bg-purple-50 px-3 py-2 rounded-lg">
                  DB Total:{" "}
                  <span className="text-lg">{allOrdersFetched.length}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
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
        className="flex-1 overflow-y-auto px-4 py-4 mb-16 md:mb-6"
      >
        {/* Orders Summary */}
        <div className="mb-4 text-sm text-gray-600">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              Showing {filteredOrders.length} of {allOrdersCombined.length}{" "}
              total orders
              {allOrdersFetched.length > 0 && (
                <span className="text-green-600 font-medium ml-2">
                  (Full database loaded)
                </span>
              )}
            </div>

            {/* Export Info */}
            {filteredOrders.length > 0 && (
              <button
                onClick={() => setShowDownloadMenu(true)}
                className="text-green-600 hover:text-green-800 text-xs font-medium flex items-center gap-1"
              >
                <FaDownload className="text-xs" />
                Export {filteredOrders.length} orders
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
          {isLoading ? (
            <div className="col-span-full flex justify-center items-center py-8">
              <div className="text-center bg-white rounded-lg p-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
                <p className="text-gray-500 text-sm">Loading orders...</p>
              </div>
            </div>
          ) : isError ? (
            <div className="col-span-full flex justify-center items-center py-8">
              <div className="text-center bg-white rounded-lg p-6 max-w-md">
                <FaReceipt className="mx-auto text-red-400 text-2xl mb-2" />
                <p className="text-gray-500 text-sm mb-3">
                  Failed to load orders. Please check:
                </p>
                <ul className="text-gray-600 text-xs text-left mb-4 ml-4 list-disc">
                  <li>Backend server is running on port 5000</li>
                  <li>You are properly authenticated</li>
                  <li>Network connection is active</li>
                </ul>
                <button
                  onClick={() => refetch()}
                  className="text-[#025cca] text-xs hover:underline mr-4"
                >
                  Try Again
                </button>
                <button
                  onClick={handleFetchAllOrders}
                  className="text-green-600 text-xs hover:underline"
                >
                  Try Fetch All Directly
                </button>
              </div>
            </div>
          ) : filteredOrders.length > 0 ? (
            <>
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order._id || Math.random().toString()}
                  order={order}
                  onViewReceipt={handleViewReceipt}
                  onCancelOrder={handleCancelOrder}
                />
              ))}
            </>
          ) : (
            <div className="col-span-full flex justify-center items-center py-8">
              <div className="text-center bg-white rounded-lg p-6">
                <FaReceipt className="mx-auto text-gray-400 text-2xl mb-2" />
                <p className="text-gray-500 text-sm">
                  {searchQuery || dateFilter !== "today"
                    ? "No orders found matching your criteria"
                    : user.role?.toLowerCase() === "admin"
                    ? "No orders available"
                    : "You haven't placed any orders yet"}
                </p>
                {(searchQuery || dateFilter !== "today") && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setDateFilter("today");
                      setCustomDateRange({ startDate: null, endDate: null });
                    }}
                    className="text-[#025cca] text-xs mt-2 hover:underline"
                  >
                    Clear all filters
                  </button>
                )}

                {allOrdersCombined.length === 0 && (
                  <button
                    onClick={handleFetchAllOrders}
                    className="mt-4 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 mx-auto"
                  >
                    <FaSync className="text-xs" />
                    Fetch Orders from Database
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

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

              {/* Show user information */}
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
                  disabled={cancelOrderMutation.isPending}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={confirmCancel}
                  disabled={cancelOrderMutation.isPending}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cancelOrderMutation.isPending ? (
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
