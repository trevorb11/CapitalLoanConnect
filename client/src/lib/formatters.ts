/**
 * Formatting utilities for form inputs
 */

/**
 * Format phone number as (XXX) XXX-XXXX
 */
export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/**
 * Format EIN as XX-XXXXXXX
 */
export function formatEIN(value: string): string {
  const digits = value.replace(/\D/g, '');
  
  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2, 9)}`;
}

/**
 * Format currency input with commas
 */
export function formatCurrency(value: string): string {
  const digits = value.replace(/\D/g, '');
  
  if (digits.length === 0) return '';
  
  const number = parseInt(digits, 10);
  return number.toLocaleString('en-US');
}

/**
 * Parse formatted phone number to digits only
 */
export function parsePhoneNumber(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Parse formatted EIN to digits only
 */
export function parseEIN(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Parse formatted currency to number string (digits only for backend)
 */
export function parseCurrency(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Parse an object's currency fields from formatted strings to plain numbers
 */
export function normalizeCurrencyFields<T extends Record<string, any>>(
  data: T,
  currencyFields: (keyof T)[]
): T {
  const normalized = { ...data };
  
  for (const field of currencyFields) {
    if (normalized[field] && typeof normalized[field] === 'string') {
      normalized[field] = parseCurrency(normalized[field] as string) as any;
    }
  }
  
  return normalized;
}
