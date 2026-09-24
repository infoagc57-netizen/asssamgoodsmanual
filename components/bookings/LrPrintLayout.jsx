"use client";

import Code128Barcode from "./LrPrintBarcode";
import LrUpiQr from "./LrUpiQr";
import { TRANSPORTER_ID } from "@/lib/constants";

const LR_COPIES = [
  { type: "CONSIGNOR", color: "#071B34", label: "CONSIGNOR COPY" },
  { type: "CONSIGNEE", color: "#F97316", label: "CONSIGNEE COPY" },
  { type: "DRIVER", color: "#374151", label: "DRIVER COPY" },
  { type: "OFFICE", color: "#6B7280", label: "OFFICE COPY" },
];

/** Portrait A4: 2 copies per page (Consignor+Consignee, Driver+Office) */
const LR_PRINT_PAGES = [
  [LR_COPIES[0], LR_COPIES[1]],
  [LR_COPIES[2], LR_COPIES[3]],
];

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

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

function numberToWords(amount) {
  const value = Math.round((Number(amount) || 0) * 100) / 100;
  const rupees = Math.floor(value);
  const paise = Math.round((value - rupees) * 100);
  const rupeeWords = integerToWords(rupees);
  const paiseWords = paise ? integerToWords(paise) : "Zero";
  return `Rupees ${rupeeWords} and ${paiseWords} Paise Only`;
}

function amt(value) {
  return Number(value || 0).toFixed(2);
}

const LR_TERMS_ITEMS = [
  "Goods carried at owner's risk. Carrier not responsible for leakage, breakage, or damage in transit.",
  "Subject to Panchkula (Haryana) jurisdiction only.",
  "Goods are booked at actual weight or volumetric weight, whichever is higher.",
  "No claim will be entertained unless made in writing within 15 days from the date of booking.",
  "Booking is subject to the terms printed on this Lorry Receipt. Delivery will be given only against original LR.",
  "Consignee must verify contents and condition of goods at the time of delivery. No claim after delivery.",
];

