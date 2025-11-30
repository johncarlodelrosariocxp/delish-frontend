import React, { useEffect, useRef } from "react";
import { RiDeleteBin2Fill } from "react-icons/ri";
import { FaNotesMedical } from "react-icons/fa6";
import { useDispatch, useSelector } from "react-redux";
import { removeItemFromOrder } from "../../redux/slices/orderSlice";

const CartInfo = ({ orderId }) => {
  const orders = useSelector((state) => state.order.orders);
  const activeOrderId = useSelector((state) => state.order.activeOrderId);
  const scrollRef = useRef(null);
  const dispatch = useDispatch();

  const currentOrder =
    orders.find((order) => order.id === orderId) ||
    orders.find((order) => order.id === activeOrderId);
  const cartData = currentOrder?.items || [];

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [cartData]);

  const handleRemove = (itemId) => {
    if (window.confirm("Are you sure you want to remove this item?")) {
      dispatch(removeItemFromOrder({ orderId: currentOrder.id, itemId }));
    }
  };

  return (
    <div className="w-full px-4 py-4 sm:px-6 md:px-8">
      <h1 className="text-lg text-white font-semibold tracking-wide mb-3">
        Order Details
      </h1>

      <div
        ref={scrollRef}
        className="overflow-y-auto h-[60vh] sm:h-[65vh] md:h-[380px] scrollbar-hide space-y-3"
      >
        {cartData.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-400 text-sm text-center">
              Your cart is empty. Start adding items!
            </p>
          </div>
        ) : (
          cartData.map((item) => (
            <div
              key={item.id || `${item.name}-${item.quantity}-${item.price}`}
              className="bg-gray-900 rounded-lg px-4 py-4"
            >
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h1 className="text-gray-300 font-semibold text-sm sm:text-base">
                  {item.name}
                </h1>
                <p className="text-gray-300 font-medium text-sm">
                  x{item.quantity}
                </p>
              </div>

              <div className="flex justify-between items-center mt-3 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <RiDeleteBin2Fill
                    title="Remove Item"
                    onClick={() => handleRemove(item.id)}
                    className="text-gray-400 hover:text-red-500 transition cursor-pointer"
                    size={20}
                  />
                  <FaNotesMedical
                    title="Add Notes"
                    className="text-gray-400 hover:text-blue-400 transition cursor-pointer"
                    size={20}
                  />
                </div>
                <p className="text-white font-bold text-sm sm:text-base">
                  ₱{(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CartInfo;
