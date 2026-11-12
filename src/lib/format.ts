// Currency formatting utility — forces 2 decimal places
export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumber(amount: number): string {
  return amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseCalendarDate(str?: string): { year: number; month: number; day: number } | null {
  if (!str) return null;
  const trimmed = str.trim();
  // 1. Check YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return {
      year: parseInt(isoMatch[1], 10),
      month: parseInt(isoMatch[2], 10) - 1,
      day: parseInt(isoMatch[3], 10),
    };
  }
  // 2. Check MM/DD/YYYY
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (usMatch) {
    return {
      year: parseInt(usMatch[3], 10),
      month: parseInt(usMatch[1], 10) - 1,
      day: parseInt(usMatch[2], 10),
    };
  }
  // 3. Fallback
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate(),
    };
  }
  return null;
}

export function calculateCalendarDays(checkIn?: string, checkOut?: string): number {
  const pIn = parseCalendarDate(checkIn);
  const pOut = parseCalendarDate(checkOut);
  if (!pIn || !pOut) return 0;
  const utcIn = Date.UTC(pIn.year, pIn.month, pIn.day);
  const utcOut = Date.UTC(pOut.year, pOut.month, pOut.day);
  return Math.round((utcOut - utcIn) / 86400000);
}
