import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setCustomer, updateTable } from "../../redux/slices/customerSlice";
import { getAvatarName, getBgColor } from "../../utils";
import { FaChair, FaUserFriends } from "react-icons/fa";
import { MdTableRestaurant } from "react-icons/md";
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

  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-4 border border-gray-100">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <MdTableRestaurant className="text-blue-600" />
          <h3 className="font-bold text-gray-800">Table {name}</h3>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            currentStatus === "Booked"
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {currentStatus}
        </span>
      </div>

      {/* Avatar */}
      <div className="flex justify-center my-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
          style={{
            backgroundColor: initials ? getBgColor(initials) : "#9CA3AF",
          }}
        >
          {getAvatarName(initials) || "T"}
        </div>
      </div>

      {/* Info */}
      <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <FaChair />
          <span>{seats} seats</span>
        </div>
        <div className="flex items-center gap-1">
          <FaUserFriends />
          <span>Max {seats}</span>
        </div>
      </div>

      {/* Action Button */}
      {currentStatus === "Available" && (
        <button
          onClick={handleBookClick}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors"
        >
          Book Table
        </button>
      )}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title="Book Table">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name
            </label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              type="text"
              placeholder="Enter name"
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              placeholder="+63 912 345 6789"
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Guests
            </label>
            <div className="flex items-center justify-between border border-gray-300 rounded-lg p-2">
              <button
                onClick={() =>
                  setGuestCount((prev) => (prev > 1 ? prev - 1 : 1))
                }
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100"
              >
                -
              </button>
              <span className="font-semibold">
                {guestCount} {guestCount === 1 ? "Guest" : "Guests"}
              </span>
              <button
                onClick={() => setGuestCount((prev) => prev + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100"
              >
                +
              </button>
            </div>
          </div>

          <button
            onClick={handleCreateOrder}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg mt-4"
          >
            Create Order
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default TableCard;
