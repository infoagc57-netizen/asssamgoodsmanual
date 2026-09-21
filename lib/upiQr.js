export function buildUpiUrl({ upiId, payeeName, amount, note }) {
  const am = Number(amount || 0).toFixed(2);
  const pn = encodeURIComponent(payeeName || "");
  const tn = encodeURIComponent(note || "");
  const pa = String(upiId || "").trim();
  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
}

export const AGC_UPI_ID = "Sdenterprises5426@sbi";
export const AGC_PAYEE_NAME = "SD Enterprises";
