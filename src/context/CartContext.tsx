import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Product } from '../data/products';

export interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
  slicingOption?: 'sliced' | 'whole';
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity: number, notes?: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setSlicingOption: (productId: string, option: 'sliced' | 'whole') => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('bakery_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const saveToStorage = (newItems: CartItem[]) => {
    localStorage.setItem('bakery_cart', JSON.stringify(newItems));
    setItems(newItems);
  };

  const addToCart = (product: Product, quantity: number, notes: string = '') => {
    const current = [...items];
    const existing = current.find(item => item.product.id === product.id);
    let updated;
    if (existing) {
      updated = current.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + quantity, notes: notes || item.notes }
          : item
      );
    } else {
      updated = [...current, { product, quantity, notes }];
    }
    saveToStorage(updated);
  };

  const removeFromCart = (productId: string) => {
    const updated = items.filter(item => item.product.id !== productId);
    saveToStorage(updated);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const updated = items.map(item =>
      item.product.id === productId ? { ...item, quantity } : item
    );
    saveToStorage(updated);
  };

  const setSlicingOption = (productId: string, option: 'sliced' | 'whole') => {
    const updated = items.map(item =>
      item.product.id === productId ? { ...item, slicingOption: option } : item
    );
    saveToStorage(updated);
  };

  const clearCart = () => {
    localStorage.removeItem('bakery_cart');
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        setSlicingOption,
        clearCart,
        totalItems,
        totalPrice
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
