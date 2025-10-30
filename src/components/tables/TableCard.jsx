import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setCustomer, updateTable } from "../../redux/slices/customerSlice";
import { getAvatarName, getBgColor } from "../../utils";
import { FaLongArrowAltRight } from "react-icons/fa";
import Modal from "../shared/Modal";

const TableCard = ({ id, name, status, initials, seats }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const tables = useSelector((state) => state.customer.tables);
  const tableState = Array.isArray(tables)
    ? tables.find((t) => t.tableId === id)
    : null;
  const currentStatus = tableState?.status || status || "Available";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [guestCount, setGuestCount] = useState(1);

  const handleBookClick = () => {
    if (!id) {
      alert("⚠️ Table ID is missing!");
      return;
    }
    if (currentStatus === "Booked") return;
    setIsModalOpen(true);
  };

  const handleCreateOrder = () => {
    const finalName = customerName.trim() || "Guest";
    const finalPhone = phone.trim() || "N/A";
    const finalGuests = guestCount || 1;

    dispatch(
      setCustomer({
        name: finalName,
        phone: finalPhone,
        guests: finalGuests,
      })
    );

    dispatch(
      updateTable({
        table: {
          tableId: id,
          tableNo: name,
          status: "Booked",
        },
      })
    );

    setIsModalOpen(false);
    navigate("/menu");
  };

  const increment = () => setGuestCount((prev) => prev + 1);
  const decrement = () => setGuestCount((prev) => (prev > 1 ? prev - 1 : 1));
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="w-full h-full bg-white p-4 sm:p-5 rounded-xl border border-[#e0e0e0] shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[#1f1f1f] text-base sm:text-lg font-semibold flex items-center gap-1">
          Table <FaLongArrowAltRight className="text-[#666]" /> {name}
        </h1>
        <p
          className={`px-2 py-1 rounded-lg text-xs sm:text-sm font-medium ${
            currentStatus === "Booked"
              ? "text-green-700 bg-[#e6f4ec]"
              : "text-[#664a04] bg-[#fff4d6]"
          }`}
        >
          {currentStatus}
        </p>
      </div>

      {/* Avatar */}
      <div className="flex items-center justify-center mt-6 mb-6">
        <h1
          className="text-white rounded-full p-5 text-lg sm:text-xl"
          style={{ backgroundColor: initials ? getBgColor(initials) : "#999" }}
        >
          {getAvatarName(initials) || "N/A"}
        </h1>
      </div>

      {/* Footer and Buttons */}
      <div className="flex flex-col space-y-2">
        <p className="text-[#666] text-xs text-center">
          Seats: <span className="text-[#1f1f1f] font-semibold">{seats}</span>
        </p>

        {currentStatus === "Available" && (
          <button
            onClick={handleBookClick}
            className="w-full px-4 py-3 rounded-lg font-semibold text-sm bg-blue-600 text-white shadow hover:bg-blue-700"
          >
            Dine In / Select
          </button>
        )}
      </div>

      {/* Modal Form */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title="Create Order">
        <div>
          <label className="block text-gray-300 mb-2 text-sm font-medium">
            Customer Name
          </label>
          <div className="flex items-center rounded-lg p-3 px-4 bg-[#1f1f1f]">
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
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

export default TableCard;
