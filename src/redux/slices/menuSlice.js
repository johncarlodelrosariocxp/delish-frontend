import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../https";

// Async thunks for API calls
export const fetchMenuItems = createAsyncThunk(
  "menu/fetchMenuItems",
  async (section = null, { rejectWithValue }) => {
    try {
      const params = section ? { section } : {};
      const response = await api.get("/menu", { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch menu items"
      );
    }
  }
);

export const fetchMenuSections = createAsyncThunk(
  "menu/fetchMenuSections",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/menu/sections");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch menu sections"
      );
    }
  }
);

export const fetchPopularItems = createAsyncThunk(
  "menu/fetchPopularItems",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/menu", { params: { popular: "true" } });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch popular items"
      );
    }
  }
);

export const createMenuItem = createAsyncThunk(
  "menu/createMenuItem",
  async (menuData, { rejectWithValue }) => {
    try {
      const formData = new FormData();

      // Append all form data
      Object.keys(menuData).forEach((key) => {
        if (key === "variants") {
          formData.append(key, JSON.stringify(menuData[key]));
        } else if (key === "image" && menuData[key]) {
          formData.append(key, menuData[key]);
        } else {
          formData.append(key, menuData[key]);
        }
      });

      const response = await api.post("/menu", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create menu item"
      );
    }
  }
);

export const updateMenuItem = createAsyncThunk(
  "menu/updateMenuItem",
  async ({ id, ...menuData }, { rejectWithValue }) => {
    try {
      const formData = new FormData();

      // Append all form data
      Object.keys(menuData).forEach((key) => {
        if (key === "variants") {
          formData.append(key, JSON.stringify(menuData[key]));
        } else if (key === "image" && menuData[key]) {
          formData.append(key, menuData[key]);
        } else {
          formData.append(key, menuData[key]);
        }
      });

      const response = await api.put(`/menu/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update menu item"
      );
    }
  }
);

export const deleteMenuItem = createAsyncThunk(
  "menu/deleteMenuItem",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/menu/${id}`);
      return id; // Return the ID to remove from state
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete menu item"
      );
    }
  }
);

export const toggleMenuItemStatus = createAsyncThunk(
  "menu/toggleMenuItemStatus",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/menu/${id}/toggle`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to toggle menu item status"
      );
    }
  }
);

// Initial state
const initialState = {
  items: [],
  sections: [],
  popularItems: [],
  loading: false,
  error: null,
  success: null,
  currentSection: null,
};

const menuSlice = createSlice({
  name: "menu",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = null;
    },
    setCurrentSection: (state, action) => {
      state.currentSection = action.payload;
    },
    clearMenuData: (state) => {
      state.items = [];
      state.sections = [];
      state.popularItems = [];
      state.currentSection = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch menu items
      .addCase(fetchMenuItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMenuItems.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.error = null;
      })
      .addCase(fetchMenuItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.items = [];
      })

      // Fetch menu sections
      .addCase(fetchMenuSections.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMenuSections.fulfilled, (state, action) => {
        state.loading = false;
        state.sections = action.payload;
        state.error = null;
      })
      .addCase(fetchMenuSections.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.sections = [];
      })

      // Fetch popular items
      .addCase(fetchPopularItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPopularItems.fulfilled, (state, action) => {
        state.loading = false;
        state.popularItems = action.payload;
        state.error = null;
      })
      .addCase(fetchPopularItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.popularItems = [];
      })

      // Create menu item
      .addCase(createMenuItem.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(createMenuItem.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
        state.success = "Menu item created successfully";
        state.error = null;
      })
      .addCase(createMenuItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = null;
      })

      // Update menu item
      .addCase(updateMenuItem.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(updateMenuItem.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(
          (item) => item._id === action.payload._id
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }

        // Also update in popular items if exists
        const popularIndex = state.popularItems.findIndex(
          (item) => item._id === action.payload._id
        );
        if (popularIndex !== -1) {
          state.popularItems[popularIndex] = action.payload;
        }

        state.success = "Menu item updated successfully";
        state.error = null;
      })
      .addCase(updateMenuItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = null;
      })

      // Delete menu item
      .addCase(deleteMenuItem.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(deleteMenuItem.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => item._id !== action.payload);
        state.popularItems = state.popularItems.filter(
          (item) => item._id !== action.payload
        );
        state.success = "Menu item deleted successfully";
        state.error = null;
      })
      .addCase(deleteMenuItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = null;
      })

      // Toggle menu item status
      .addCase(toggleMenuItemStatus.fulfilled, (state, action) => {
        const index = state.items.findIndex(
          (item) => item._id === action.payload._id
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }

        const popularIndex = state.popularItems.findIndex(
          (item) => item._id === action.payload._id
        );
        if (popularIndex !== -1) {
          state.popularItems[popularIndex] = action.payload;
        }

        state.success = "Menu item status updated successfully";
      })
      .addCase(toggleMenuItemStatus.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

// Export actions
export const { clearError, clearSuccess, setCurrentSection, clearMenuData } =
  menuSlice.actions;

// Selectors
export const selectMenuItems = (state) => state.menu.items;
export const selectMenuSections = (state) => state.menu.sections;
export const selectPopularItems = (state) => state.menu.popularItems;
export const selectMenuLoading = (state) => state.menu.loading;
export const selectMenuError = (state) => state.menu.error;
export const selectMenuSuccess = (state) => state.menu.success;
export const selectCurrentSection = (state) => state.menu.currentSection;

// Selector to get items by section
export const selectItemsBySection = (section) => (state) => {
  return state.menu.items.filter((item) => item.section === section);
};

// Selector to get item by ID
export const selectMenuItemById = (id) => (state) => {
  return state.menu.items.find((item) => item._id === id);
};

export default menuSlice.reducer;
