import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type BakeryManualStatus = 'auto' | 'open' | 'closed';

interface BakeryContextType {
  manualStatus: BakeryManualStatus;
  setManualStatus: (status: BakeryManualStatus) => void;
  openTime: string;
  setOpenTime: (time: string) => void;
  closeTime: string;
  setCloseTime: (time: string) => void;
  isBakeryOpen: boolean;
  productAvailability: Record<string, boolean>;
  setProductAvailability: (id: string, available: boolean) => void;
  productQuantities: Record<string, number>;
  setProductQuantity: (id: string, quantity: number) => void;
}

const BakeryContext = createContext<BakeryContextType | undefined>(undefined);

export function BakeryProvider({ children }: { children: ReactNode }) {
  const [manualStatus, setManualStatus] = useState<BakeryManualStatus>(() => {
    return (localStorage.getItem('bakery_manual_status') as BakeryManualStatus) || 'auto';
  });
  
  const [openTime, setOpenTime] = useState<string>(() => {
    return localStorage.getItem('bakery_open_time') || '06:00';
  });
  
  const [closeTime, setCloseTime] = useState<string>(() => {
    return localStorage.getItem('bakery_close_time') || '23:00';
  });

  const [productAvailability, setProductAvailabilityInternal] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem('product_availability');
    return stored ? JSON.parse(stored) : {};
  });

  const [productQuantities, setProductQuantitiesInternal] = useState<Record<string, number>>(() => {
    const stored = localStorage.getItem('product_quantities');
    return stored ? JSON.parse(stored) : { 'p5': 50, 'p6': 50 };
  });

  const [isBakeryOpen, setIsBakeryOpen] = useState<boolean>(true);

  // Re-evaluate open state 
  useEffect(() => {
    localStorage.setItem('bakery_manual_status', manualStatus);
    localStorage.setItem('bakery_open_time', openTime);
    localStorage.setItem('bakery_close_time', closeTime);

    const evaluateStatus = () => {
      if (manualStatus === 'open') {
        setIsBakeryOpen(true);
        return;
      }
      if (manualStatus === 'closed') {
        setIsBakeryOpen(false);
        return;
      }
      
      // Auto mode
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeStr = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;
      
      if (openTime <= closeTime) {
        // Normal day (e.g., 08:00 to 22:00)
        setIsBakeryOpen(currentTimeStr >= openTime && currentTimeStr <= closeTime);
      } else {
        // Spans midnight (e.g., 18:00 to 02:00)
        setIsBakeryOpen(currentTimeStr >= openTime || currentTimeStr <= closeTime);
      }
    };

    evaluateStatus();
    
    // Check every minute
    const interval = setInterval(evaluateStatus, 60000);
    return () => clearInterval(interval);
  }, [manualStatus, openTime, closeTime]);

  useEffect(() => {
    localStorage.setItem('product_availability', JSON.stringify(productAvailability));
  }, [productAvailability]);

  useEffect(() => {
    localStorage.setItem('product_quantities', JSON.stringify(productQuantities));
  }, [productQuantities]);

  const setProductAvailability = (id: string, available: boolean) => {
    setProductAvailabilityInternal(prev => ({ ...prev, [id]: available }));
  };

  const setProductQuantity = (id: string, quantity: number) => {
    setProductQuantitiesInternal(prev => ({ ...prev, [id]: Math.max(0, quantity) }));
  };

  // Listen for changes from other tabs to sync State
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'bakery_manual_status' && e.newValue) setManualStatus(e.newValue as BakeryManualStatus);
      if (e.key === 'bakery_open_time' && e.newValue) setOpenTime(e.newValue);
      if (e.key === 'bakery_close_time' && e.newValue) setCloseTime(e.newValue);
      if (e.key === 'product_availability' && e.newValue) setProductAvailabilityInternal(JSON.parse(e.newValue));
      if (e.key === 'product_quantities' && e.newValue) setProductQuantitiesInternal(JSON.parse(e.newValue));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <BakeryContext.Provider value={{
      manualStatus, setManualStatus,
      openTime, setOpenTime,
      closeTime, setCloseTime,
      isBakeryOpen,
      productAvailability, setProductAvailability,
      productQuantities, setProductQuantity
    }}>
      {children}
    </BakeryContext.Provider>
  );
}

export function useBakery() {
  const context = useContext(BakeryContext);
  if (context === undefined) {
    throw new Error('useBakery must be used within a BakeryProvider');
  }
  return context;
}
