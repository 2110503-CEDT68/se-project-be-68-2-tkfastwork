import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Reservation, CoworkingSpace } from "@/types";

interface BookingState {
  items: Reservation[];
  selectedSpace: CoworkingSpace | null;
  loading: boolean;
  error: string | null;
}

const initialState: BookingState = {
  items: [],
  selectedSpace: null,
  loading: false,
  error: null,
};

const bookingSlice = createSlice({
  name: "booking",
  initialState,
  reducers: {
    setBookings(state, action: PayloadAction<Reservation[]>) {
      state.items = action.payload;
    },
    addBooking(state, action: PayloadAction<Reservation>) {
      state.items.push(action.payload);
    },
    updateBooking(state, action: PayloadAction<Reservation>) {
      const index = state.items.findIndex(
        (item) => item._id === action.payload._id
      );
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    removeBooking(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item._id !== action.payload);
    },
    setSelectedSpace(state, action: PayloadAction<CoworkingSpace | null>) {
      state.selectedSpace = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearBookings(state) {
      state.items = [];
      state.selectedSpace = null;
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  setBookings,
  addBooking,
  updateBooking,
  removeBooking,
  setSelectedSpace,
  setLoading,
  setError,
  clearBookings,
} = bookingSlice.actions;

export default bookingSlice.reducer;
