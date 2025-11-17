// src/hooks/useLoadData.js
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { getUserData } from "../https";
import { removeUser, setUser } from "../redux/slices/userSlice";

// Global flag to prevent multiple simultaneous requests
let isFetching = false;

const useLoadData = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const user = useSelector((state) => state.user); // Add this to check existing user
  const abortControllerRef = useRef(null);

  useEffect(() => {
    // Skip if user data already exists or fetch is in progress
    if (user._id || isFetching) {
      setIsLoading(false);
      return;
    }

    const fetchUser = async () => {
      // Check token first
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found, skipping user fetch");
        dispatch(removeUser());
        setIsLoading(false);
        return;
      }

      isFetching = true;
      abortControllerRef.current = new AbortController();

      try {
        const { data } = await getUserData({
          signal: abortControllerRef.current.signal,
        });
        console.log("Fetched user:", data);

        const { _id, name, email, phone, role } = data.data;
        dispatch(setUser({ _id, name, email, phone, role }));
      } catch (error) {
        if (error.name === "AbortError") {
          console.log("Request aborted");
          return;
        }

        console.error("Auth check failed:", error);

        // Only navigate if this is a real auth error (not network error)
        if (error.response?.status === 401) {
          dispatch(removeUser());
          localStorage.removeItem("token"); // Clear invalid token
          navigate("/auth");
        }
      } finally {
        setIsLoading(false);
        isFetching = false;
      }
    };

    fetchUser();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [dispatch, navigate, user._id]); // Add user._id to dependencies

  return isLoading;
};

export default useLoadData;
