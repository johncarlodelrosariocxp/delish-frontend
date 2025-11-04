import React, { useState } from "react";
import { FaHome } from "react-icons/fa";
import { MdOutlineReorder } from "react-icons/md";
import { BiSolidDish } from "react-icons/bi";
import { useNavigate, useLocation } from "react-router-dom";
import Modal from "./Modal";
import { useDispatch } from "react-redux";
import { setCustomer } from "../../redux/slices/customerSlice";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guestCount, setGuestCount] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    // Reset form when modal closes
    setGuestCount(1);
    setName("");
    setPhone("");
  };

  const increment = () => {
    if (guestCount >= 6) return;
    setGuestCount((prev) => prev + 1);
  };

  const decrement = () => {
    if (guestCount <= 1) return;
    setGuestCount((prev) => prev - 1);
  };

  const isActive = (path) => location.pathname === path;

  // ✅ Navigate directly to MENU page with customer data - SAME STRUCTURE AS TABLE CARD
  const handleCreateOrder = () => {
    // Use provided name or default to "Guest" - SAME AS TABLE CARD
    const finalName = name.trim() || "Guest";
    const finalPhone = phone.trim() || "N/A";
    const finalGuests = guestCount || 1;

    // Dispatch customer data to Redux store with SAME STRUCTURE as TableCard
    dispatch(
      setCustomer({
        name: finalName, // SAME PROPERTY NAME AS TABLE CARD
        phone: finalPhone, // SAME PROPERTY NAME AS TABLE CARD
        guests: finalGuests, // SAME PROPERTY NAME AS TABLE CARD
      })
    );

    // Navigate to MENU page
    navigate("/menu");
    closeModal();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-500 p-2 h-16 flex justify-around z-50">
      {/* Home */}
      <button
        onClick={() => navigate("/")}
        className={`flex items-center justify-center font-bold ${
          isActive("/")
            ? "text-white bg-gray-600"
            : "text-gray-200 hover:text-white"
        } w-[300px] rounded-[20px] transition-all`}
      >
        <FaHome className="inline mr-2" size={20} /> <p>Home</p>
      </button>

      {/* Orders */}
      <button
        onClick={() => navigate("/orders")}
        className={`flex items-center justify-center font-bold ${
          isActive("/orders")
            ? "text-white bg-gray-600"
            : "text-gray-200 hover:text-white"
        } w-[300px] rounded-[20px] transition-all`}
      >
        <MdOutlineReorder className="inline mr-2" size={20} /> <p>Orders</p>
      </button>

      {/* Floating Action Button - ALWAYS ENABLED NOW */}
      <button
        onClick={openModal}
        className="absolute bottom-6 bg-[#F6B100] text-white rounded-full p-4 shadow-[0_0_15px_rgba(246,177,0,0.6)] hover:shadow-[0_0_20px_rgba(246,177,0,0.8)] transition-all"
      >
        <BiSolidDish size={40} />
      </button>

      {/* Modal - SAME DESIGN AS TABLE CARD MODAL */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title="Create Order">
        <div>
          <label className="block text-gray-300 mb-2 text-sm font-medium">
            Customer Name
          </label>
          <div className="flex items-center rounded-lg p-3 px-4 bg-[#1f1f1f]">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              placeholder="Enter customer name"
              className="bg-transparent flex-1 text-white focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-gray-300 mb-2 mt-3 text-sm font-medium">
            Customer Phone
          </label>
          <div className="flex items-center rounded-lg p-3 px-4 bg-[#1f1f1f]">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="number"
              placeholder="+63-9999999999"
              className="bg-transparent flex-1 text-white focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block mb-2 mt-3 text-sm font-medium text-gray-300">
            Guest
          </label>
          <div className="flex items-center justify-between bg-[#1f1f1f] px-4 py-3 rounded-lg">
            <button onClick={decrement} className="text-yellow-500 text-2xl">
              &minus;
            </button>
            <span className="text-white">{guestCount} Person</span>
            <button onClick={increment} className="text-yellow-500 text-2xl">
              &#43;
            </button>
          </div>
        </div>
        <button
          onClick={handleCreateOrder}
          className="w-full bg-[#F6B100] text-white rounded-lg py-3 mt-8 hover:bg-yellow-600 transition-all"
        >
          Create Order
        </button>
      </Modal>
    </div>
  );
};

export default BottomNav;
