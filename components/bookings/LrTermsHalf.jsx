import { TRANSPORTER_ID } from "@/lib/constants";

export default function LrTermsHalf() {
  return (
    <div className="lr-terms-half">
      <div className="lr-terms-half-header">
        <img src="/brand/agc-logo.jpg" alt="" className="lr-terms-half-logo" />
        <div>
          <div className="lr-terms-half-company">ASSAM GOODS CARRIER</div>
          <div className="lr-terms-half-tagline">A UNIT OF SD ENTERPRISES</div>
          <div className="lr-terms-half-addr">
            Plot No. 5A, Phase-2, Panchkula, Haryana - 134113 • Ph: 8847428801
          </div>
          <div className="lr-terms-half-addr">
            GSTIN: 06HNAPM3923G1Z3 • TRANSPORTER ID: {TRANSPORTER_ID}
          </div>
        </div>
      </div>

      <div className="lr-terms-half-title">TERMS &amp; CONDITIONS</div>

      <ol className="lr-terms-half-list">
        <li>
          <strong>DEFINITIONS:</strong> &quot;Carrier&quot; = Assam Goods Carrier. &quot;Consignor&quot; = person booking
          goods. &quot;Consignee&quot; = person receiving goods. &quot;Goods&quot; = consignment described on this LR.
        </li>
        <li>
          <strong>CARRIER&apos;S LIABILITY:</strong> Limited to ₹100/kg of actual weight or declared value, whichever is
          lower. Liability ceases on delivery against signature.
        </li>
        <li>
          <strong>CONSIGNOR&apos;S RESPONSIBILITY:</strong> Consignor warrants proper packing and correct declaration.
          Liable for loss/delay due to improper packing or misdeclaration.
        </li>
        <li>
          <strong>CONSIGNEE&apos;S RIGHTS:</strong> Goods delivered only against full payment and original LR or valid ID.
        </li>
        <li>
          <strong>PAYMENT TERMS:</strong> Freight due at booking (Paid) or delivery (To Pay/TBB). Interest @18% p.a. on
          overdue. Carrier has lien on goods for dues.
        </li>
        <li>
          <strong>COD TERMS:</strong> Carrier collects COD from Consignee and remits to Consignor within 7 working days,
          less COD handling charges.
        </li>
        <li>
          <strong>CLAIM PROCEDURE:</strong> Claims must be in writing within 15 days from booking date. Late claims not
          entertained.
        </li>
        <li>
          <strong>JURISDICTION:</strong> All disputes subject to exclusive jurisdiction of courts at Panchkula, Haryana.
        </li>
        <li>
          <strong>PROHIBITED GOODS:</strong> No contraband, illegal, or prohibited goods. If found, handed to police and
          Consignor solely responsible.
        </li>
        <li>
          <strong>DANGEROUS GOODS:</strong> Inflammable/hazardous goods must be declared in writing at booking. Undeclared
          goods may be refused.
        </li>
        <li>
          <strong>INSURANCE:</strong> Carrier not an insurer. Goods at owner&apos;s risk. Not liable for natural
          calamities, riots, strikes, theft, accidents.
        </li>
        <li>
          <strong>FORCE MAJEURE:</strong> Not liable for delays due to strikes, floods, government actions, road closures,
          or events beyond control.
        </li>
        <li>
          <strong>DEMURRAGE:</strong> ₹50/day per consignment if delivery not taken within 7 days of arrival. Carrier may
          sell goods after 30 days notice.
        </li>
        <li>
          <strong>SUB-CONTRACTING &amp; E-WAY:</strong> Carrier may sub-contract. Consignor must provide valid e-Way Bill
          for consignments above ₹50,000.
        </li>
        <li>
          <strong>AUTHORIZED SIGNATORY:</strong> Signatory is authorized. Consignor/Consignee accepts these terms by
          signing this LR.
        </li>
      </ol>

      <div className="lr-terms-half-footer">
        <span>For ASSAM GOODS CARRIER</span>
        <span className="lr-terms-half-sign-line">Authorized Signatory</span>
      </div>
    </div>
  );
}
