import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { fetchMenus, fetchOrders, fetchTables } from "../https";
import {
  menus as fallbackMenus,
  orders as fallbackOrders,
  tables as fallbackTables,
} from "../constants";

export const useAppData = () => {
  const [data, setData] = useState({
    menus: [],
    orders: [],
    tables: [],
    loading: true,
    error: null,
  });

  const user = useSelector((state) => state.user);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [menuRes, orderRes, tableRes] = await Promise.all([
          fetchMenus(),
          fetchOrders(),
          fetchTables(),
        ]);

        let orders = orderRes || fallbackOrders;

        // Filter orders for regular users (non-admins) - CASE INSENSITIVE FIX
        if (user.role?.toLowerCase() !== "admin" && Array.isArray(orders)) {
          orders = orders.filter(
            (order) =>
              order.userId === user._id ||
              order.createdBy === user._id ||
              order.customerDetails?.email === user.email
          );
        }

        setData({
          menus: menuRes || fallbackMenus,
          orders: orders,
          tables: tableRes || fallbackTables,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error("Error loading data:", err);
        setData({
          menus: fallbackMenus,
          orders: fallbackOrders,
          tables: fallbackTables,
          loading: false,
          error: "Failed to load dynamic data",
        });
      }
    };

    loadData();
  }, [user._id, user.role, user.email]);

  return data;
};
