/** Standard night duty spell: 10 PM – 6 AM (8 hours). */
export const STANDARD_NIGHT_DUTY_HOURS = 8;

/** Extra minutes credited per hour of night duty (10 PM – 6 AM). */
export const NIGHT_DUTY_BONUS_MINUTES_PER_HOUR = 10;

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function effectiveNightDutyHours(hours: number = STANDARD_NIGHT_DUTY_HOURS): number {
  return hours + (hours * NIGHT_DUTY_BONUS_MINUTES_PER_HOUR) / 60;
}

export function dearnessAllowanceFromPercent(
  basicPay: number,
  daPercent: number,
): number {
  return roundMoney((basicPay * daPercent) / 100);
}

/** NDA per night spell: (Basic Pay + DA) / 200 */
export function calculateNdaPerNight(basicPay: number, dearnessAllowance: number): number {
  return roundMoney((basicPay + dearnessAllowance) / 200);
}

export function calculateNdaTotal(
  basicPay: number,
  dearnessAllowance: number,
  nightCount: number,
): number {
  return roundMoney(calculateNdaPerNight(basicPay, dearnessAllowance) * nightCount);
}

export function calculateNdaPerNightFromPercent(basicPay: number, daPercent: number): number {
  return calculateNdaPerNight(basicPay, dearnessAllowanceFromPercent(basicPay, daPercent));
}

export function calculateNdaTotalFromPercent(
  basicPay: number,
  daPercent: number,
  nightCount: number,
): number {
  return roundMoney(calculateNdaPerNightFromPercent(basicPay, daPercent) * nightCount);
}

/** TA for a journey: base amount at 100% × claim %. */
export function calculateTaAmount(
  taBaseAmount: number,
  claimPercent: number,
): number {
  return roundMoney((taBaseAmount * claimPercent) / 100);
}
