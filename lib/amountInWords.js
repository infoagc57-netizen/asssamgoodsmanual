const BELOW_TWENTY = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function wordsUnderThousand(num) {
  const n = Number(num) || 0;
  if (n < 20) return BELOW_TWENTY[n];
  if (n < 100) {
    const ten = Math.floor(n / 10);
    const rest = n % 10;
    return rest ? `${TENS[ten]} ${BELOW_TWENTY[rest]}` : TENS[ten];
  }
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  return rest ? `${BELOW_TWENTY[hundred]} Hundred ${wordsUnderThousand(rest)}` : `${BELOW_TWENTY[hundred]} Hundred`;
}

function integerToWords(num) {
  const n = Math.floor(Number(num) || 0);
  if (n === 0) return "Zero";
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  const parts = [];
  if (crore) parts.push(`${wordsUnderThousand(crore)} Crore`);
  if (lakh) parts.push(`${wordsUnderThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${wordsUnderThousand(thousand)} Thousand`);
  if (rest) parts.push(wordsUnderThousand(rest));
  return parts.join(" ");
}

export function amountInWords(amount) {
  const value = Math.round((Number(amount) || 0) * 100) / 100;
  const rupees = Math.floor(value);
  const paise = Math.round((value - rupees) * 100);
  const rupeeWords = integerToWords(rupees);
  const paiseWords = paise ? integerToWords(paise) : "Zero";
  return `Rupees ${rupeeWords} and ${paiseWords} Paise Only`;
}
