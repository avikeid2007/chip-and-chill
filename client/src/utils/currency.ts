export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
  label: string;
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: "INR", symbol: "₹", name: "Indian Rupee", label: "INR — Indian Rupee (₹ / ₨)" },
  { code: "USD", symbol: "$", name: "US Dollar", label: "USD — US Dollar ($)" },
  { code: "EUR", symbol: "€", name: "Euro", label: "EUR — Euro (€)" },
  { code: "GBP", symbol: "£", name: "British Pound", label: "GBP — British Pound (£)" },
  { code: "AED", symbol: "AED", name: "UAE Dirham", label: "AED — UAE Dirham (د.إ)" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", label: "CAD — Canadian Dollar (C$)" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", label: "AUD — Australian Dollar (A$)" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", label: "SGD — Singapore Dollar (S$)" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", label: "JPY — Japanese Yen (¥)" },
];

export const DEFAULT_CURRENCY = "INR";
export const DEFAULT_CURRENCY_SYMBOL = "₹";

export function getCurrencySymbol(code?: string | null): string {
  if (!code) return DEFAULT_CURRENCY_SYMBOL;
  const match = SUPPORTED_CURRENCIES.find(
    (c) => c.code.toUpperCase() === code.toUpperCase()
  );
  return match?.symbol || code;
}

export function formatPrice(amount?: number | null, symbol: string = DEFAULT_CURRENCY_SYMBOL): string {
  const val = amount ?? 0;
  return `${symbol}${val.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
