import { createSlice } from "@reduxjs/toolkit";

const savedItems = JSON.parse(localStorage.getItem("cartItems")) || [];
const savedTotal = Number(localStorage.getItem("cartTotalAmount")) || 0;

const initialState = {
  items: savedItems,
  totalAmount: savedTotal,
};

const MAX_QUANTITY = 20;

const updateLocalStorage = (items, totalAmount) => {
  localStorage.setItem("cartItems", JSON.stringify(items));
  localStorage.setItem("cartTotalAmount", totalAmount.toString());
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart(state, action) {
      const product = action.payload;
      const existingItem = state.items.find(
        (item) => item.productID === product.productID
      );

      if (existingItem) {
        if (existingItem.quantity < MAX_QUANTITY) {
          existingItem.quantity += 1;
          state.totalAmount += product.productPrice;
        }
      } else {
        state.items.push({ ...product, quantity: 1 });
        state.totalAmount += product.productPrice;
      }

      updateLocalStorage(state.items, state.totalAmount);
    },

    updateQuantity(state, action) {
      const { productID, quantity } = action.payload;
      const itemToUpdate = state.items.find(
        (item) => item.productID === productID
      );
      if (itemToUpdate) {
        const oldQty = itemToUpdate.quantity;
        const newQty = quantity > MAX_QUANTITY ? MAX_QUANTITY : quantity;
        itemToUpdate.quantity = newQty;
        state.totalAmount += (newQty - oldQty) * itemToUpdate.productPrice;
      }

      updateLocalStorage(state.items, state.totalAmount);
    },

    removeFromCart(state, action) {
      const productId = action.payload;
      const itemToRemove = state.items.find(
        (item) => item.productID === productId
      );
      if (itemToRemove) {
        state.totalAmount -= itemToRemove.productPrice * itemToRemove.quantity;
        state.items = state.items.filter(
          (item) => item.productID !== productId
        );
      }

      updateLocalStorage(state.items, state.totalAmount);
    },
  },
});

export const { addToCart, removeFromCart, updateQuantity } = cartSlice.actions;

export const selectCartItems = (state) => state.cart.items;
export const selectCartTotalAmount = (state) => state.cart.totalAmount;

export default cartSlice.reducer;
