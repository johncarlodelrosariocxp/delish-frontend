import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  _id: "",
  name: "",
  email: "",
  phone: "",
  role: "",
  token: "", // Add this missing field
  isAuth: false,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action) => {
      const { _id, name, phone, email, role, token } = action.payload;
      state._id = _id;
      state.name = name;
      state.phone = phone;
      state.email = email;
      state.role = role;
      state.token = token; // Set the token
      state.isAuth = true;
    },

    removeUser: (state) => {
      state._id = "";
      state.email = "";
      state.name = "";
      state.phone = "";
      state.role = "";
      state.token = ""; // Clear the token
      state.isAuth = false;
    },
  },
});

export const { setUser, removeUser } = userSlice.actions;
export default userSlice.reducer;
