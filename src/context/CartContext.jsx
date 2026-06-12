import { createContext, useState, useEffect } from 'react';

// eslint-disable-next-line react-refresh/only-export-components
export const CartContext = createContext(null);

const SERVICE_FEE_RATE = 0.05; // 5% of subtotal
const DEPOSIT_RATE = 0.5; // 50% of subtotal (refundable)

// Number of rental days between two dates (minimum 1 for a valid range)
function calcDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
}

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

  // Add equipment to the cart for a date range. If the item already exists,
  // its dates/price are updated instead of adding a duplicate.
  const addToCart = (equipment, startDate, endDate) => {
    const equipmentId = equipment._id || equipment.id;
    const days = calcDays(startDate, endDate);
    const price = equipment.dailyRate * days;

    setItems((prev) => {
      const existing = prev.find((it) => it.equipmentId === equipmentId);
      if (existing) {
        return prev.map((it) =>
          it.equipmentId === equipmentId
            ? { ...it, startDate, endDate, days, price }
            : it
        );
      }
      return [
        ...prev,
        { equipmentId, equipment, startDate, endDate, days, price },
      ];
    });
  };

  // Remove an item by equipmentId
  const removeFromCart = (equipmentId) => {
    setItems((prev) => prev.filter((it) => it.equipmentId !== equipmentId));
  };

  // Update dates for an item and recalculate days + price
  const updateDates = (equipmentId, startDate, endDate) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.equipmentId !== equipmentId) return it;
        const days = calcDays(startDate, endDate);
        return {
          ...it,
          startDate,
          endDate,
          days,
          price: it.equipment.dailyRate * days,
        };
      })
    );
  };

  const clearCart = () => setItems([]);

  const getSubtotal = () => items.reduce((sum, it) => sum + (it.price || 0), 0);

  const getServiceFee = () =>
    Math.round(getSubtotal() * SERVICE_FEE_RATE * 100) / 100;

  const getDeposit = () => Math.round(getSubtotal() * DEPOSIT_RATE * 100) / 100;

  const getTotal = () => getSubtotal() + getServiceFee() + getDeposit();

  const value = {
    items,
    count: items.length,
    addToCart,
    removeFromCart,
    updateDates,
    clearCart,
    getSubtotal,
    getServiceFee,
    getDeposit,
    getTotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
