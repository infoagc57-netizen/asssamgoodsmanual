import crypto from "crypto";
import QRCode from "qrcode";

export const UPI_PAYEE = {
  upiId: "sdenterprises5426@sbi",
  payeeName: "Assam Goods Carrier",
  currency: "INR",
};

export function buildUpiUri({ amount, note }) {
  const am = Number(amount || 0).toFixed(2);
  const pa = encodeURIComponent(UPI_PAYEE.upiId);
  const pn = encodeURIComponent(UPI_PAYEE.payeeName);
  const tn = encodeURIComponent(String(note || ""));
  const cu = encodeURIComponent(UPI_PAYEE.currency);
  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=${cu}&tn=${tn}`;
}

export async function generateQrDataUrl(upiUri) {
  try {
    return await QRCode.toDataURL(upiUri, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 400,
      color: {
        dark: "#071B34",
        light: "#FFFFFF",
      },
    });
  } catch (error) {
    throw new Error(
      `Failed to generate UPI QR code: ${error?.message || "Unknown error"}`,
    );
  }
}

export function generateRechargeCode() {
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `AGC-WALLET-${suffix}`;
}

export async function generateRechargePayload({ amount }) {
  const uniqueCode = generateRechargeCode();
  const upiUri = buildUpiUri({ amount, note: uniqueCode });
  const qrDataUrl = await generateQrDataUrl(upiUri);

  return {
    uniqueCode,
    upiUri,
    qrDataUrl,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  };
}
