import React, { useState, useEffect } from "react";
import BottomNav from "../components/shared/BottomNav";
import BackButton from "../components/shared/BackButton";
import TableCard from "../components/tables/TableCard";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getTables } from "../https";
import { enqueueSnackbar } from "notistack";

const Tables = () => {
  const [status, setStatus] = useState("all");

  useEffect(() => {
    document.title = "POS | Tables";
  }, []);

  // Fetch tables
  const { data: resData, isError } = useQuery({
    queryKey: ["tables"],
    queryFn: async () => await getTables(),
    placeholderData: keepPreviousData,
  });

  if (isError) {
    enqueueSnackbar("Something went wrong!", { variant: "error" });
  }

  // ✅ Filter tables by status
  const filteredTables = (() => {
    const allTables = resData?.data.data || [];
    if (status === "booked") {
      return allTables.filter((t) => t.status === "Booked");
    }
    if (status === "available") {
      return allTables.filter((t) => t.status === "Available");
    }
    return allTables;
  })();

  return (
    <section className="bg-white h-[calc(100vh-5rem)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 sm:px-10 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="text-[#1f1f1f] text-xl sm:text-2xl font-bold tracking-wider">
            Tables
          </h1>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center justify-around gap-2 sm:gap-4">
          <button
            onClick={() => setStatus("all")}
            className={`text-[#333] text-sm sm:text-lg ${
              status === "all" ? "bg-[#e0e0e0]" : ""
            } rounded-lg px-4 py-2 font-semibold`}
          >
            All
          </button>
          <button
            onClick={() => setStatus("booked")}
            className={`text-[#333] text-sm sm:text-lg ${
              status === "booked" ? "bg-[#e0e0e0]" : ""
            } rounded-lg px-4 py-2 font-semibold`}
          >
            Booked
          </button>
          <button
            onClick={() => setStatus("available")}
            className={`text-[#333] text-sm sm:text-lg ${
              status === "available" ? "bg-[#e0e0e0]" : ""
            } rounded-lg px-4 py-2 font-semibold`}
          >
            Available
          </button>
        </div>
      </div>

      {/* Grid Section */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 px-4 sm:px-16 py-4 h-[650px] overflow-y-scroll scrollbar-hide">
        {filteredTables.length > 0 ? (
          filteredTables.map((table) => (
            <TableCard
              key={table._id}
              id={table._id}
              name={table.tableNo}
              status={table.status}
              initials={table?.currentOrder?.customerDetails?.name || ""}
              seats={table.seats}
            />
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500 mt-10">
            No tables found.
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </section>
  );
};

export default Tables;
