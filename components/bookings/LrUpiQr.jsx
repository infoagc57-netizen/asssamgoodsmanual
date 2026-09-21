"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { AGC_PAYEE_NAME, AGC_UPI_ID, buildUpiUrl } from "@/lib/upiQr";

export default function LrUpiQr({ lrNumber, amount }) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    const total = Number(amount) || 0;
    if (!lrNumber || total <= 0) {
      setDataUrl("");
      return;
    }

    const payload = buildUpiUrl({
      upiId: AGC_UPI_ID,
      payeeName: AGC_PAYEE_NAME,
      amount: total,
      note: `LR ${lrNumber}`,
    });

    QRCode.toDataURL(payload, {
      width: 128,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [lrNumber, amount]);

  if (!dataUrl) return null;

  return (
    <div className="lr-upi-qr" aria-label="UPI payment QR code">
      <div className="lr-upi-qr-title">Pay via UPI</div>
      <img src={dataUrl} alt="" className="lr-upi-qr-img" />
      <div className="lr-upi-qr-meta">
        <span className="lr-upi-qr-apps">PhonePe · GPay · Paytm</span>
        <span className="lr-upi-qr-id">{AGC_UPI_ID}</span>
        <span className="lr-upi-qr-payee">{AGC_PAYEE_NAME}</span>
      </div>
    </div>
  );
}
