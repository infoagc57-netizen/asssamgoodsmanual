"use client";

import JsBarcode from "jsbarcode";
import { useEffect, useRef, useState } from "react";

const NAVY = "#071B34";
const NAVY_LIGHT = "#14304D";
const ORANGE = "#F97316";
const LR_STORAGE_KEY = "agc_next_lr";
const FIRST_LR_NUMBER = 7900000001;

const normalizeLrNumber = (value) => {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue >= FIRST_LR_NUMBER && numericValue <= 7999999999
    ? String(numericValue).padStart(10, "0")
    : String(FIRST_LR_NUMBER);
};

const readNextLrNumber = () => {
  if (typeof window === "undefined") return String(FIRST_LR_NUMBER);
  const storedValue = window.localStorage.getItem(LR_STORAGE_KEY);
  const nextLr = normalizeLrNumber(storedValue);
  if (!storedValue || storedValue !== nextLr) window.localStorage.setItem(LR_STORAGE_KEY, nextLr);
  return nextLr;
};

const Code128Barcode = ({ value }) => (
  <Code128BarcodeSvg value={value} />
);

const Code128BarcodeSvg = ({ value }) => {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (!barcodeRef.current || !value) return;
    JsBarcode(barcodeRef.current, value, {
      format: "CODE128",
      displayValue: false,
      height: 42,
      width: 2,
      margin: 0,
      background: "#ffffff",
      lineColor: "#000000",
    });
  }, [value]);

  return (
    <div className="barcode-box" aria-label={`Code128 barcode ${value}`}>
      <svg ref={barcodeRef} />
      <div className="barcode-number">{value}</div>
    </div>
  );
};

