import React from "react";
import { popularDishes } from "../../constants";

const PopularDishes = () => {
  return (
    <div className="mt-6 pr-6">
      <div className="bg-white text-black w-full rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.3)]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h1 className="text-lg font-semibold tracking-wide">
            Popular Dishes
          </h1>
          <a href="" className="text-[#025cca] text-sm font-semibold">
            View all
          </a>
        </div>

        <div className="overflow-y-scroll h-[680px] scrollbar-hide">
          {popularDishes.map((dish) => {
            return (
              <div
                key={dish.id}
                className="flex items-center gap-4 bg-gray-100 rounded-[15px] px-6 py-4 mt-4 mx-6"
              >
                <h1 className="text-black font-bold text-xl mr-4">
                  {dish.id < 10 ? `0${dish.id}` : dish.id}
                </h1>
                <img
                  src={dish.image}
                  alt={dish.name}
                  className="w-[50px] h-[50px] rounded-full"
                />
                <div>
                  <h1 className="text-black font-semibold tracking-wide">
                    {dish.name}
                  </h1>
                  <p className="text-sm font-semibold mt-1 text-black">
                    <span className="text-gray-500">Orders: </span>
                    {dish.numberOfOrders}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PopularDishes;
