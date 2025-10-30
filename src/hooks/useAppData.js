// src/hooks/useAppData.js
import { useEffect, useState } from "react";
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const [menuRes, orderRes, tableRes] = await Promise.all([
          fetchMenus(),
          fetchOrders(),
          fetchTables(),
        ]);

        setData({
          menus: menuRes || fallbackMenus,
          orders: orderRes || fallbackOrders,
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
  }, []);

  return data;
};
