function manilaDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");
  return year && month && day ? `${year}-${month}-${day}` : null;
}

export function calculateBookingNights(checkIn?: string | null, checkOut?: string | null): number | null {
  if (!checkIn || !checkOut) return null;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
  const startDate = manilaDate(checkIn);
  const endDate = manilaDate(checkOut);
  if (!startDate || !endDate) return null;
  const startDay = Date.parse(`${startDate}T00:00:00Z`);
  const endDay = Date.parse(`${endDate}T00:00:00Z`);
  return Math.max(0, Math.round((endDay - startDay) / 86_400_000));
}

export function replaceBookingDurationCharges(input: {
  currentTotal: number;
  previousExclusiveFee: number;
  nextExclusiveFee: number;
  previousDailyFunctionHall: number;
  nextDailyFunctionHall: number;
}): number {
  const result = input.currentTotal - input.previousExclusiveFee - input.previousDailyFunctionHall
    + input.nextExclusiveFee + input.nextDailyFunctionHall;
  return Math.max(0, Math.round((result + Number.EPSILON) * 100) / 100);
}

export function calculateReplacementExclusiveFee(input: {
  currentTotal: number;
  previousNights: number;
  nextNights: number;
  exclusiveDailyRate: number;
  knownOtherCharges: number;
}): number {
  const previousConfiguredFee = input.exclusiveDailyRate * input.previousNights;
  const knownExclusiveAmount = Math.max(0, input.currentTotal - input.knownOtherCharges);
  return Math.min(previousConfiguredFee, knownExclusiveAmount);
}