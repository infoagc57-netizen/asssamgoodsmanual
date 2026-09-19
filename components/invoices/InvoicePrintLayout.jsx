"use client";

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "-";
  }
}

export default function InvoicePrintLayout({ invoice }) {
  if (!invoice) return null;
  const lines = invoice.lines || [];
  const isIntra = invoice.taxType === "intra";

  return (
    <section className="gst-invoice-print" aria-label="Tax Invoice">
      <div className="sheet">
        <header className="inv-header">
          <div className="brand">
            <img src="/brand/agc-logo.jpg" alt="Assam Goods Carrier" className="logo-img" />
            <div>
              <strong>{invoice.supplierName || "ASSAM GOODS CARRIER"}</strong>
              <span>TAX INVOICE · {isIntra ? "INTRA-STATE" : "INTER-STATE"}</span>
            </div>
          </div>
          <div className="meta">
            <div><b>Invoice No.</b> {invoice.invoiceNumber}</div>
            <div><b>Date</b> {formatDate(invoice.invoiceDate || invoice.createdAt)}</div>
            {invoice.dueDate && <div><b>Due</b> {formatDate(invoice.dueDate)}</div>}
            <div><b>Payment</b> {String(invoice.paymentType || "TBB").toUpperCase()}</div>
          </div>
        </header>

        <div className="parties">
          <div className="party">
            <h3>Supplier</h3>
            <p><b>{invoice.supplierName}</b></p>
            <p>GSTIN: {invoice.supplierGstin}</p>
            <p>{invoice.supplierAddress}</p>
            <p>State: {invoice.supplierState} ({invoice.supplierStateCode})</p>
          </div>
          <div className="party">
            <h3>Bill To</h3>
            <p><b>{invoice.customerName}</b></p>
            <p>GSTIN: {invoice.customerGstin || "Unregistered"}</p>
            <p>{invoice.customerAddress}</p>
            <p>
              {[invoice.customerCity, invoice.customerState, invoice.customerPincode].filter(Boolean).join(", ")}
            </p>
            <p>Mobile: {invoice.customerMobile || "-"}</p>
          </div>
        </div>

        <div className="pos">
          <span><b>Place of supply:</b> {invoice.placeOfSupply || "-"}</span>
          <span><b>State code:</b> {invoice.placeOfSupplyStateCode || "-"}</span>
        </div>

        <table className="lines">
          <thead>
            <tr>
              <th>#</th>
              <th>Description / LR</th>
              <th>HSN/SAC</th>
              <th>Qty</th>
              <th>Taxable</th>
              <th>GST %</th>
              {isIntra ? (
                <>
                  <th>CGST</th>
                  <th>SGST</th>
                </>
              ) : (
                <th>IGST</th>
              )}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={line.lrNumber || index}>
                <td>{index + 1}</td>
                <td>{line.description || line.lrNumber}</td>
                <td>{line.hsnSac || "996511"}</td>
                <td>{line.quantity ?? 1} {line.unit || ""}</td>
                <td>{money(line.taxableValue)}</td>
                <td>{line.gstRate ?? 0}%</td>
                {isIntra ? (
                  <>
                    <td>{money(line.cgst)}</td>
                    <td>{money(line.sgst)}</td>
                  </>
                ) : (
                  <td>{money(line.igst)}</td>
                )}
                <td>{money(line.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="summary">
          <div className="tax-table">
            <div className="row"><span>Taxable value</span><b>{money(invoice.subTotal)}</b></div>
            {isIntra ? (
              <>
                <div className="row"><span>CGST</span><b>{money(invoice.cgstTotal)}</b></div>
                <div className="row"><span>SGST</span><b>{money(invoice.sgstTotal)}</b></div>
              </>
            ) : (
              <div className="row"><span>IGST</span><b>{money(invoice.igstTotal)}</b></div>
            )}
            {Number(invoice.roundOff) !== 0 && (
              <div className="row"><span>Round off</span><b>{money(invoice.roundOff)}</b></div>
            )}
            <div className="row grand"><span>Grand total</span><b>{money(invoice.grandTotal)}</b></div>
          </div>
        </div>

        <p className="words"><b>Amount in words:</b> {invoice.amountInWords}</p>

        {invoice.notes && <p className="notes"><b>Notes:</b> {invoice.notes}</p>}
        <p className="terms">{invoice.terms}</p>

        <footer>
          Computer generated tax invoice · {invoice.supplierName}
          {invoice.status === "Cancelled" && " · CANCELLED"}
        </footer>
      </div>

      <style jsx>{`
        .gst-invoice-print { display: none; }
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body * { visibility: hidden !important; }
          .gst-invoice-print, .gst-invoice-print * { visibility: visible !important; }
          .gst-invoice-print {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            color: #0b1f33;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 9pt;
          }
          .sheet { border: 1px solid #0b1f33; padding: 6mm; }
          .inv-header { display: flex; justify-content: space-between; gap: 6mm; border-bottom: 2px solid #0b1f33; padding-bottom: 3mm; margin-bottom: 3mm; }
          .brand { display: flex; gap: 3mm; align-items: center; }
          .logo-img { height: 14mm; width: auto; }
          .brand strong { display: block; font-size: 14pt; letter-spacing: 0.5mm; }
          .brand span { display: block; color: #f97316; font-size: 7pt; letter-spacing: 0.4mm; margin-top: 1mm; }
          .meta { text-align: right; font-size: 8.5pt; line-height: 1.5; }
          .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin-bottom: 3mm; }
          .party { border: 1px solid #0b1f33; padding: 2.5mm; }
          .party h3 { margin: 0 0 1.5mm; font-size: 7pt; letter-spacing: 0.6mm; text-transform: uppercase; }
          .party p { margin: 0.8mm 0; font-size: 8.5pt; }
          .pos { display: flex; justify-content: space-between; margin-bottom: 2mm; font-size: 8.5pt; padding: 1.5mm 2mm; background: #f8fafc; border: 1px solid #cbd5e1; }
          table.lines { width: 100%; border-collapse: collapse; margin-bottom: 3mm; }
          table.lines th, table.lines td { border: 1px solid #0b1f33; padding: 1.5mm; font-size: 7.5pt; text-align: left; }
          table.lines th { background: #0b1f33; color: #fff; font-size: 7pt; }
          .summary { display: flex; justify-content: flex-end; }
          .tax-table { width: 72mm; }
          .row { display: flex; justify-content: space-between; padding: 1mm 0; border-bottom: 1px solid #e2e8f0; }
          .row.grand { font-size: 11pt; font-weight: bold; border-bottom: none; padding-top: 2mm; }
          .words, .notes, .terms { font-size: 8pt; margin: 2mm 0; }
          footer { margin-top: 4mm; text-align: center; font-size: 7pt; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 2mm; }
        }
      `}</style>
    </section>
  );
}