const SectionCard = ({ title, subtitle, children, icon }) => (
  <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
    <div className="flex items-start gap-3 border-b border-gray-50 px-6 py-4">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: "rgba(249,115,22,0.1)", color: ORANGE }}
      >
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-semibold" style={{ color: NAVY }}>
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const RATE_STORAGE_KEY = "agc_rate_master";
const RATE_TRIGGER_FIELDS = [
  "consignorName",
  "consignorMobile",
  "bookingBranch",
  "deliveryBranch",
  "actualWeight",
  "noOfPackages",
  "dimensionLength",
  "dimensionWidth",
  "dimensionHeight",
  "dimensionUnit",
  "dimensionPieces",
];

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const readRates = () => {
  try {
    const value = JSON.parse(window.localStorage.getItem(RATE_STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const normalizeBranchKey = (value) => String(value || "").trim().toLowerCase();

const branchMatchesRate = (bookingValue, rateCode, rateName, branches) => {
  const booking = normalizeBranchKey(bookingValue);
  if (!booking) return false;
  const code = normalizeBranchKey(rateCode);
  const name = normalizeBranchKey(rateName);
  if (booking === code || booking === name) return true;
  const branch = branches.find((item) => (
    normalizeBranchKey(item.code) === booking
    || normalizeBranchKey(item.name) === booking
    || normalizeBranchKey(item.id) === booking
  ));
  if (!branch) return false;
  return (
    normalizeBranchKey(branch.code) === code
    || normalizeBranchKey(branch.name) === name
    || normalizeBranchKey(branch.code) === name
    || normalizeBranchKey(branch.name) === code
    || normalizeBranchKey(branch.id) === code
  );
};

const calculateFreightFromRate = (rate, chargedWeight, packages) => {
  const unitRate = Number(rate.rate) || 0;
  let calculated = 0;
  if (rate.rateType === "Per Kg") calculated = chargedWeight * unitRate;
  else if (rate.rateType === "Per Package") calculated = packages * unitRate;
  else calculated = unitRate;
  return roundMoney(Math.max(calculated, Number(rate.minFreight) || 0));
};

const pickApplicableRate = (rates, chargedWeight, packages) => {
  if (!rates.length) return null;
  const sorted = [...rates].sort((a, b) => String(b.effectiveFrom || "").localeCompare(String(a.effectiveFrom || "")));
  const findType = (type) => sorted.find((rate) => rate.rateType === type);
  if (chargedWeight > 0 && findType("Per Kg")) return findType("Per Kg");
  if (packages > 0 && findType("Per Package")) return findType("Per Package");
  return findType("Fixed") || findType("Per Kg") || findType("Per Package") || sorted[0];
};

const findMatchingRate = ({
  consignorName,
  consignorMobile,
  bookingBranch,
  deliveryBranch,
  chargedWeight,
  packages,
  customers,
  branches,
}) => {
  const rates = readRates().filter((rate) => (rate.status || "Active") === "Active");
  const onRoute = rates.filter((rate) => (
    branchMatchesRate(bookingBranch, rate.fromBranch, rate.fromBranchName, branches)
    && branchMatchesRate(deliveryBranch, rate.toBranch, rate.toBranchName, branches)
  ));
  const name = String(consignorName || "").trim().toLowerCase();
  const mobile = String(consignorMobile || "").replace(/\D/g, "");
  const customer = customers.find((item) => (
    (name && item.name.toLowerCase() === name)
    || (mobile && item.mobile === mobile)
  ));
  const customerRates = onRoute.filter((rate) => (
    !rate.generalRate
    && (
      (customer && rate.customerId === customer.id)
      || (name && String(rate.customerName || "").toLowerCase() === name)
    )
  ));
  const generalRates = onRoute.filter((rate) => rate.generalRate);
  const customerMatch = pickApplicableRate(customerRates, chargedWeight, packages);
  if (customerMatch) return { rate: customerMatch, source: "customer" };
  const generalMatch = pickApplicableRate(generalRates, chargedWeight, packages);
  if (generalMatch) return { rate: generalMatch, source: "general" };
  return null;
};

const Field = ({ label, children, required, help }) => (
  <div>
    <label className="mb-1.5 block text-xs font-semibold" style={{ color: NAVY }}>
      {label}
      {required && <span className="ml-0.5" style={{ color: ORANGE }}>*</span>}
    </label>
    {children}
    {help && <p className="mt-1 text-[11px] text-gray-400">{help}</p>}
  </div>
);

export default function NewBookingPage() {
  const [activeNav, setActiveNav] = useState("bookings");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lrMode, setLrMode] = useState("automatic");
  const lrInputRef = useRef(null);
  const [lrCodeType, setLrCodeType] = useState("");
  const [lrCodeOpen, setLrCodeOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customerSearchRole, setCustomerSearchRole] = useState("");
  const [branches, setBranches] = useState([]);
  const [branchSearchRole, setBranchSearchRole] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [rateLookupReady, setRateLookupReady] = useState(false);
  const [manualFreightOverride, setManualFreightOverride] = useState(false);
  const [rateBadge, setRateBadge] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editRequested = params.get("edit") === "true";
    const lr = params.get("lr");

    if (editRequested && lr) {
      try {
        const records = JSON.parse(window.localStorage.getItem("agc_bookings") || "[]");
        const record = records.find((item) => item.lrNumber === lr);
        if (!record) {
          window.alert(`Booking ${lr} was not found.`);
          return;
        }
        const consignor = record.consignor || {};
        const consignee = record.consignee || {};
        const route = record.route || {};
        const goods = record.goods || {};
        const dimensions = record.dimensions || {};
        const charges = record.charges || {};
        setIsEditMode(true);
        setRateLookupReady(false);
        setManualFreightOverride(false);
        setRateBadge("");
        setForm((previous) => ({
          ...previous,
          lrNumber: record.lrNumber,
          lrCode: record.lrCode || "",
          bookingDate: record.date || "",
          bookingTime: record.time || "",
          bookingBranch: route.bookingBranch || "",
          consignorName: consignor.name || "",
          consignorMobile: consignor.mobile || "",
          consignorGst: consignor.gst || "",
          consignorPincode: consignor.pincode || "",
          consignorCity: consignor.city || "",
          consignorState: consignor.state || "",
          consignorAddress: consignor.address || "",
          consigneeName: consignee.name || "",
          consigneeMobile: consignee.mobile || "",
          consigneeGst: consignee.gst || "",
          consigneePincode: consignee.pincode || "",
          consigneeCity: consignee.city || "",
          consigneeState: consignee.state || "",
          consigneeAddress: consignee.address || "",
          deliveryBranch: route.deliveryBranch || "",
          deliveryAt: route.deliveryAt || "",
          articles: goods.articles || "",
          packageType: goods.packageType || "",
          noOfPackages: goods.packages ?? "",
          privateMark: goods.privateMark || "",
          goodsDescription: goods.description || "",
          invoiceNumber: goods.invoiceNumber || "",
          ewayBillNumber: goods.ewayBillNumber || "",
          actualWeight: goods.actualWeight ?? "",
          chargedWeight: goods.chargedWeight ?? "",
          dimensionLength: dimensions.length || "",
          dimensionWidth: dimensions.width || "",
          dimensionHeight: dimensions.height || "",
          dimensionUnit: dimensions.unit || "cm",
          dimensionPieces: dimensions.pieces ?? "1",
          riskType: goods.riskType || "",
          declaredValue: goods.declaredValue ?? "",
          freight: charges.freight ?? "",
          hamali: charges.hamali ?? "",
          doorDelivery: charges.doorDelivery ?? "",
          localCartageCharges: charges.localCartageCharges ?? "",
          selfBuiltyCharge: charges.selfBuiltyCharge ?? "",
          otherCharges: charges.otherCharges ?? "",
          gstOnFreight: charges.gstOnFreight ?? "",
          builtyCharge: charges.builtyCharge ?? "150",
          paymentType: record.paymentType || "to_pay",
        }));
      } catch {
        window.alert("Unable to load booking for edit.");
      }
      return;
    }

    const nextLr = readNextLrNumber();
    setForm((previous) => ({ ...previous, lrNumber: nextLr }));
    setRateLookupReady(true);
  }, []);

  const [form, setForm] = useState({
    lrNumber: String(FIRST_LR_NUMBER), lrCode: "", bookingDate: "", bookingTime: "", bookingBranch: "",
    consignorName: "", consignorMobile: "", consignorGst: "", consignorPincode: "",
    consignorCity: "", consignorState: "", consignorAddress: "",
    consigneeName: "", consigneeMobile: "", consigneeGst: "", consigneePincode: "",
    consigneeCity: "", consigneeState: "", consigneeAddress: "",
    deliveryBranch: "", deliveryAt: "",
    articles: "", packageType: "", noOfPackages: "", privateMark: "", goodsDescription: "",
    invoiceNumber: "", ewayBillNumber: "", actualWeight: "", chargedWeight: "",
    dimensionLength: "", dimensionWidth: "", dimensionHeight: "",
    dimensionUnit: "cm", dimensionPieces: "1",
    riskType: "", declaredValue: "",
    freight: "", hamali: "", doorDelivery: "", localCartageCharges: "", selfBuiltyCharge: "", otherCharges: "", gstOnFreight: "",
    builtyCharge: "150",
    paymentType: "to_pay",
  });

  useEffect(() => {
    try {
      setCustomers(JSON.parse(window.localStorage.getItem("agc_customers") || "[]"));
      setBranches(JSON.parse(window.localStorage.getItem("agc_branches") || "[]").filter((branch) => branch.status !== "Disabled"));
    } catch {
      setCustomers([]);
      setBranches([]);
    }
  }, []);

  const enableRateLookup = () => {
    setRateLookupReady(true);
    setManualFreightOverride(false);
  };

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm((previous) => ({ ...previous, [field]: value }));
    if (RATE_TRIGGER_FIELDS.includes(field)) enableRateLookup();
    if (field === "freight") {
      setManualFreightOverride(true);
      setRateBadge("manual");
    }
  };

  const customerRoleFields = {
    consignor: { name: "consignorName", mobile: "consignorMobile", gst: "consignorGst", address: "consignorAddress", pincode: "consignorPincode", city: "consignorCity", state: "consignorState" },
    consignee: { name: "consigneeName", mobile: "consigneeMobile", gst: "consigneeGst", address: "consigneeAddress", pincode: "consigneePincode", city: "consigneeCity", state: "consigneeState" },
  };

  const handleCustomerNameChange = (role) => (e) => {
    const field = customerRoleFields[role].name;
    setForm((previous) => ({ ...previous, [field]: e.target.value }));
    setCustomerSearchRole(role);
    if (role === "consignor") enableRateLookup();
  };

  const selectCustomer = (role, customer) => {
    const fields = customerRoleFields[role];
    setForm((previous) => ({
      ...previous,
      [fields.name]: customer.name,
      [fields.mobile]: customer.mobile,
      [fields.gst]: customer.gst,
      [fields.address]: customer.address,
      [fields.pincode]: customer.pincode,
      [fields.city]: customer.city,
      [fields.state]: customer.state,
      paymentType: role === "consignor" && customer.defaultPayment ? customer.defaultPayment : previous.paymentType,
    }));
    setCustomerSearchRole("");
    if (role === "consignor") enableRateLookup();
  };

  const saveNewCustomer = (role) => {
    const fields = customerRoleFields[role];
    const details = {
      name: form[fields.name].trim(),
      mobile: form[fields.mobile].replace(/\D/g, "").slice(0, 10),
      gst: form[fields.gst],
      address: form[fields.address],
      pincode: form[fields.pincode],
      city: form[fields.city],
      state: form[fields.state],
    };
    if (!details.name || !details.mobile) {
      window.alert("Customer name and mobile are required.");
      return;
    }
    if (customers.some((customer) => customer.mobile === details.mobile)) {
      window.alert("A customer with this mobile number already exists.");
      return;
    }
    const nextId = `CUST${String(customers.reduce((max, customer) => Math.max(max, Number(String(customer.id).replace("CUST", "")) || 0), 0) + 1).padStart(4, "0")}`;
    const customer = { id: nextId, ...details, alternateMobile: "", pan: "", customerType: "Regular", defaultPayment: form.paymentType, remarks: "", createdAt: new Date().toISOString() };
    const nextCustomers = [...customers, customer];
    window.localStorage.setItem("agc_customers", JSON.stringify(nextCustomers));
    setCustomers(nextCustomers);
    setCustomerSearchRole("");
    if (role === "consignor") enableRateLookup();
  };

  const customerMatches = (role) => {
    const query = form[customerRoleFields[role].name].trim().toLowerCase();
    if (customerSearchRole !== role || !query) return [];
    return customers.filter((customer) => customer.name.toLowerCase().includes(query) || customer.mobile.includes(query) || (customer.gst || "").toLowerCase().includes(query)).slice(0, 6);
  };

  const handleLrModeChange = (mode) => {
    if (isEditMode) return;
    setLrMode(mode);
    if (mode === "automatic") {
      setForm((previous) => ({ ...previous, lrNumber: readNextLrNumber() }));
      return;
    }
    if (mode === "manual") {
      requestAnimationFrame(() => lrInputRef.current?.focus());
    }
  };

  const handleLrNumberChange = (e) => {
    if (isEditMode) return;
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
    if (digitsOnly && digitsOnly[0] !== "7") return;
    if (digitsOnly.length > 1 && !digitsOnly.startsWith("79")) return;
    setForm((p) => ({ ...p, lrNumber: digitsOnly }));
  };

  const branchMatches = (role) => {
    const query = form[role === "booking" ? "bookingBranch" : "deliveryBranch"].toLowerCase();
    if (branchSearchRole !== role) return [];
    return branches.filter((branch) => [branch.code, branch.name, branch.city].some((value) => String(value || "").toLowerCase().includes(query))).slice(0, 8);
  };

  const selectBranch = (role, branch) => {
    setForm((previous) => ({ ...previous, [role === "booking" ? "bookingBranch" : "deliveryBranch"]: branch.code }));
    setBranchSearchRole("");
    enableRateLookup();
  };
  const lrCodeOptions = ["SELF", "PARTY", "CASH"];
  const handleLrCodeSelect = (v) => { setLrCodeType(v); setForm((p) => ({ ...p, lrCode: v })); setLrCodeOpen(false); };
  const handleLrCodeOther = () => {
    setLrCodeType("OTHER");
    setForm((p) => ({ ...p, lrCode: lrCodeOptions.includes(p.lrCode) ? "" : p.lrCode }));
    setLrCodeOpen(false);
  };

  // Keyboard operator flow: Enter -> next field (UI only), never submit
  const handleFieldKeyDown = (e) => {
    if (e.key !== "Enter") return;

    const target = e.target;
    if (target instanceof HTMLTextAreaElement) return;

    const formEl = target.closest("form");
    if (!formEl) return;

    const focusable = formEl.querySelectorAll(
      "input:not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]):not([readonly]), button:not([disabled])"
    );
    const index = Array.prototype.indexOf.call(focusable, target);
    if (index === -1) return;

    const next = focusable[index + 1];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  const handleReset = () => {
    setLrCodeType(""); setLrCodeOpen(false);
    if (!isEditMode) setLrMode("automatic");
    setRateLookupReady(true);
    setManualFreightOverride(false);
    setRateBadge("");
    const nextLr = isEditMode ? form.lrNumber : readNextLrNumber();
    setForm({
      lrNumber: nextLr, lrCode: "", bookingDate: "", bookingTime: "", bookingBranch: "",
      consignorName: "", consignorMobile: "", consignorGst: "", consignorPincode: "",
      consignorCity: "", consignorState: "", consignorAddress: "",
      consigneeName: "", consigneeMobile: "", consigneeGst: "", consigneePincode: "",
      consigneeCity: "", consigneeState: "", consigneeAddress: "",
      deliveryBranch: "", deliveryAt: "",
      articles: "", packageType: "", noOfPackages: "", privateMark: "", goodsDescription: "",
      invoiceNumber: "", ewayBillNumber: "", actualWeight: "", chargedWeight: "",
      dimensionLength: "", dimensionWidth: "", dimensionHeight: "",
      dimensionUnit: "cm", dimensionPieces: "1",
      riskType: "", declaredValue: "",
      freight: "", hamali: "", doorDelivery: "", localCartageCharges: "", selfBuiltyCharge: "", otherCharges: "", gstOnFreight: "",
      builtyCharge: "150",
      paymentType: "to_pay",
    });
  };

  // Visual UI-only auto total with fixed builty charge and to-pay surcharge
  const compute = (k) => parseFloat(form[k]) || 0;
  const dimensionLength = parseFloat(form.dimensionLength) || 0;
  const dimensionWidth = parseFloat(form.dimensionWidth) || 0;
  const dimensionHeight = parseFloat(form.dimensionHeight) || 0;
  const dimensionPieces = parseFloat(form.dimensionPieces) || 0;
  const dimensionVolume = dimensionLength * dimensionWidth * dimensionHeight * dimensionPieces;
  const cbm = form.dimensionUnit === "cm"
    ? dimensionVolume / 1000000
    : dimensionVolume / 35.3147;
  const cubicFeet = form.dimensionUnit === "cm"
    ? cbm * 35.3147
    : dimensionVolume;
  const volumetricWeight = cbm * 167;
  const actualWeight = compute("actualWeight");
  const chargedWeight = Math.max(actualWeight, volumetricWeight);
  const chargedByVolumetricWeight = volumetricWeight > actualWeight;
  const packagesCount = compute("noOfPackages");

  useEffect(() => {
    if (!rateLookupReady || manualFreightOverride) return;
    if (!String(form.bookingBranch || "").trim() || !String(form.deliveryBranch || "").trim()) {
      setRateBadge("");
      return;
    }
    const match = findMatchingRate({
      consignorName: form.consignorName,
      consignorMobile: form.consignorMobile,
      bookingBranch: form.bookingBranch,
      deliveryBranch: form.deliveryBranch,
      chargedWeight,
      packages: packagesCount,
      customers,
      branches,
    });
    if (!match) {
      setRateBadge("missing");
      return;
    }
    const nextFreight = calculateFreightFromRate(match.rate, chargedWeight, packagesCount);
    setForm((previous) => (
      String(previous.freight) === nextFreight.toFixed(2) ? previous : { ...previous, freight: nextFreight.toFixed(2) }
    ));
    setRateBadge(match.source === "customer" ? "auto-customer" : "auto-general");
  }, [
    rateLookupReady,
    manualFreightOverride,
    form.consignorName,
    form.consignorMobile,
    form.bookingBranch,
    form.deliveryBranch,
    chargedWeight,
    packagesCount,
    customers,
    branches,
  ]);

  const toPayBuiltyCharge = form.paymentType === "to_pay" ? 100 : 0;
  const builtyCharge = compute("builtyCharge") || 150;
  const displayTotal = (
    compute("freight") +
    compute("hamali") +
    compute("doorDelivery") +
    compute("localCartageCharges") +
    compute("selfBuiltyCharge") +
    compute("otherCharges") +
    compute("gstOnFreight") +
    builtyCharge +
    toPayBuiltyCharge
  );
  const totalStr = displayTotal > 0 ? displayTotal.toFixed(2) : "";

  const handleSubmit = (e) => {
    e.preventDefault();
    const formEl = e.target;
    const failValidation = (message, fieldName) => {
      window.alert(message);
      const field = fieldName === "lrNumber" ? lrInputRef.current : formEl.querySelector(`[name="${fieldName}"]`);
      field?.focus();
    };

    if (!/^79\d{8}$/.test(form.lrNumber)) {
      failValidation("Please enter a valid LR number (79 followed by 8 digits).", "lrNumber");
      return;
    }
    if (!form.bookingDate) {
      failValidation("Please enter the booking date.", "bookingDate");
      return;
    }
    if (!String(form.bookingBranch || "").trim()) {
      failValidation("Please select the booking branch.", "bookingBranch");
      return;
    }
    if (!String(form.deliveryBranch || "").trim()) {
      failValidation("Please enter the delivery branch.", "deliveryBranch");
      return;
    }
    if (!form.consignorName.trim()) {
      failValidation("Please enter the consignor name.", "consignorName");
      return;
    }
    if (!form.consigneeName.trim()) {
      failValidation("Please enter the consignee name.", "consigneeName");
      return;
    }
    if (!form.articles.trim()) {
      failValidation("Please enter the commodity.", "articles");
      return;
    }
    if (!(Number(form.noOfPackages) > 0)) {
      failValidation("Packages must be greater than 0.", "noOfPackages");
      return;
    }
    if (!(Number(form.actualWeight) > 0)) {
      failValidation("Actual weight must be greater than 0.", "actualWeight");
      return;
    }
    if (!["to_pay", "paid", "tbb"].includes(form.paymentType)) {
      failValidation("Please select a payment type.", "paymentType");
      return;
    }
    const freightValue = form.freight === "" || form.freight == null ? 0 : Number(form.freight);
    if (!Number.isFinite(freightValue) || freightValue < 0) {
      failValidation("Freight cannot be negative.", "freight");
      return;
    }

    const savedBookings = JSON.parse(window.localStorage.getItem("agc_bookings") || "[]");
    const existingIndex = savedBookings.findIndex((item) => item.lrNumber === form.lrNumber);
    if (isEditMode) {
      if (existingIndex === -1) {
        window.alert(`Booking ${form.lrNumber} was not found.`);
        return;
      }
    } else if (existingIndex !== -1) {
      window.alert(`LR Number ${form.lrNumber} already exists.`);
      return;
    }

    const existing = existingIndex === -1 ? null : savedBookings[existingIndex];
    const nextLr = isEditMode
      ? null
      : normalizeLrNumber(Math.max(Number(form.lrNumber) + 1, Number(readNextLrNumber())));

    const booking = {
      ...(existing || {}),
      lrNumber: form.lrNumber,
      status: existing?.status || "Booked",
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      date: form.bookingDate,
      time: form.bookingTime,
      paymentType: form.paymentType,
      grandTotal: displayTotal,
      consignor: {
        name: form.consignorName,
        mobile: form.consignorMobile,
        gst: form.consignorGst,
        pincode: form.consignorPincode,
        city: form.consignorCity,
        state: form.consignorState,
        address: form.consignorAddress,
      },
      consignee: {
        name: form.consigneeName,
        mobile: form.consigneeMobile,
        gst: form.consigneeGst,
        pincode: form.consigneePincode,
        city: form.consigneeCity,
        state: form.consigneeState,
        address: form.consigneeAddress,
      },
      route: {
        bookingBranch: form.bookingBranch,
        deliveryBranch: form.deliveryBranch,
        deliveryAt: form.deliveryAt,
      },
      goods: {
        articles: form.articles,
        packageType: form.packageType,
        packages: form.noOfPackages,
        privateMark: form.privateMark,
        description: form.goodsDescription,
        invoiceNumber: form.invoiceNumber,
        ewayBillNumber: form.ewayBillNumber,
        riskType: form.riskType,
        actualWeight,
        chargedWeight,
        declaredValue: form.declaredValue,
      },
      dimensions: {
        length: form.dimensionLength,
        width: form.dimensionWidth,
        height: form.dimensionHeight,
        unit: form.dimensionUnit,
        pieces: form.dimensionPieces,
        cubicFeet,
        cbm,
        volumetricWeight,
      },
      charges: {
        freight: compute("freight"),
        hamali: compute("hamali"),
        doorDelivery: compute("doorDelivery"),
        localCartageCharges: compute("localCartageCharges"),
        selfBuiltyCharge: compute("selfBuiltyCharge"),
        builtyCharge,
        toPayBuiltyCharge,
        otherCharges: compute("otherCharges"),
        gstOnFreight: compute("gstOnFreight"),
      },
    };

    if (isEditMode) {
      savedBookings[existingIndex] = booking;
      window.localStorage.setItem("agc_bookings", JSON.stringify(savedBookings));
    } else {
      window.localStorage.setItem("agc_bookings", JSON.stringify([...savedBookings, booking]));
      window.localStorage.setItem(LR_STORAGE_KEY, nextLr);
    }

    const savedLrNumber = form.lrNumber;
    const navigateToSavedBooking = () => {
      window.location.href = `/bookings/${encodeURIComponent(savedLrNumber)}`;
    };
    window.addEventListener("afterprint", navigateToSavedBooking, { once: true });
    window.print();
  };
  const handlePrint = () => {
    const savedBookings = JSON.parse(window.localStorage.getItem("agc_bookings") || "[]");
    if (!savedBookings.some((booking) => booking.lrNumber === form.lrNumber)) {
      window.alert("Please save the LR before printing.");
      return;
    }
    window.print();
  };
  const printText = (value, fallback = "-") => value || fallback;
  const paymentLabel = form.paymentType === "to_pay" ? "TO PAY" : form.paymentType === "paid" ? "PAID" : "TBB";
  const currentLrNumber = /^79\d{8}$/.test(form.lrNumber) ? form.lrNumber : String(FIRST_LR_NUMBER);

  const navItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      href: "/dashboard",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      key: "bookings",
      label: "Bookings",
      href: "/bookings",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      key: "trips",
      label: "Trips",
      href: "/trips",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 17h4V5H2v12h3M20 17h2v-3.34a4 4 0 00-1.17-2.83L19 9h-5v8h1M7.5 17.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM17.5 17.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
        </svg>
      ),
    },
    {
      key: "deliveries",
      label: "Deliveries",
      href: "/deliveries",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
    },
    {
      key: "pod",
      label: "POD",
      href: "/pod",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      key: "customers",
      label: "Customers",
      href: "/customers",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      key: "reports",
      label: "Reports",
      href: "/reports",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      key: "settings",
      label: "Settings",
      href: "/settings",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  // Compact operator inputs for counter-style booking screen
  const inp = "w-full h-[42px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";
  const inpRo = "w-full h-[42px] cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 text-[14px] font-medium text-slate-600";
  const smInp = "w-full h-[42px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";
  const ta = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100 resize-none";
  const chev = "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:18px_18px] bg-[right_12px_center] bg-no-repeat pr-9";
  const sel = inp + " " + chev;

  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`sidebar fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: NAVY }}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/5 px-5">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: ORANGE, boxShadow: "0 8px 24px -6px rgba(249,115,22,0.5)" }}
          >
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 17h4V5H2v12h3" />
              <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
              <circle cx="7.5" cy="17.5" r="2.5" />
              <circle cx="17.5" cy="17.5" r="2.5" />
            </svg>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-white">Manual Transport</span>
            <span className="text-[11px] font-medium text-white/50">ERP System</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Main Menu
          </p>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeNav === item.key;
              return (
                <li key={item.key}>
                  <a
                    href={item.href}
                    onClick={() => {
                      setActiveNav(item.key);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? "text-white"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                    style={isActive ? { backgroundColor: NAVY_LIGHT } : {}}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                    {isActive && (
                      <span
                        className="ml-auto h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: ORANGE }}
                      />
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3 rounded-xl p-3" style={{ backgroundColor: NAVY_LIGHT }}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
              A
            </div>
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-sm font-semibold text-white">Admin User</span>
              <span className="truncate text-[11px] text-white/50">Administrator</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-100 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="relative hidden md:block">
              <input
                type="search"
                placeholder="Search bookings, trips, customers..."
                className="w-72 rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-3 text-sm outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100"
              />
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span
                className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full"
                style={{ backgroundColor: ORANGE }}
              />
            </button>
            <div className="mx-2 hidden h-6 w-px bg-gray-100 sm:block" />
            <div className="flex items-center gap-2 rounded-lg p-1 hover:bg-gray-50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: NAVY }}>
                A
              </div>
            </div>
          </div>
        </header>

        <main className="screen-only flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px]">
            <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-500">
                  <a href="/bookings" onClick={(e) => e.preventDefault()} className="hover:text-gray-700">
                    Bookings
                  </a>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <span style={{ color: NAVY }}>{isEditMode ? "Edit Booking" : "New LTL Booking"}</span>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: ORANGE }}>
                  AGC Counter Booking
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: NAVY }}>
                  {isEditMode ? "Edit Booking" : "New LTL Booking"}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Assam Goods Carrier — Less Than Truck Load booking
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} onKeyDown={handleFieldKeyDown} className="mx-auto max-w-[1500px] space-y-3 text-[14px]">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#0B1F33] shadow-sm">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">Booking counter</p>
                    <h2 className="mt-1 text-base font-semibold text-white">LTL Booking</h2>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-200">
                    <span className="h-2 w-2 rounded-full bg-orange-400" />
                    Live booking
                  </div>
                </div>

                <div className="border-b border-white/10 px-3 pb-3 pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">LR Mode</span>
                    <div className="inline-flex h-[36px] rounded-xl border border-white/10 bg-white/5 p-1">
                      {["automatic", "manual"].map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => handleLrModeChange(mode)}
                          disabled={isEditMode}
                          className={`h-full rounded-lg px-4 text-[12px] font-semibold transition ${lrMode === mode ? "text-white shadow-sm" : "text-slate-300 hover:text-white"} ${isEditMode ? "cursor-not-allowed opacity-60" : ""}`}
                          style={lrMode === mode ? { backgroundColor: ORANGE } : {}}
                        >
                          {mode === "automatic" ? "Automatic" : "Manual"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-6">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">LR Number</label>
                    <input
                      ref={lrInputRef}
                      name="lrNumber"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="1"
                      step="1"
                      readOnly={isEditMode || lrMode === "automatic"}
                      value={form.lrNumber}
                      onChange={handleLrNumberChange}
                      className={isEditMode || lrMode === "automatic" ? "w-full h-[42px] rounded-lg border border-white/10 bg-slate-200/10 px-3 text-[14px] text-white placeholder:text-slate-400 cursor-not-allowed" : "w-full h-[42px] rounded-lg border border-white/10 bg-white/5 px-3 text-[14px] text-white placeholder:text-slate-400 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-500/30"}
                    />
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">Code</label>
                    {lrCodeType !== "OTHER" ? (
                      <div className="relative">
                        <button type="button" onClick={() => setLrCodeOpen(!lrCodeOpen)} className="flex h-[42px] w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 text-left text-[14px] text-white">
                          <span className={form.lrCode ? "text-white" : "text-slate-400"}>{form.lrCode || "Select"}</span>
                          <svg className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {lrCodeOpen && (
                          <div className="absolute z-30 mt-2 w-full rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                            <input type="text" autoFocus placeholder="SELF, PARTY, CASH..." onKeyDown={(e) => e.stopPropagation()} onChange={(e) => { const q = e.target.value.toUpperCase(); if (lrCodeOptions.includes(q)) handleLrCodeSelect(q); else setForm((p) => ({ ...p, lrCode: q })); }} className="mb-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[14px] outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100" />
                            {lrCodeOptions.map((o) => (
                              <button key={o} type="button" onClick={() => handleLrCodeSelect(o)} className={`flex w-full rounded-lg px-3 py-2 text-left text-[14px] font-medium transition ${lrCodeType === o ? "bg-[#0B1F33] text-white" : "text-slate-700 hover:bg-slate-50"}`}>
                                {o}
                              </button>
                            ))}
                            <button type="button" onClick={handleLrCodeOther} className={`mt-1 flex w-full rounded-lg border-t border-slate-100 px-3 py-2 text-left text-[14px] font-medium transition ${lrCodeType === "OTHER" ? "bg-[#F97316] text-white" : "text-slate-700 hover:bg-slate-50"}`}>
                              Other (custom)
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input type="text" placeholder="Code" value={form.lrCode} onChange={handleChange("lrCode")} className="h-[42px] w-full rounded-lg border border-white/10 bg-white/5 px-3 text-[14px] text-white placeholder:text-slate-400 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-500/30" />
                        <button type="button" onClick={() => { setLrCodeType(""); setForm((p) => ({ ...p, lrCode: "" })); }} className="h-[42px] shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 text-xs font-semibold text-slate-200 hover:bg-white/10">↩</button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">Date</label>
                    <input type="date" name="bookingDate" value={form.bookingDate} onChange={handleChange("bookingDate")} className="w-full h-[42px] rounded-lg border border-white/10 bg-white/5 px-3 text-[14px] text-white outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-500/30" />
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">Time</label>
                    <input type="time" value={form.bookingTime} onChange={handleChange("bookingTime")} className="w-full h-[42px] rounded-lg border border-white/10 bg-white/5 px-3 text-[14px] text-white outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-500/30" />
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">Branch</label>
                    <select name="bookingBranch" value={form.bookingBranch} onChange={handleChange("bookingBranch")} className={`${sel} h-[42px] w-full rounded-lg border border-white/10 bg-white/5 px-3 text-[14px] text-white`}>{branches.map((b) => (<option key={b.code} value={b.code} className="text-slate-900">{b.name}</option>))}</select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Consignor</p>
                      <h3 className="text-base font-semibold text-slate-900">Sender details</h3>
                    </div>
                    <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="relative sm:col-span-3"><Field label="Name"><input type="text" name="consignorName" placeholder="Consignor name / company" value={form.consignorName} onChange={handleCustomerNameChange("consignor")} onFocus={() => setCustomerSearchRole("consignor")} className={inp} /></Field>{customerMatches("consignor").length > 0 && <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">{customerMatches("consignor").map((customer) => <button key={customer.id} type="button" onClick={() => selectCustomer("consignor", customer)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-orange-50"><span className="font-semibold text-slate-800">{customer.name}</span><span className="text-xs text-slate-500">{customer.mobile}</span></button>)}</div>}{form.consignorName.trim() && customerMatches("consignor").length === 0 && customerSearchRole === "consignor" && <button type="button" onClick={() => saveNewCustomer("consignor")} className="mt-1 text-xs font-semibold text-orange-600 hover:text-orange-700">Save New Customer</button>}</div>
                    <div className="sm:col-span-2"><Field label="Mobile"><input type="tel" placeholder="Mobile number" value={form.consignorMobile} onChange={handleChange("consignorMobile")} className={inp} /></Field></div>
                    <Field label="GST"><input type="text" placeholder="GSTIN" value={form.consignorGst} onChange={handleChange("consignorGst")} className={inp} /></Field>
                    <Field label="Pincode"><input type="text" placeholder="000000" maxLength={6} value={form.consignorPincode} onChange={handleChange("consignorPincode")} className={inp} /></Field>
                    <Field label="City"><input type="text" placeholder="Auto-fill" readOnly value={form.consignorCity} className={inpRo} /></Field>
                    <Field label="State"><input type="text" placeholder="Auto-fill" readOnly value={form.consignorState} className={inpRo} /></Field>
                    <div className="sm:col-span-3"><Field label="Address"><textarea rows="3" placeholder="Full consignor address" value={form.consignorAddress} onChange={handleChange("consignorAddress")} className={`${ta} min-h-[88px]`} /></Field></div>
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <button type="button" className="inline-flex h-[42px] items-center gap-2 rounded-lg px-4 text-[13px] font-semibold text-white hover:opacity-90" style={{ backgroundColor: NAVY }}>
                        Save
                      </button>
                      <button type="button" className="inline-flex h-[42px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
                        Load
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Consignee</p>
                      <h3 className="text-base font-semibold text-slate-900">Receiver details</h3>
                    </div>
                    <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="relative sm:col-span-3"><Field label="Name"><input type="text" name="consigneeName" placeholder="Consignee name / company" value={form.consigneeName} onChange={handleCustomerNameChange("consignee")} onFocus={() => setCustomerSearchRole("consignee")} className={inp} /></Field>{customerMatches("consignee").length > 0 && <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">{customerMatches("consignee").map((customer) => <button key={customer.id} type="button" onClick={() => selectCustomer("consignee", customer)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-orange-50"><span className="font-semibold text-slate-800">{customer.name}</span><span className="text-xs text-slate-500">{customer.mobile}</span></button>)}</div>}{form.consigneeName.trim() && customerMatches("consignee").length === 0 && customerSearchRole === "consignee" && <button type="button" onClick={() => saveNewCustomer("consignee")} className="mt-1 text-xs font-semibold text-orange-600 hover:text-orange-700">Save New Customer</button>}</div>
                    <div className="sm:col-span-3"><Field label="Mobile"><input type="tel" placeholder="Mobile number" value={form.consigneeMobile} onChange={handleChange("consigneeMobile")} className={inp} /></Field></div>
                    <div className="sm:col-span-2"><Field label="GST"><input type="text" placeholder="GSTIN" value={form.consigneeGst} onChange={handleChange("consigneeGst")} className={inp} /></Field></div>
                    <Field label="Pincode"><input type="text" placeholder="000000" maxLength={6} value={form.consigneePincode} onChange={handleChange("consigneePincode")} className={inp} /></Field>
                    <Field label="City"><input type="text" placeholder="Auto-fill" readOnly value={form.consigneeCity} className={inpRo} /></Field>
                    <div className="sm:col-span-2"><Field label="State"><input type="text" placeholder="Auto-fill" readOnly value={form.consigneeState} className={inpRo} /></Field></div>
                    <div className="sm:col-span-3"><Field label="Address"><textarea rows="3" placeholder="Full consignee address" value={form.consigneeAddress} onChange={handleChange("consigneeAddress")} className={`${ta} min-h-[88px]`} /></Field></div>
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <button type="button" className="inline-flex h-[42px] items-center gap-2 rounded-lg px-4 text-[13px] font-semibold text-white hover:opacity-90" style={{ backgroundColor: NAVY }}>
                        Save
                      </button>
                      <button type="button" className="inline-flex h-[42px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
                        Load
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Route</p>
                    <h3 className="text-base font-semibold text-slate-900">Movement plan</h3>
                  </div>
                  <div className="rounded-lg bg-orange-50 p-1.5 text-orange-600">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                  </div>
                </div>
                <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[1fr_48px_1fr_48px_1fr]">
                  <div className="relative"><Field label="Booking Branch"><input type="text" placeholder="Search branch" value={form.bookingBranch} onChange={handleChange("bookingBranch")} onFocus={() => setBranchSearchRole("booking")} className={inp} /></Field>{branchMatches("booking").length > 0 && <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">{branchMatches("booking").map((branch) => <button key={branch.id} type="button" onClick={() => selectBranch("booking", branch)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-orange-50"><span className="font-semibold text-slate-800">{branch.name}</span><span className="text-xs text-slate-500">{branch.code} · {branch.city}</span></button>)}</div>}</div>
                  <div className="hidden md:flex md:items-center md:justify-center md:pt-6"><div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-orange-200 bg-orange-50 text-orange-600"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></div></div>
                  <div className="relative"><Field label="Delivery Branch"><input type="text" name="deliveryBranch" placeholder="Search branch" value={form.deliveryBranch} onChange={handleChange("deliveryBranch")} onFocus={() => setBranchSearchRole("delivery")} className={inp} /></Field>{branchMatches("delivery").length > 0 && <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">{branchMatches("delivery").map((branch) => <button key={branch.id} type="button" onClick={() => selectBranch("delivery", branch)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-orange-50"><span className="font-semibold text-slate-800">{branch.name}</span><span className="text-xs text-slate-500">{branch.code} · {branch.city}</span></button>)}</div>}</div>
                  <div className="hidden md:flex md:items-center md:justify-center md:pt-6"><div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-orange-200 bg-orange-50 text-orange-600"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div></div>
                  <Field label="Delivery At"><input type="text" placeholder="Delivery place / godown / address" value={form.deliveryAt} onChange={handleChange("deliveryAt")} className={inp} /></Field>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Goods Details</p>
                    <h3 className="text-base font-semibold text-slate-900">Shipment information</h3>
                  </div>
                  <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <div className="xl:col-span-2"><Field label="Articles"><input type="text" name="articles" placeholder="Commodity" value={form.articles} onChange={handleChange("articles")} className={inp} /></Field></div>
                  <Field label="Package Type"><select value={form.packageType} onChange={handleChange("packageType")} className={sel}><option value="">Select</option><option value="carton">Carton</option><option value="bag">Bag</option><option value="bundle">Bundle</option><option value="box">Box</option><option value="drum">Drum</option><option value="roll">Roll</option><option value="loose">Loose</option></select></Field>
                  <Field label="Packages"><input type="number" name="noOfPackages" min="0" placeholder="0" value={form.noOfPackages} onChange={handleChange("noOfPackages")} className={inp} /></Field>
                  <Field label="Weight (KG)"><input type="number" name="actualWeight" min="0" step="0.01" placeholder="0.00" value={form.actualWeight} onChange={handleChange("actualWeight")} className={inp} /></Field>
                  <Field label="Charged (KG)">
                    <input type="text" readOnly value={chargedWeight > 0 ? chargedWeight.toFixed(2) : ""} className={inpRo} />
                    <p className="mt-1 text-[11px] text-slate-500">
                      {chargedByVolumetricWeight ? "Charged by Volumetric Weight" : "Charged by Actual Weight"}
                    </p>
                  </Field>
                  <Field label="Private Mark"><input type="text" placeholder="Marking" value={form.privateMark} onChange={handleChange("privateMark")} className={inp} /></Field>
                  <Field label="Invoice"><input type="text" placeholder="Invoice no." value={form.invoiceNumber} onChange={handleChange("invoiceNumber")} className={inp} /></Field>
                  <Field label="E-Way Bill"><input type="text" placeholder="Optional" value={form.ewayBillNumber} onChange={handleChange("ewayBillNumber")} className={inp} /></Field>
                  <Field label="Risk Type">
                    <div className="inline-flex h-[42px] w-full items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                      {["owner_risk", "carrier_risk"].map((v) => (
                        <button key={v} type="button" onClick={() => setForm((p) => ({ ...p, riskType: v }))} className={`flex-1 h-full rounded-lg text-[13px] font-semibold transition ${form.riskType === v ? "text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`} style={form.riskType === v ? { backgroundColor: NAVY } : {}}>{v === "owner_risk" ? "Owner" : "Carrier"}</button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Declared Value"><div className="relative"><span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base font-semibold text-slate-400">₹</span><input type="number" min="0" step="0.01" placeholder="0.00" value={form.declaredValue} onChange={handleChange("declaredValue")} className={`${inp} pl-8`} /></div></Field>
                  <div className="xl:col-span-6 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-3 border-b border-slate-200 pb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Dimensions</p>
                      <h4 className="text-sm font-semibold text-slate-900">Volumetric weight</h4>
                      <p className="mt-1 text-[11px] text-slate-500">Enter dimensions of one package. Total volume is calculated using the number of pieces.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <Field label="Length"><input type="number" min="0" step="0.01" placeholder="0.00" value={form.dimensionLength} onChange={handleChange("dimensionLength")} className={inp} /></Field>
                      <Field label="Width"><input type="number" min="0" step="0.01" placeholder="0.00" value={form.dimensionWidth} onChange={handleChange("dimensionWidth")} className={inp} /></Field>
                      <Field label="Height"><input type="number" min="0" step="0.01" placeholder="0.00" value={form.dimensionHeight} onChange={handleChange("dimensionHeight")} className={inp} /></Field>
                      <Field label="Unit"><select value={form.dimensionUnit} onChange={handleChange("dimensionUnit")} className={sel}><option value="cm">CM</option><option value="ft">FT</option></select></Field>
                      <Field label="Number of Pieces"><input type="number" min="0" step="1" placeholder="1" value={form.dimensionPieces} onChange={handleChange("dimensionPieces")} className={inp} /></Field>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Field label="Cubic Feet (Auto)"><input type="text" readOnly value={cubicFeet > 0 ? cubicFeet.toFixed(2) : "0.00"} className={inpRo} /></Field>
                      <Field label="Volumetric Weight (Auto)"><input type="text" readOnly value={volumetricWeight > 0 ? volumetricWeight.toFixed(2) : "0.00"} className={inpRo} /></Field>
                      <Field label="CBM (Auto)"><input type="text" readOnly value={cbm > 0 ? cbm.toFixed(4) : "0.0000"} className={inpRo} /></Field>
                    </div>
                  </div>

                  <div className="xl:col-span-6"><Field label="Description of Goods"><textarea rows="3" placeholder="Detailed goods description" value={form.goodsDescription} onChange={handleChange("goodsDescription")} className={`${ta} min-h-[90px]`} /></Field></div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_0.9fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Freight Summary</p>
                      <h3 className="text-base font-semibold text-slate-900">Charges</h3>
                    </div>
                    <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      ['freight', 'Freight'],
                      ['hamali', 'Hamali'],
                      ['doorDelivery', 'Door Delivery'],
                      ['localCartageCharges', 'Local Cartage Charges'],
                      ['selfBuiltyCharge', 'Self Builty Charge'],
                      ['builtyCharge', 'Builty Charge'],
                      ['otherCharges', 'Other Charges'],
                      ...(form.paymentType === "to_pay" ? [['toPayBuiltyCharge', 'To Pay Builty Charge']] : []),
                      ['gstOnFreight', 'GST on Freight']
                    ].map(([k, l]) => {
                      const isReadonly = k === 'toPayBuiltyCharge';
                      const inputValue = isReadonly ? toPayBuiltyCharge : (form[k] ?? "");

                      return (
                        <div key={k} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                          <label className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                            <span>{l}</span>
                            {k === "freight" && rateBadge === "auto-customer" && (
                              <>
                                <span className="rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-700">Auto Rate Applied</span>
                                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-700">Customer Rate</span>
                              </>
                            )}
                            {k === "freight" && rateBadge === "auto-general" && (
                              <>
                                <span className="rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-700">Auto Rate Applied</span>
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-700">General Rate</span>
                              </>
                            )}
                            {k === "freight" && rateBadge === "manual" && (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700">Manual Override</span>
                            )}
                            {k === "freight" && rateBadge === "missing" && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">No Rate Found</span>
                            )}
                          </label>
                          <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base font-semibold text-slate-400">₹</span>
                            <input
                              type="number"
                              name={k}
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={inputValue}
                              onChange={!isReadonly ? handleChange(k) : undefined}
                              readOnly={isReadonly}
                              className={`${inp} pl-8 ${isReadonly ? "cursor-default bg-slate-100 text-slate-600" : ""}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-700">Total</p>
                      <h3 className="text-base font-semibold text-slate-900">Amount due</h3>
                    </div>
                    <div className="rounded-lg bg-white/80 p-1.5 text-orange-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#0B1F33] p-3 text-white">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-slate-300">Grand Total</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-semibold text-orange-400">₹</span>
                        <input type="text" readOnly value={totalStr || "0.00"} className="w-32 bg-transparent text-right text-2xl font-bold text-white outline-none" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">Payment</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['to_pay','paid','tbb'].map((v) => (
                        <button key={v} type="button" name={v === "to_pay" ? "paymentType" : undefined} onClick={() => setForm((p)=>({...p,paymentType:v}))} className={`h-[42px] rounded-lg text-[13px] font-semibold transition ${form.paymentType===v ? "bg-[#0B1F33] text-white shadow-sm" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                          {v === 'to_pay' ? 'To Pay' : v === 'paid' ? 'Paid' : 'TBB'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-4 z-20 flex items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
                <button type="button" onClick={handleReset} className="inline-flex h-[42px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-[14px] font-semibold text-slate-700 hover:bg-slate-50">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>Reset
                </button>
                <button type="submit" className="inline-flex h-[42px] items-center gap-2 rounded-xl px-6 text-[14px] font-semibold text-white hover:opacity-90" style={{ backgroundColor: ORANGE, boxShadow: "0 10px 22px -8px rgba(249,115,22,0.6)" }}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>{isEditMode ? "Update & Print LR" : "Save & Print LR"}
                </button>
                <button type="button" onClick={handlePrint} className="inline-flex h-[42px] items-center gap-2 rounded-xl border border-[#0B1F33] bg-white px-5 text-[14px] font-semibold text-[#0B1F33] hover:bg-slate-50">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9V3h12v6M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-12 0v3h12v-3M6 13h12" /></svg>Print LR
                </button>
              </div>
            </form>
          </div>
        </main>

        <section className="lr-print-sheet" aria-label="Assam Goods Carrier LR print view">
          <div className="lr-print-paper">
            <div className="lr-print-header">
              <div className="lr-brand"><img src="/brand/agc-logo.jpg" alt="Assam Goods Carrier" className="lr-logo-img" /><div><strong>ASSAM GOODS CARRIER</strong><span>SAFE • RELIABLE • ON TIME</span></div></div>
              <div className="lr-title"><strong>BILTY / LR</strong><span>GOODS CONSIGNMENT NOTE</span></div>
              <div className="lr-reference"><span>LR NUMBER</span><strong>{currentLrNumber}</strong><Code128Barcode value={currentLrNumber} /></div>
              <div className="lr-datetime"><span>BOOKING DATE <b>{printText(form.bookingDate)}</b></span><span>BOOKING TIME <b>{printText(form.bookingTime)}</b></span></div>
            </div>

            <div className="lr-info-row"><span><b>BOOKING BRANCH</b>{printText(form.bookingBranch)}</span><span><b>DELIVERY BRANCH</b>{printText(form.deliveryBranch)}</span><span><b>DELIVERY AT</b>{printText(form.deliveryAt)}</span><strong className={`lr-payment ${form.paymentType}`}>{paymentLabel}</strong></div>

            <div className="lr-party-grid">
              <div className="lr-section-box"><h3>CONSIGNOR</h3><p><b>Name</b>{printText(form.consignorName)}</p><p><b>Mobile</b>{printText(form.consignorMobile)} <b>GST</b>{printText(form.consignorGst)}</p><p><b>Address</b>{printText(form.consignorAddress)}</p></div>
              <div className="lr-section-box"><h3>CONSIGNEE</h3><p><b>Name</b>{printText(form.consigneeName)}</p><p><b>Mobile</b>{printText(form.consigneeMobile)} <b>GST</b>{printText(form.consigneeGst)}</p><p><b>Address</b>{printText(form.consigneeAddress)}</p></div>
            </div>

            <div className="lr-section-box lr-goods-box"><h3>GOODS DETAILS</h3><table><thead><tr><th>Articles</th><th>Package Type</th><th>Pieces</th><th>Private Mark</th><th>Invoice No</th><th>E-Way Bill</th></tr></thead><tbody><tr><td>{printText(form.articles)}</td><td>{printText(form.packageType)}</td><td>{printText(form.noOfPackages)}</td><td>{printText(form.privateMark)}</td><td>{printText(form.invoiceNumber)}</td><td>{printText(form.ewayBillNumber)}</td></tr></tbody></table><div className="lr-goods-meta"><span><b>Risk:</b> {printText(form.riskType).replace("_risk", "")}</span><span><b>Declared Value:</b> ₹{printText(form.declaredValue, "0.00")}</span></div></div>

            <div className="lr-detail-grid">
              <div className="lr-section-box"><h3>DIMENSIONS &amp; WEIGHT</h3><div className="lr-stat-grid"><span><b>Length</b>{printText(form.dimensionLength, "0")}</span><span><b>Width</b>{printText(form.dimensionWidth, "0")}</span><span><b>Height</b>{printText(form.dimensionHeight, "0")}</span><span><b>Unit</b>{form.dimensionUnit.toUpperCase()}</span><span><b>Pieces</b>{printText(form.dimensionPieces, "1")}</span><span><b>Cubic Feet</b>{cubicFeet.toFixed(2)}</span><span><b>CBM</b>{cbm.toFixed(4)}</span><span><b>Volumetric Wt</b>{volumetricWeight.toFixed(2)} KG</span></div><div className="lr-weight-row"><span><b>Actual Weight</b>{actualWeight.toFixed(2)} KG</span><span><b>Charged Weight (Auto)</b>{chargedWeight.toFixed(2)} KG</span><small>{chargedByVolumetricWeight ? "Charged by Volumetric Weight" : "Charged by Actual Weight"}</small></div></div>
              <div className="lr-section-box lr-charge-box"><h3>CHARGES BREAKUP</h3><table><tbody><tr><td>Freight</td><td>₹{compute("freight").toFixed(2)}</td><td>Hamali</td><td>₹{compute("hamali").toFixed(2)}</td></tr><tr><td>Door Delivery</td><td>₹{compute("doorDelivery").toFixed(2)}</td><td>Local Cartage Charges</td><td>₹{compute("localCartageCharges").toFixed(2)}</td></tr><tr><td>Self Builty Charge</td><td>₹{compute("selfBuiltyCharge").toFixed(2)}</td><td>Builty Charge (Fixed)</td><td>₹{builtyCharge.toFixed(2)}</td></tr><tr><td>To Pay Extra Charge</td><td>₹{toPayBuiltyCharge.toFixed(2)}</td><td>Other Charges</td><td>₹{compute("otherCharges").toFixed(2)}</td></tr><tr><td>GST on Freight</td><td>₹{compute("gstOnFreight").toFixed(2)}</td><td></td><td></td></tr></tbody></table><div className="lr-grand-total"><span>GRAND TOTAL</span><strong>₹{totalStr || "0.00"}</strong></div></div>
            </div>

            <div className="lr-signatures"><div>Booking Clerk Signature</div><div>Receiver Signature</div><div>Customer Signature</div></div>
            <div className="lr-footer">Assam Goods Carrier <span>•</span> Subject to Company Rules.</div>
          </div>
        </section>
        <style jsx global>{`
          .lr-print-sheet { display: none; }
          @media print {
            @page { size: A4 landscape; margin: 8mm; }
            html, body { background: #fff !important; }
            .sidebar, header, .sticky, .screen-only { display: none !important; }
            .lr-print-sheet { display: block !important; width: 100%; color: #0B1F33; font-family: Arial, Helvetica, sans-serif; }
            .lr-print-paper { width: 100%; height: 194mm; overflow: hidden; border: 0.35mm solid #0B1F33; padding: 3mm; box-sizing: border-box; page-break-inside: avoid; }
            .lr-print-header { display: grid; grid-template-columns: 1.35fr 1fr 1.15fr 0.9fr; align-items: stretch; border-bottom: 0.35mm solid #0B1F33; }
            .lr-brand, .lr-title, .lr-reference, .lr-datetime { min-height: 22mm; padding: 2mm; border-right: 0.2mm solid #94a3b8; }
            .lr-datetime { border-right: 0; display: flex; flex-direction: column; justify-content: center; gap: 2mm; font-size: 6.5pt; }
            .lr-datetime span, .lr-reference > span { display: flex; flex-direction: column; gap: 0.7mm; color: #64748b; font-size: 5.5pt; font-weight: 700; letter-spacing: 0.4mm; }
            .lr-datetime b { color: #0B1F33; font-size: 8pt; letter-spacing: 0; }
            .lr-brand { display: flex; align-items: center; gap: 2mm; }
            .lr-logo-img { height: 13mm; width: auto; object-fit: contain; }
            .lr-logo { display: none; }
            .lr-brand strong { display: block; font-size: 12pt; letter-spacing: 0.3mm; }
            .lr-brand span, .lr-title span { display: block; margin-top: 1mm; color: #64748b; font-size: 6pt; font-weight: 700; letter-spacing: 0.8mm; }
            .lr-title { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
            .lr-title strong { font-size: 16pt; letter-spacing: 1.1mm; }
            .lr-reference strong { display: block; margin: 1mm 0; color: #F97316; font-size: 12pt; letter-spacing: 0.7mm; }
            .barcode-box { display: flex; width: 180px; flex-direction: column; align-items: flex-start; gap: 0.5mm; overflow: visible; }
            .barcode-box svg { display: block; width: 180px; height: 42px; max-width: none; overflow: visible; background: #fff; }
            .barcode-number { color: #0B1F33; font-size: 5.5pt; letter-spacing: 0.7mm; line-height: 1; }
            .lr-info-row { display: grid; grid-template-columns: 1fr 1fr 1.35fr 0.55fr; border: 0.25mm solid #0B1F33; border-top: 0; }
            .lr-info-row > span, .lr-info-row > strong { min-height: 11mm; padding: 1.5mm 2mm; border-right: 0.2mm solid #94a3b8; font-size: 8pt; }
            .lr-info-row > strong { display: flex; align-items: center; justify-content: center; border-right: 0; font-size: 8pt; }
            .lr-info-row span b { display: block; margin-bottom: 1mm; color: #64748b; font-size: 5.5pt; letter-spacing: 0.5mm; }
            .lr-payment { border: 0.4mm solid #F97316; color: #F97316; }
            .lr-payment.paid { border-color: #15803d; color: #15803d; }
            .lr-payment.tbb { border-color: #2563eb; color: #2563eb; }
            .lr-party-grid, .lr-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; margin-top: 2mm; }
            .lr-section-box { border: 0.25mm solid #0B1F33; overflow: hidden; }
            .lr-section-box h3 { margin: 0; padding: 1.2mm 2mm; background: #0B1F33; color: #fff; font-size: 7pt; letter-spacing: 0.6mm; }
            .lr-section-box p { display: grid; grid-template-columns: 18mm 1fr; gap: 2mm; margin: 0; min-height: 6mm; padding: 1mm 2mm; border-bottom: 0.2mm solid #cbd5e1; font-size: 7pt; }
            .lr-section-box p:last-child { border-bottom: 0; }
            .lr-section-box p b { color: #64748b; font-size: 6pt; text-transform: uppercase; }
            .lr-goods-box { margin-top: 2mm; }
            .lr-goods-box table, .lr-charge-box table { width: 100%; border-collapse: collapse; font-size: 7pt; }
            .lr-goods-box th, .lr-goods-box td, .lr-charge-box td { border: 0.2mm solid #cbd5e1; padding: 1.3mm 1.5mm; text-align: left; }
            .lr-goods-box th { background: #e2e8f0; color: #0B1F33; font-size: 6pt; letter-spacing: 0.3mm; }
            .lr-goods-box td:not(:first-child), .lr-goods-box th:not(:first-child) { text-align: center; }
            .lr-goods-meta { display: flex; justify-content: flex-end; gap: 10mm; padding: 1.3mm 2mm; font-size: 7pt; }
            .lr-detail-grid { grid-template-columns: 1.25fr 1fr; }
            .lr-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); }
            .lr-stat-grid span { display: flex; flex-direction: column; gap: 1mm; min-height: 9mm; padding: 1.5mm 2mm; border-right: 0.2mm solid #cbd5e1; border-bottom: 0.2mm solid #cbd5e1; font-size: 7pt; }
            .lr-stat-grid b, .lr-weight-row b { color: #64748b; font-size: 5.5pt; text-transform: uppercase; }
            .lr-weight-row { display: grid; grid-template-columns: 1fr 1fr; position: relative; padding: 1.5mm 2mm; font-size: 8pt; }
            .lr-weight-row span { display: flex; flex-direction: column; gap: 1mm; }
            .lr-weight-row small { position: absolute; right: 2mm; bottom: 1mm; color: #F97316; font-size: 5.5pt; font-weight: 700; }
            .lr-charge-box td:nth-child(even) { width: 18mm; text-align: right; font-weight: 700; }
            .lr-grand-total { display: flex; align-items: center; justify-content: space-between; margin: 2mm; padding: 2mm 3mm; background: #F97316; color: #fff; }
            .lr-grand-total span { font-size: 9pt; font-weight: 800; letter-spacing: 0.8mm; }
            .lr-grand-total strong { font-size: 15pt; }
            .lr-signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14mm; margin-top: 5mm; padding: 0 3mm; }
            .lr-signatures div { padding-top: 7mm; border-top: 0.25mm solid #64748b; text-align: center; color: #64748b; font-size: 6.5pt; }
            .lr-footer { margin-top: 3mm; border-top: 0.2mm solid #cbd5e1; padding-top: 1.5mm; text-align: center; color: #64748b; font-size: 6pt; }
          }
        `}</style>
      </div>
    </div>
  );
}
