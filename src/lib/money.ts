export function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(value: unknown, digits = 2) {
  return toNumber(value).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatQty(value: unknown) {
  const n = toNumber(value);
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

const ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number) {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${tens[t]}${o ? ` ${ones[o]}` : ""}`.trim();
}

function threeDigits(n: number) {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h && rest) return `${ones[h]} Hundred ${twoDigits(rest)}`;
  if (h) return `${ones[h]} Hundred`;
  return twoDigits(rest);
}

export function amountInWords(value: unknown) {
  const amount = Math.round(toNumber(value) * 100) / 100;
  if (amount === 0) return "Indian Rupees Zero Only";

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = rupees % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));

  let words = `Indian Rupees ${parts.join(" ")}`;
  if (paise) {
    words += ` and ${twoDigits(paise)} Paise`;
  }
  return `${words} Only`;
}
