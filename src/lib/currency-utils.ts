
// src/lib/currency-utils.ts

export interface Currency {
  value: string; // e.g., 'USD'
  label: string; // e.g., 'USD ($)'
  locale: string; // e.g., 'en-US'
}

export const currencies: Currency[] = [
  { value: 'USD', label: 'USD ($)', locale: 'en-US' },
  { value: 'EUR', label: 'EUR (€)', locale: 'en-IE' },
  { value: 'GBP', label: 'GBP (£)', locale: 'en-GB' },
  { value: 'JPY', label: 'JPY (¥)', locale: 'ja-JP' },
  { value: 'CAD', label: 'CAD ($)', locale: 'en-CA' },
  { value: 'CNY', label: 'CNY (¥)', locale: 'zh-CN' },
  { value: 'RON', label: 'RON (L)', locale: 'ro-RO' },
];

export function formatCurrency(amount: number, currencyCode: string, locale: string): string {
  if (typeof amount !== 'number' || !isFinite(amount)) {
    // console.warn(`formatCurrency received invalid amount: ${amount} for ${currencyCode}. Returning placeholder.`);
    return 'N/A'; // Or "Invalid Amount", or `0 ${currencyCode}` if that's preferred for NaN
  }
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(amount);
  } catch (error) {
    // Fallback for invalid currency code or locale
    console.warn(`Error formatting currency ${currencyCode} with locale ${locale}:`, error);
    // Basic fallback
    const symbol = currencies.find(c => c.value === currencyCode)?.label.split(' ')[1] || currencyCode;
    // Check amount again for the fallback
    if (typeof amount !== 'number' || !isFinite(amount)) {
        return `N/A`;
    }
    return `${symbol}${amount.toFixed(2)}`;
  }
}

