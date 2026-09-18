"use client";

import JsBarcode from "jsbarcode";
import { useEffect, useRef } from "react";

export default function Code128Barcode({ value }) {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (!barcodeRef.current || !value) return;
    JsBarcode(barcodeRef.current, value, {
      format: "CODE128",
      displayValue: false,
      height: 32,
      width: 1.6,
      margin: 0,
      background: "#ffffff",
      lineColor: "#000000",
    });
  }, [value]);

  return (
    <div className="lr-barcode-box" aria-hidden="true">
      <svg ref={barcodeRef} />
    </div>
  );
}
