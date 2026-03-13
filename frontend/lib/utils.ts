export const currency = (value: number | string, code = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(Number(value));

export const progressPercent = (collected: number | string, target: number | string) => {
  const total = Number(target);
  if (total <= 0) return 0;
  return Math.min(100, Math.round((Number(collected) / total) * 100));
};
