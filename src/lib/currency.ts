/**
 * Format amount as Russian Ruble
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format currency with custom symbol
 */
export const formatRubles = (amount: number): string => {
  return `₽${new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(amount)}`;
};