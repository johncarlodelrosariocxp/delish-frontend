import { useState, useEffect } from "react";
import { useSelector } from "react-redux";

const Greetings = () => {
  const userData = useSelector((state) => state.user);
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return `${months[date.getMonth()]} ${String(date.getDate()).padStart(
      2,
      "0"
    )}, ${date.getFullYear()}`;
  };

  const formatTime = (date) =>
    `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 sm:px-6 lg:px-8 mt-3 sm:mt-4 lg:mt-5 text-black">
      <div className="mb-3 sm:mb-0">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold tracking-wide">
          Good Morning, {userData.name || "TEST USER"}
        </h1>
        <p className="text-xs sm:text-sm">
          Give your best services for customers 😀
        </p>
        <div className="mt-2">
          <h2 className="text-sm sm:text-base font-medium">
            Welcome, {userData.name}!
            <span className="text-xs text-gray-500 ml-2">
              {userData.role === "admin"
                ? "Viewing all store sales performance and orders"
                : "Viewing your personal sales performance and order history"}
            </span>
          </h2>
        </div>
      </div>
      <div className="self-end sm:self-auto">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-wide w-[110px] sm:w-[120px] lg:w-[130px]">
          {formatTime(dateTime)}
        </h1>
        <p className="text-xs sm:text-sm">{formatDate(dateTime)}</p>
      </div>
    </div>
  );
};

export default Greetings;
