export const CURRENCY_SYMBOL = '₹';

export function formatCurrency(value) {
  const amount = Number(value);
  return `${CURRENCY_SYMBOL}${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}`;
}
