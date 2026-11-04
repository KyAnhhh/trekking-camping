import { useContext } from "react";
import { BookingSocketContext } from "../context/BookingSocketContext";

export function useBookingSocket() {
  const context = useContext(BookingSocketContext);
  if (!context) {
    throw new Error("useBookingSocket must be used within a BookingSocketProvider");
  }
  return context;
}
