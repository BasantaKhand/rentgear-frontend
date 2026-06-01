import { createContext, useState, useEffect } from 'react';

// eslint-disable-next-line react-refresh/only-export-components
export const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem('cart');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  // Placeholder: add an item to the cart
  const addToCart = (item) => {
    setItems((prev) => [...prev, item]);
  };

  // Placeholder: remove an item by id
  const removeFromCart = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Placeholder: update rental dates for an item
  const updateDates = (id, startDate, endDate) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, startDate, endDate } : it))
    );
  };

  // Placeholder: clear the cart
  const clearCart = () => setItems([]);

  // Placeholder: compute total price
  const getTotal = () => {
    return items.reduce((sum, it) => sum + (it.price || 0), 0);
  };

  const value = {
    items,
    addToCart,
    removeFromCart,
    updateDates,
    clearCart,
    getTotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
