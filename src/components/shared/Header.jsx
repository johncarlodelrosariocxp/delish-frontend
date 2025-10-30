// Header.jsx
import React, { useState, useEffect } from "react";
import { FaSearch, FaUserCircle, FaBell } from "react-icons/fa";
import logo from "../../assets/images/delish.jpg";
import { useDispatch, useSelector } from "react-redux";
import { IoLogOut } from "react-icons/io5";
import { useMutation } from "@tanstack/react-query";
import { logout } from "../../https";
import { removeUser } from "../../redux/slices/userSlice";
import { useNavigate } from "react-router-dom";
import { MdDashboard } from "react-icons/md";
import axios from "axios";

const Header = () => {
  const userData = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      dispatch(removeUser());
      navigate("/auth");
    },
    onError: (error) => {
      console.log(error);
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        fetchSearchResults(searchQuery);
      } else {
        setResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const fetchSearchResults = async (query) => {
    try {
      const res = await axios.get(
        `https://delish-backend-1.onrender.com/api/menu?search=${query}`
      );
      setResults(res.data.data || []);
      setIsOpen(true);
    } catch (error) {
      console.log("Search error:", error);
    }
  };

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center py-3 px-4 sm:px-6 bg-gray-500">
      {/* Logo */}
      <div
        onClick={() => navigate("/")}
        className="flex items-center gap-2 cursor-pointer"
      >
        <img src={logo} className="h-7 w-7" alt="delish logo" />
        <h1 className="text-base font-semibold text-white tracking-wide">
          DELISH
        </h1>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-[300px]">
        <div className="flex items-center gap-2 bg-gray-600 rounded-lg px-3 py-1.5 w-full">
          <FaSearch className="text-white text-sm" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            className="bg-transparent outline-none text-white w-full text-sm"
          />
        </div>

        {isOpen && results.length > 0 && (
          <div className="absolute top-10 w-full bg-gray-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
            {results.map((item) => (
              <div
                key={item._id}
                onClick={() => {
                  navigate(`/menu/${item._id}`);
                  setIsOpen(false);
                  setSearchQuery("");
                }}
                className="px-3 py-2 text-white hover:bg-gray-600 cursor-pointer border-b border-gray-500"
              >
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-gray-300">
                  ₱{item.price?.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}

        {isOpen && searchQuery && results.length === 0 && (
          <div className="absolute top-10 w-full bg-gray-700 text-center text-gray-300 py-2 rounded-lg shadow-lg">
            No items found
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-3">
          {userData.role === "Admin" && (
            <MdDashboard
              onClick={() => navigate("/dashboard")}
              className="text-white text-xl cursor-pointer"
            />
          )}
          <FaBell className="text-white text-xl cursor-pointer" />
        </div>

        <div className="flex items-center gap-3 cursor-pointer">
          <FaUserCircle className="text-white text-2xl" />
          <div className="flex flex-col items-start">
            <h1 className="text-sm text-white font-semibold tracking-wide">
              {userData.name || "TEST USER"}
            </h1>
            <p className="text-xs text-gray-300 font-medium">
              {userData.role || "Role"}
            </p>
          </div>
          <IoLogOut
            onClick={handleLogout}
            className="text-white ml-2"
            size={28}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
