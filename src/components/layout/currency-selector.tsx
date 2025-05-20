
// src/components/layout/currency-selector.tsx
'use client';

import React from 'react';
import { useCurrency } from '@/contexts/currency-context';
import { currencies } from '@/lib/currency-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export function CurrencySelector() {
  const { selectedCurrency, setSelectedCurrency } = useCurrency();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Guard against hydration mismatch for select value
  if (!isMounted) {
    // Render a non-interactive placeholder or nothing until client-side mounted
    // This ensures the initial selectedCurrency from context (read from localStorage in useEffect)
    // doesn't mismatch a server-rendered default if there was one.
    // For this component, it might be okay to render the select disabled or with a loading state.
    // Or simply ensure it only renders client-side.
    return (
      <div className="flex flex-col gap-1">
        <Label htmlFor="currency-select" className="text-sm font-medium">Currency</Label>
        <Select disabled>
          <SelectTrigger id="currency-select" className="h-10">
            <SelectValue placeholder="Loading currency..." />
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  const handleValueChange = (value: string) => {
    setSelectedCurrency(value);
  };

  return (
    <div className="flex flex-col gap-1">
      {/* 
        The class "group-data-[collapsible=icon]:hidden" was removed from the parent div
        as this component is now intended to be used on the settings page directly,
        not dynamically hidden based on sidebar collapse state.
      */}
      <Label htmlFor="currency-select" className="text-sm font-medium">Currency</Label>
      <Select value={selectedCurrency} onValueChange={handleValueChange}>
        <SelectTrigger id="currency-select" className="h-10 bg-background hover:bg-accent/10 border-border focus:ring-ring">
          <SelectValue placeholder="Select currency" />
        </SelectTrigger>
        <SelectContent>
          {currencies.map((currency) => (
            <SelectItem key={currency.value} value={currency.value} className="text-sm">
              {currency.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
