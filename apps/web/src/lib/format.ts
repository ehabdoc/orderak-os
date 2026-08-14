// Format integer (minor units) as a readable number with thousand separators.
export function fmtPrice(amount: number): string {
  return new Intl.NumberFormat('ar-EG').format(amount);
}

export function fmtPercent(n: number): string {
  return `${n > 0 ? '+' : ''}${n}%`;
}
