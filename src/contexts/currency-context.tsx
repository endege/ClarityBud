
// src/contexts/currency-context.tsx
'use client';

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { currencies, type Currency } from '@/lib/currency-utils';
import { getSetting, setSetting } from '@/app/actions/settings.actions';

interface CurrencyContextType {
  selectedCurrency: string;
  setSelectedCurrency: Dispatch<SetStateAction<string>>;
  selectedCurrencyDetails: Currency | undefined;
  isLoadingCurrency: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const DEFAULT_CURRENCY = 'EUR'; // Fallback default

// Helper function to safely parse currency from a stored string
function safeParseStoredCurrency(storedValue: string | null): string | null {
  if (storedValue === null) return null;
  try {
    // Attempt to parse as JSON. If it's a JSON string like "\"USD\"", it will parse to "USD".
    const parsed = JSON.parse(storedValue);
    if (typeof parsed === 'string' && currencies.some(c => c.value === parsed)) {
      return parsed;
    }
    // If parsing resulted in something other than a known currency string, it's unexpected or invalid.
    return null;
  } catch (e) {
    // If JSON.parse fails, it's likely 'storedValue' is already a plain currency code like "USD".
    // Validate if 'storedValue' is one of the known currency codes.
    if (currencies.some(c => c.value === storedValue)) {
      return storedValue;
    }
    return null;
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [selectedCurrencyState, setSelectedCurrencyState] = useState<string>(DEFAULT_CURRENCY);
  const [isLoadingCurrency, setIsLoadingCurrency] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const loadPersistedCurrency = async () => {
      setIsLoadingCurrency(true);
      try {
        const dbValue = await getSetting('selectedCurrency');
        let currencyCodeToSet: string | null = null;

        if (dbValue) {
          currencyCodeToSet = safeParseStoredCurrency(dbValue);
          if (currencyCodeToSet && typeof window !== 'undefined') {
            // Ensure localStorage is in sync with DB, properly stringified.
            localStorage.setItem('selectedCurrency', JSON.stringify(currencyCodeToSet));
          }
        } else if (typeof window !== 'undefined') {
          const lsValue = localStorage.getItem('selectedCurrency');
          currencyCodeToSet = safeParseStoredCurrency(lsValue);
          if (currencyCodeToSet) {
            // Save to DB if not there, properly stringified.
            await setSetting('selectedCurrency', JSON.stringify(currencyCodeToSet));
          }
        }

        if (currencyCodeToSet) {
          setSelectedCurrencyState(currencyCodeToSet);
        } else {
          // Default if nothing found or parsing failed to yield a valid currency
          setSelectedCurrencyState(DEFAULT_CURRENCY);
          const defaultCurrencyJsonString = JSON.stringify(DEFAULT_CURRENCY);
          if (typeof window !== 'undefined') {
            localStorage.setItem('selectedCurrency', defaultCurrencyJsonString);
          }
          await setSetting('selectedCurrency', defaultCurrencyJsonString);
        }
      } catch (error) {
        console.error("Failed to load currency setting, defaulting:", error);
        setSelectedCurrencyState(DEFAULT_CURRENCY);
         if (typeof window !== 'undefined') {
            localStorage.setItem('selectedCurrency', JSON.stringify(DEFAULT_CURRENCY));
         }
      } finally {
        setIsLoadingCurrency(false);
      }
    };
    loadPersistedCurrency();
  }, []); // Runs once on mount

  const handleSetSelectedCurrency: Dispatch<SetStateAction<string>> = (valueOrFn) => {
    const newValue = typeof valueOrFn === 'function' ? valueOrFn(selectedCurrencyState) : valueOrFn;
    setSelectedCurrencyState(newValue);
    if (isMounted) { // Ensure this runs only client-side after mount
      const jsonStringNewValue = JSON.stringify(newValue);
      localStorage.setItem('selectedCurrency', jsonStringNewValue);
      setSetting('selectedCurrency', jsonStringNewValue).catch(err => console.error("Failed to save currency to DB:", err));
    }
  };
  
  const selectedCurrencyDetails = currencies.find(c => c.value === selectedCurrencyState);

  if (!isMounted && typeof window !== 'undefined') {
    const lsValue = localStorage.getItem('selectedCurrency');
    const currencyFromLs = safeParseStoredCurrency(lsValue);
    // This block attempts to sync state if localStorage has a value different from initial state,
    // before the main useEffect hydration.
    if (currencyFromLs && currencyFromLs !== selectedCurrencyState) {
        setSelectedCurrencyState(currencyFromLs);
    }
  }
  
  const contextValue = {
    selectedCurrency: selectedCurrencyState,
    setSelectedCurrency: handleSetSelectedCurrency,
    selectedCurrencyDetails,
    isLoadingCurrency,
  };

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

