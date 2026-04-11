// Currency formatting utility — forces 2 decimal places
export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumber(amount: number): string {
  return amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
