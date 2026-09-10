import type { Currency, Settings } from "./types";

/** Convert an amount in base currency to the display/pay currency. */
export function convertFromBase(
  amountBase: number,
  to: Currency,
  settings: Pick<Settings, "baseCurrency" | "lakPerThb">,
): number {
  if (to === settings.baseCurrency) return roundMoney(amountBase, to);

  if (settings.baseCurrency === "LAK" && to === "THB") {
    return roundMoney(amountBase / settings.lakPerThb, "THB");
  }
  if (settings.baseCurrency === "THB" && to === "LAK") {
    return roundMoney(amountBase * settings.lakPerThb, "LAK");
  }
  return roundMoney(amountBase, to);
}

/** Convert a paid amount back to base currency. */
export function convertToBase(
  amount: number,
  from: Currency,
  settings: Pick<Settings, "baseCurrency" | "lakPerThb">,
): number {
  if (from === settings.baseCurrency) return roundMoney(amount, from);

  if (settings.baseCurrency === "LAK" && from === "THB") {
    return roundMoney(amount * settings.lakPerThb, "LAK");
  }
  if (settings.baseCurrency === "THB" && from === "LAK") {
    return roundMoney(amount / settings.lakPerThb, "THB");
  }
  return roundMoney(amount, from);
}

export function roundMoney(amount: number, currency: Currency): number {
  if (currency === "THB") return Math.round(amount * 100) / 100;
  // LAK typically whole kip
  return Math.round(amount);
}

export function formatMoney(amount: number, currency: Currency): string {
  const rounded = roundMoney(amount, currency);
  if (currency === "THB") {
    return `฿${rounded.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }
  return `₭${rounded.toLocaleString("en-US")}`;
}
