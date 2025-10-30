// src/hooks/useLoadData.js
import { useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getUserData } from "../https"; // your API service
import { removeUser, setUser } from "../redux/slices/userSlice";

const useLoadData = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await getUserData();
        console.log("Fetched user:", data);

        const { _id, name, email, phone, role } = data.data;
        dispatch(setUser({ _id, name, email, phone, role }));
      } catch (error) {
        console.error("Auth check failed:", error);
        dispatch(removeUser());
        navigate("/auth"); // ✅ correct way to redirect
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [dispatch, navigate]);

  return isLoading;
};

export default useLoadData;