function LRCopy({
  copy,
  lrNumber,
  form,
  paymentLabel,
  deliveryTypeLabel = "DOOR DELIVERY",
  handlingTypeLabel = "FM PICKUP",
  actualWeight,
  chargedWeight,
  volumetricWeight,
  cubicFeet,
  cbm,
  chargedByVolumetricWeight,
  builtyCharge,
  toPayBuiltyCharge,
  codHandlingFee,
  grandTotal,
  compute,
  printText,
  codAmount,
}) {
  const charges = {
    freight: compute("freight"),
    hamali: compute("hamali"),
    doorDelivery: compute("doorDelivery"),
    localCartageCharges: compute("localCartageCharges"),
    localCartage: compute("localCartageCharges"),
    builtyCharge,
    otherCharges: compute("otherCharges"),
    fmChargeAmount: Number(compute("fmChargeAmount")) || 0,
  };

  const fareLineSubtotal = (
    Number(charges.freight)
    + Number(charges.fmChargeAmount)
    + Number(charges.hamali)
    + Number(charges.doorDelivery)
    + Number(charges.localCartageCharges || charges.localCartage)
    + Number(charges.builtyCharge)
    + Number(charges.otherCharges)
  );

  const storedGrandTotal = Number(grandTotal) || 0;
  const grandTotalNum = storedGrandTotal > 0 ? storedGrandTotal : fareLineSubtotal;
  const subtotal = fareLineSubtotal;

  return (
    <article className="lr-copy">
      {Number(form.codAmount) > 0 && (
        <div className="lr-watermark" aria-hidden="true">SELF</div>
      )}
      <div className="lr-copy-fit">
      <div className="lr-copy-inner">
      <header className="lr-h-company">
        <div className="lr-h-logo">
          <img src="/brand/agc-logo.jpg" alt="" className="lr-logo-img" onError={(e) => { e.currentTarget.src = "/logo.svg"; }} />
          <div className="lr-h-brand-text">
            <strong className="lr-company-name">ASSAM GOODS CARRIER</strong>
            <span className="lr-tagline">A UNIT OF SD ENTERPRISES</span>
          </div>
        </div>
        <div className="lr-h-details">
          <p>Head Office: PLOT NO. 5A IND AREA PHASE 2 PANCHKULA, Panchkula, Haryana - 134113</p>
          <p>Ph: 8847428801 • info@assamgoodscarrier.com</p>
          <p>www.assamgoodscarrier.com • GSTIN: 06HNAPM3923G1Z3</p>
          <p>TRANSPORTER ID: {TRANSPORTER_ID}</p>
        </div>
      </header>

      <div className="lr-h-title">
        <div className="lr-h-title-left">
          <span className="lr-copy-badge" style={{ backgroundColor: copy.color }}>{copy.label}</span>
          <h1>LORRY RECEIPT / BILTY</h1>
          <div className="lr-title-pills">
            <span className="lr-payment-pill">{paymentLabel}</span>
            <span className={`lr-delivery-pill ${deliveryTypeLabel.includes("GODOWN") ? "lr-delivery-pill-godown" : "lr-delivery-pill-door"}`}>
              {deliveryTypeLabel}
            </span>
            <span className={`lr-handling-pill ${handlingTypeLabel.includes("SELF") ? "lr-handling-pill-selfdrop" : "lr-handling-pill-fm"}`}>
              {handlingTypeLabel}
            </span>
          </div>
        </div>
        <div className="lr-h-title-datetime">
          <div className="lr-datetime-block">
            <span><b>Date</b>{printText(form.bookingDate)}</span>
            <span><b>Time</b>{printText(form.bookingTime)}</span>
          </div>
        </div>
        <div className="lr-h-title-lr">
          <div className="lr-lr-block">
            <span className="lr-label">LR NO.</span>
            <strong>{lrNumber}</strong>
            <Code128Barcode value={lrNumber} />
          </div>
        </div>
        <LrUpiQr lrNumber={lrNumber} amount={grandTotalNum} size={120} compact />
      </div>

      <div className={`lr-route-row${form.deliveryType === "godown" ? " lr-route-row-godown" : ""}`}>
        <span><b>Booking Branch</b>{printText(form.bookingBranch)}</span>
        <span><b>Delivery Branch</b>{printText(form.deliveryBranch)}</span>
        <span><b>Delivery At</b>{printText(form.deliveryAt)}</span>
      </div>
      {form.deliveryType === "godown" && (
        <div className="lr-godown-block-top">
          <div className="lr-godown-block-top-title">GODOWN DELIVERY DETAILS</div>
          <div className="lr-godown-block-top-body">
            <div className="lr-godown-block-top-row">
              <span className="lr-godown-block-top-key">Address:</span>
              <span className="lr-godown-block-top-val">{form.godownAddress || form.deliveryAt || "—"}</span>
            </div>
            <div className="lr-godown-block-top-row">
              <span className="lr-godown-block-top-key">Mobile:</span>
              <span className="lr-godown-block-top-val">{form.godownMobile || "—"}</span>
            </div>
          </div>
        </div>
      )}

      <div className="lr-parties">
        <div className="lr-party">
          <h2>Consignor</h2>
          <p><b>Name</b><span>{printText(form.consignorName)}</span></p>
          <p><b>Mobile</b><span>{printText(form.consignorMobile)}</span></p>
          <p><b>GST</b><span>{printText(form.consignorGst)}</span></p>
          <p className="lr-party-address"><b>Address</b><span>{printText(form.consignorAddress)}</span></p>
        </div>
        <div className="lr-party">
          <h2>Consignee</h2>
          <p><b>Name</b><span>{printText(form.consigneeName)}</span></p>
          <p><b>Mobile</b><span>{printText(form.consigneeMobile)}</span></p>
          <p><b>{form.consigneeIdType === "PAN" ? "PAN" : form.consigneeIdType === "Aadhaar" ? "Aadhaar" : "GST"}</b><span>{printText(form.consigneeIdNumber || form.consigneeGst)}</span></p>
          <p className="lr-party-address"><b>Address</b><span>{printText(form.consigneeAddress)}</span></p>
        </div>
      </div>

      <div className="lr-main-duo">
        <div className="lr-main-left">
          <table className="lr-table lr-goods-table">
            <thead>
              <tr>
                <th>Articles</th>
                <th>Pkg Type</th>
                <th>Pkgs</th>
                <th>Pvt Mark</th>
                <th>Invoice</th>
                <th>E-Way</th>
                <th>Risk</th>
                <th>Decl. Value</th>
                <th>COD</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{printText(form.articles)}</td>
                <td>{printText(form.packageType)}</td>
                <td>{printText(form.noOfPackages)}</td>
                <td>{printText(form.privateMark)}</td>
                <td>{printText(form.invoiceNumber)}</td>
                <td>{printText(form.ewayBillNumber)}</td>
                <td>{printText(form.riskType).replace("_risk", "")}</td>
                <td>{money(form.declaredValue)}</td>
                <td>{codAmount > 0 ? money(codAmount) : "Prepaid"}</td>
              </tr>
            </tbody>
          </table>

          <table className="lr-table lr-weight-table">
            <thead>
              <tr>
                <th>Actual Wt (KG)</th>
                <th>Charged Wt (KG)</th>
                <th>Volumetric (KG)</th>
                <th>L × W × H</th>
                <th>Unit</th>
                <th>Pieces</th>
                <th>Cu.Ft</th>
                <th>CBM</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{actualWeight.toFixed(2)}</td>
                <td>{chargedWeight.toFixed(2)}</td>
                <td>{volumetricWeight.toFixed(2)}</td>
                <td>{printText(form.dimensionLength, "0")} × {printText(form.dimensionWidth, "0")} × {printText(form.dimensionHeight, "0")}</td>
                <td>{String(form.dimensionUnit || "").toUpperCase()}</td>
                <td>{printText(form.dimensionPieces, "1")}</td>
                <td>{cubicFeet.toFixed(2)}</td>
                <td>{cbm.toFixed(4)}</td>
              </tr>
            </tbody>
          </table>
          <p className="lr-charge-note">
            Charged by {chargedByVolumetricWeight ? "Volumetric Weight" : "Actual Weight"}
          </p>
          <div className="lr-tc-fill">
            <div className="lr-tc-title">TERMS & CONDITIONS</div>
            <ol className="lr-tc-list">
              {LR_TERMS_ITEMS.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </div>
        </div>

        <div className="lr-main-right">
          <section className="lr-section lr-fare-section">
            <div className="lr-section-title">5. FARE / CHARGES BREAKUP</div>
            <table className="lr-fare-tbl">
              <thead>
                <tr>
                  <th className="col-sn">SN</th>
                  <th className="col-part">PARTICULARS</th>
                  <th className="col-amt">AMOUNT (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="col-sn">1</td>
                  <td>Freight</td>
                  <td className="col-amt">{amt(charges.freight)}</td>
                </tr>
                <tr>
                  <td className="col-sn">2</td>
                  <td>FM Charges</td>
                  <td className="col-amt">{amt(charges.fmChargeAmount)}</td>
                </tr>
                <tr>
                  <td className="col-sn">3</td>
                  <td>Hamali</td>
                  <td className="col-amt">{amt(charges.hamali)}</td>
                </tr>
                <tr>
                  <td className="col-sn">4</td>
                  <td>Door Delivery</td>
                  <td className="col-amt">{amt(charges.doorDelivery)}</td>
                </tr>
                <tr>
                  <td className="col-sn">5</td>
                  <td>Local Cartage Charges</td>
                  <td className="col-amt">{amt(charges.localCartageCharges || charges.localCartage)}</td>
                </tr>
                <tr>
                  <td className="col-sn">6</td>
                  <td>Builty Charge</td>
                  <td className="col-amt">{amt(charges.builtyCharge)}</td>
                </tr>
                <tr>
                  <td className="col-sn">7</td>
                  <td>Other Charges</td>
                  <td className="col-amt">{amt(charges.otherCharges)}</td>
                </tr>
                <tr className="row-subtotal">
                  <td colSpan={2}>SUB TOTAL</td>
                  <td className="col-amt">{amt(subtotal)}</td>
                </tr>
                <tr className="row-grand">
                  <td colSpan={2}>GRAND TOTAL</td>
                  <td className="col-amt">₹ {amt(grandTotalNum)}</td>
                </tr>
              </tbody>
            </table>

            <div className="lr-grand-banner" aria-label="Grand total">
              <div className="lr-grand-banner-head">
                <span className="lr-grand-banner-label">TOTAL AMOUNT</span>
                <span className="lr-grand-banner-amount">₹ {amt(grandTotalNum)}</span>
              </div>
              <div className="lr-grand-banner-words">{numberToWords(grandTotalNum)}</div>
            </div>

            <div className="lr-pay-stamp-row lr-pay-stamp-row--solo">
              <div className="lr-stamp-box">
                <div className="lr-stamp-label">RECEIVER&apos;S STAMP &amp; SIGNATURE</div>
                <div className="lr-stamp-space" />
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer className="lr-copy-footer">
        <div className="lr-footer-duo">
          <div className="lr-tc-block" aria-label="Terms and conditions">
            {LR_TERMS_ITEMS.map((line, index) => (
              <p key={line} className="lr-tc-line">{`${index + 1}. ${line}`}</p>
            ))}
          </div>
          <div className="lr-signatures">
          <div className="lr-signature-slot">
            <div className="lr-signature-pad" />
            <span className="lr-signature-label">Booking Clerk Signature</span>
          </div>
          <div className="lr-signature-slot">
            <div className="lr-signature-pad" />
            <span className="lr-signature-label">Receiver Signature</span>
          </div>
          <div className="lr-signature-slot">
            <div className="lr-signature-pad" />
            <span className="lr-signature-label">Customer Signature</span>
          </div>
          </div>
        </div>
      </footer>
      </div>
      </div>
    </article>
  );
}

export default function LrPrintLayout(props) {
  const { lrNumber, form, goods } = props;
  const codAmount = Number(props.form.codAmount) || 0;
  const copyProps = { ...props, codAmount };
  const packageCount = Math.max(0, Math.floor(Number(goods?.packages || form?.noOfPackages || 1)));

  return (
    <section className="lr-print-sheet" aria-label="Assam Goods Carrier LR print view">
      <div className="lr-print-container lr-print-container--portrait-dual">
        {LR_PRINT_PAGES.map((pageCopies) => (
          <div key={pageCopies.map((c) => c.type).join("-")} className="lr-print-page">
            <LRCopy copy={pageCopies[0]} {...copyProps} />
            <div className="lr-cut-line" aria-hidden="true">
              <span className="lr-cut-line-icon">✂</span>
              <span>Cut along dashed line</span>
            </div>
            <LRCopy copy={pageCopies[1]} {...copyProps} />
          </div>
        ))}
      </div>

      {packageCount > 0 && (
        <section className="lr-sticker-sheet" aria-label="Package stickers">
          {Array.from({ length: packageCount }).map((_, i) => (
            <div key={`sticker-${i}`} className="lr-sticker">
              <div className="lr-sticker-header">
                <img
                  src="/brand/agc-logo.jpg"
                  alt=""
                  className="lr-sticker-logo"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <span className="lr-sticker-brand">ASSAM GOODS CARRIER</span>
                <span className="lr-sticker-tag">A UNIT OF SD ENTERPRISES</span>
              </div>

              <div className="lr-sticker-lr">
                <span className="lr-sticker-lr-label">LR NO.</span>
                <span className="lr-sticker-lr-value">{lrNumber}</span>
              </div>

              <div className="lr-sticker-footer">
                <span>Ph: 8847428801</span>
                <span>www.assamgoodscarrier.com</span>
                <span>GSTIN: 06HNAPM3923G1Z3</span>
              </div>
            </div>
          ))}
        </section>
      )}
    </section>
  );
}
