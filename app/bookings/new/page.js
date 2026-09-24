"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "../../../components/layout/AppLayout";

const LrPrintLayout = dynamic(() => import("../../../components/bookings/LrPrintLayout"), {
  ssr: false,
});
import SearchableSelect from "../../../components/ui/SearchableSelect";
import PartySearchSelect from "../../../components/bookings/PartySearchSelect";
import { INDIA_CITY_OPTIONS } from "@/lib/indiaCities";
import { loadRatesWithMigration } from "@/lib/rateClient";
import { godownFieldsFromRateMaster } from "@/lib/rateStationMatch";

const NAVY = "#071B34";
const NAVY_LIGHT = "#14304D";
const ORANGE = "#F97316";
const LR_STORAGE_KEY = "agc_next_lr";
const FIRST_LR_NUMBER = 7900000001;
const COD_HANDLING_FEE = 100;
const HAMALI_PER_PACKAGE = 5;
const DEFAULT_LR_CODE = "AGC";
const DEFAULT_BOOKING_BRANCH = "Panchkula, Haryana";
const CONSIGNEE_ID_TYPES = ["GST", "PAN", "Aadhaar"];

const CONSIGNEE_ID_META = {
  GST: {
    label: "GSTIN",
    placeholder: "15-character GSTIN",
    inputMode: "text",
    maxLength: 15,
    normalize: (value) => String(value || "").replace(/\s/g, "").toUpperCase().slice(0, 15),
  },
  PAN: {
    label: "PAN Number",
    placeholder: "e.g. ABCDE1234F",
    inputMode: "text",
    maxLength: 10,
    normalize: (value) => String(value || "").replace(/\s/g, "").toUpperCase().slice(0, 10),
  },
  Aadhaar: {
    label: "Aadhaar Number",
    placeholder: "12-digit Aadhaar",
    inputMode: "numeric",
    maxLength: 12,
    normalize: (value) => String(value || "").replace(/\D/g, "").slice(0, 12),
  },
};

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_PATTERN = /^\d{12}$/;

const resolveConsigneeIdFromRecord = (consignee = {}) => {
  const idType = consignee.idType || "GST";
  const idNumber = String(consignee.idNumber || consignee.gst || "").trim();
  return {
    idType: CONSIGNEE_ID_TYPES.includes(idType) ? idType : "GST",
    idNumber,
    gst: idType === "GST" ? idNumber : String(consignee.gst || "").trim(),
  };
};

const validateConsigneeId = (idType, idNumber) => {
  const value = String(idNumber || "").trim();
  if (!value) return { ok: true };
  if (idType === "GST") {
    const normalized = value.replace(/\s/g, "").toUpperCase();
    return GSTIN_PATTERN.test(normalized)
      ? { ok: true }
      : { ok: false, message: "Enter a valid 15-character GSTIN." };
  }
  if (idType === "PAN") {
    const normalized = value.replace(/\s/g, "").toUpperCase();
    return PAN_PATTERN.test(normalized)
      ? { ok: true }
      : { ok: false, message: "Enter a valid PAN (e.g. ABCDE1234F)." };
  }
  if (idType === "Aadhaar") {
    const digits = value.replace(/\D/g, "");
    return AADHAAR_PATTERN.test(digits)
      ? { ok: true }
      : { ok: false, message: "Enter a valid 12-digit Aadhaar number." };
  }
  return { ok: true };
};

const getTodayDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const getCurrentTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

const PINCODE_API_BASE = "https://api.postalpincode.in/pincode";

const lookupPincode = async (pincode) => {
  const response = await fetch(`${PINCODE_API_BASE}/${pincode}`);
  if (!response.ok) {
    throw new Error("Pincode lookup failed");
  }
  const payload = await response.json();
  const block = Array.isArray(payload) ? payload[0] : null;
  if (!block || block.Status !== "Success" || !Array.isArray(block.PostOffice) || !block.PostOffice.length) {
    return { ok: false, message: block?.Message || "No records found" };
  }
  const office = block.PostOffice[0];
  return {
    ok: true,
    city: office.District || office.Name || "",
    state: office.State || "",
  };
};

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

const normalizeStationKey = (value) => String(value || "").trim().toLowerCase().split(",")[0].trim();

const stationKeysLooselyMatch = (destinationKey, rateKey) => {
  if (!destinationKey || !rateKey) return false;
  if (destinationKey === rateKey) return true;
  const destFirst = destinationKey.split(/\s+/)[0];
  const rateFirst = rateKey.split(/\s+/)[0];
  if (destFirst && rateFirst && destFirst === rateFirst) return true;
  if (destinationKey.startsWith(`${rateKey} `) || rateKey.startsWith(`${destinationKey} `)) return true;
  return false;
};

const findGeneralRateByStation = (station, rates) => {
  const key = normalizeStationKey(station);
  if (!key) return null;
  const list = Array.isArray(rates) ? rates : [];
  return list.find((rate) => {
    const isActive = (rate.status || "Active") === "Active";
    if (!isActive || !rate.generalRate) return false;
    const stationCandidates = [rate.toStation, rate.toBranchName, rate.toBranch].map(normalizeStationKey);
    return stationCandidates.some((candidate) => stationKeysLooselyMatch(key, candidate));
  }) || null;
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
  rates: rateList,
}) => {
  const rates = (Array.isArray(rateList) ? rateList : []).filter((rate) => (rate.status || "Active") === "Active");
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
  const [lrMode, setLrMode] = useState("automatic");
  const lrInputRef = useRef(null);
  const [customers, setCustomers] = useState([]);
  const [customerSearchRole, setCustomerSearchRole] = useState("");
  const [consignorPartyId, setConsignorPartyId] = useState("");
  const [consigneePartyId, setConsigneePartyId] = useState("");
  const [partySaveState, setPartySaveState] = useState({ consignor: "", consignee: "" });
  const [branches, setBranches] = useState([]);
  const [branchSearchRole, setBranchSearchRole] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [rateLookupReady, setRateLookupReady] = useState(false);
  const [rateBadge, setRateBadge] = useState("");
  const [destinations, setDestinations] = useState([]);
  const [rateMaster, setRateMaster] = useState([]);
  const [timeIsManual, setTimeIsManual] = useState(false);
  const [hamaliManuallyEdited, setHamaliManuallyEdited] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState({
    consignor: false,
    consignee: false,
  });
  const [pincodeErrors, setPincodeErrors] = useState({
    consignor: "",
    consignee: "",
  });
  const [routeLoading, setRouteLoading] = useState({ from: false, to: false });
  const [routeError, setRouteError] = useState({ from: "", to: "" });
  const [routeAutoFilled, setRouteAutoFilled] = useState({ from: false, to: false });
  const lastPincodeFetchRef = useRef({ consignor: "", consignee: "" });
  const lastRoutePincodeFetchRef = useRef({ from: "", to: "" });
  const [form, setForm] = useState({
    lrNumber: String(FIRST_LR_NUMBER), lrCode: DEFAULT_LR_CODE, bookingDate: getTodayDate(), bookingTime: getCurrentTime(), bookingBranch: DEFAULT_BOOKING_BRANCH,
    consignorName: "", consignorMobile: "", consignorGst: "", consignorPincode: "",
    consignorCity: "", consignorState: "", consignorAddress: "",
    consigneeName: "", consigneeMobile: "", consigneeIdType: "GST", consigneeIdNumber: "", consigneeGst: "", consigneePincode: "",
    consigneeCity: "", consigneeState: "", consigneeAddress: "",
    deliveryBranch: "", toStation: "", deliveryAt: "", godownAddress: "", godownMobile: "",
    rate: "", rateSource: "manual", rateType: "Per Kg",
    articles: "", packageType: "", noOfPackages: "", privateMark: "", goodsDescription: "",
    invoiceNumber: "", ewayBillNumber: "", actualWeight: "", chargedWeight: "",
    dimensionLength: "", dimensionWidth: "", dimensionHeight: "",
    dimensionUnit: "cm", dimensionPieces: "1",
    riskType: "", declaredValue: "", codAmount: 0,
    freight: "", freightManuallyEdited: false, fmChargeRate: 1.50, fmChargeAmount: "", hamali: "", doorDelivery: "", localCartageCharges: "", selfBuiltyCharge: "", otherCharges: "",
    builtyCharge: "150",
    paymentType: "to_pay",
    deliveryType: "door",
    handlingType: "fm",
  });

  const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

  const cityOptions = useMemo(() => INDIA_CITY_OPTIONS, []);

  const autoFillRate = useCallback((station, deliveryTypeOverride) => {
    const key = normalizeStationKey(station);
    if (!key) {
      setForm((previous) => ({ ...previous, rate: "", rateSource: "manual" }));
      return;
    }
    const match = findGeneralRateByStation(station, rateMaster);
    if (match) {
      setForm((previous) => {
        const deliveryType = deliveryTypeOverride ?? previous.deliveryType;
        const godownAddress = match.godownAddress || previous.godownAddress || "";
        const godownMobile = match.godownMobile || previous.godownMobile || "";
        const updates = {
          ...previous,
          rate: String(match.rate ?? ""),
          rateType: match.rateType || "Per Kg",
          rateSource: "auto",
          freightManuallyEdited: false,
          godownAddress,
          godownMobile,
        };
        if (deliveryType === "godown" && godownAddress) {
          updates.deliveryAt = godownAddress;
        }
        return updates;
      });
      setRateBadge("auto-general");
    } else {
      setForm((previous) => ({ ...previous, rate: "", rateSource: "manual" }));
      setRateBadge("missing");
    }
  }, [rateMaster]);

  const enableRateLookup = () => {
    setRateLookupReady(true);
    setForm((previous) => ({ ...previous, freightManuallyEdited: false }));
  };

  const handleFromChange = (value) => {
    setRouteAutoFilled((previous) => ({ ...previous, from: false }));
    setRouteError((previous) => ({ ...previous, from: "" }));
    if (!/^\d{6}$/.test(String(value || "").trim())) {
      lastRoutePincodeFetchRef.current.from = "";
    }
    setForm((previous) => ({ ...previous, bookingBranch: value }));
    enableRateLookup();
  };

  const handleDestinationChange = (value) => {
    setRouteAutoFilled((previous) => ({ ...previous, to: false }));
    setRouteError((previous) => ({ ...previous, to: "" }));
    if (!/^\d{6}$/.test(String(value || "").trim())) {
      lastRoutePincodeFetchRef.current.to = "";
    }
    const station = String(value || "").trim();
    const branchKey = station.split(",")[0].trim() || station;
    setForm((previous) => ({ ...previous, toStation: station, deliveryBranch: branchKey }));
    autoFillRate(branchKey);
    enableRateLookup();
  };

  const handleDeliveryAtChange = (value) => {
    const trimmed = String(value || "").trim();
    setForm((previous) => {
      const destEmpty = !String(previous.toStation || "").trim();
      return {
        ...previous,
        deliveryAt: trimmed,
        ...(destEmpty ? { toStation: trimmed, deliveryBranch: trimmed } : {}),
      };
    });
    const rateKey = trimmed.split(",")[0].trim() || trimmed;
    autoFillRate(rateKey);
    enableRateLookup();
  };

  const flashRouteAutoFilled = (role) => {
    setRouteAutoFilled((previous) => ({ ...previous, [role]: true }));
    window.setTimeout(() => {
      setRouteAutoFilled((previous) => ({ ...previous, [role]: false }));
    }, 2000);
  };

  const handleRoutePincodeDetected = (role) => async (pincode) => {
    if (lastRoutePincodeFetchRef.current[role] === pincode) return;
    lastRoutePincodeFetchRef.current[role] = pincode;
    setRouteLoading((previous) => ({ ...previous, [role]: true }));
    setRouteError((previous) => ({ ...previous, [role]: "" }));

    try {
      const result = await lookupPincode(pincode);
      if (!result.ok) {
        setRouteError((previous) => ({ ...previous, [role]: result.message || "Pincode not found" }));
        lastRoutePincodeFetchRef.current[role] = "";
        return;
      }
      const display = `${result.city}, ${result.state}`;
      if (role === "from") {
        setForm((previous) => ({ ...previous, bookingBranch: display }));
        enableRateLookup();
      } else {
        const branchKey = result.city;
        setForm((previous) => ({
          ...previous,
          toStation: display,
          deliveryBranch: branchKey,
        }));
        autoFillRate(branchKey);
        enableRateLookup();
      }
      flashRouteAutoFilled(role);
    } catch {
      setRouteError((previous) => ({ ...previous, [role]: "Network error" }));
      lastRoutePincodeFetchRef.current[role] = "";
    } finally {
      setRouteLoading((previous) => ({ ...previous, [role]: false }));
    }
  };

  const handleRateChange = (event) => {
    const value = event.target.value;
    setForm((previous) => ({ ...previous, rate: value, rateSource: "manual" }));
    setRateBadge("manual");
    enableRateLookup();
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editRequested = params.get("edit") === "true";
    const lr = params.get("lr");

    if (editRequested && lr) {
      (async () => {
      try {
        const response = await fetch(`/api/bookings/${encodeURIComponent(lr)}`);
        const data = await response.json();
        const record = response.ok ? data.booking : null;
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
        setTimeIsManual(true);
        setHamaliManuallyEdited(false);
        setRateLookupReady(false);
        setRateBadge("");
        setForm((previous) => ({
          ...previous,
          lrNumber: record.lrNumber,
          lrCode: record.lrCode || DEFAULT_LR_CODE,
          bookingDate: record.date || "",
          bookingTime: record.time || "",
          bookingBranch: route.bookingBranch || DEFAULT_BOOKING_BRANCH,
          consignorName: consignor.name || "",
          consignorMobile: consignor.mobile || "",
          consignorGst: consignor.gst || "",
          consignorPincode: consignor.pincode || "",
          consignorCity: consignor.city || "",
          consignorState: consignor.state || "",
          consignorAddress: consignor.address || "",
          consigneeName: consignee.name || "",
          consigneeMobile: consignee.mobile || "",
          ...(() => {
            const id = resolveConsigneeIdFromRecord(consignee);
            return {
              consigneeIdType: id.idType,
              consigneeIdNumber: id.idNumber,
              consigneeGst: id.gst,
            };
          })(),
          consigneePincode: consignee.pincode || "",
          consigneeCity: consignee.city || "",
          consigneeState: consignee.state || "",
          consigneeAddress: consignee.address || "",
          deliveryBranch: route.deliveryBranch || "",
          toStation: route.toStation || route.deliveryBranch || "",
          deliveryAt: route.deliveryAt || "",
          godownAddress: record.godownAddress || route.godownAddress || route.deliveryAt || "",
          godownMobile: record.godownMobile || route.godownMobile || "",
          rate: record.unitRate ? String(record.unitRate) : "",
          rateSource: record.rateSource || "manual",
          rateType: record.rateType || "Per Kg",
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
          codAmount: goods.codAmount ?? 0,
          freight: charges.freight ?? "",
          hamali: charges.hamali ?? "",
          doorDelivery: charges.doorDelivery ?? "",
          localCartageCharges: charges.localCartageCharges ?? "",
          selfBuiltyCharge: charges.selfBuiltyCharge ?? "",
          otherCharges: charges.otherCharges ?? "",
          freightManuallyEdited: false,
          builtyCharge: charges.builtyCharge ?? "150",
          fmChargeRate: charges.fmChargeRate ?? 1.5,
          fmChargeAmount: charges.fmChargeAmount != null ? String(charges.fmChargeAmount) : "",
          handlingType: record.handlingType || (Boolean(charges.fmCharges) || Number(charges.fmChargeAmount) > 0 ? "fm" : "selfdrop"),
          paymentType: record.paymentType || "to_pay",
          deliveryType: record.deliveryType || "door",
        }));
      } catch {
        window.alert("Unable to load booking for edit.");
      }
      })();
      return;
    }

    const nextLr = readNextLrNumber();
    setTimeIsManual(false);
    setForm((previous) => ({
      ...previous,
      lrNumber: nextLr,
      bookingDate: getTodayDate(),
      bookingTime: getCurrentTime(),
    }));
    setRateLookupReady(true);
  }, []);

  useEffect(() => {
    if (isEditMode || timeIsManual) return undefined;
    const tick = () => {
      setForm((previous) => ({ ...previous, bookingTime: getCurrentTime() }));
    };
    const intervalId = window.setInterval(tick, 60000);
    return () => window.clearInterval(intervalId);
  }, [isEditMode, timeIsManual]);

  useEffect(() => {
    try {
      setCustomers(JSON.parse(window.localStorage.getItem("agc_customers") || "[]"));
      setBranches(JSON.parse(window.localStorage.getItem("agc_branches") || "[]").filter((branch) => branch.status !== "Disabled"));
    } catch {
      setCustomers([]);
      setBranches([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rates = await loadRatesWithMigration();
        if (cancelled) return;
        setRateMaster(rates);
        const stationList = [
          ...new Set(
            rates
              .filter((rate) => (rate.status || "Active") === "Active")
              .map((rate) => {
                const station = rate.toStation || rate.toBranchName || rate.toBranch;
                return station ? String(station).trim() : "";
              })
              .filter(Boolean),
          ),
        ].sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: "base" }));
        setDestinations(stationList);
      } catch {
        if (!cancelled) {
          setRateMaster([]);
          setDestinations([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    if (field === "freight") {
      setForm((previous) => ({ ...previous, freight: value, freightManuallyEdited: true }));
      setRateBadge("manual");
      return;
    }
    setForm((previous) => ({ ...previous, [field]: value }));
    if (RATE_TRIGGER_FIELDS.includes(field)) enableRateLookup();
  };

  const handleConsigneeIdTypeChange = (event) => {
    const idType = event.target.value;
    setForm((previous) => ({
      ...previous,
      consigneeIdType: idType,
      consigneeIdNumber: "",
      consigneeGst: "",
    }));
  };

  const handleConsigneeIdNumberChange = (event) => {
    const idType = form.consigneeIdType || "GST";
    const meta = CONSIGNEE_ID_META[idType] || CONSIGNEE_ID_META.GST;
    const normalized = meta.normalize(event.target.value);
    setForm((previous) => ({
      ...previous,
      consigneeIdNumber: normalized,
      ...(idType === "GST" ? { consigneeGst: normalized } : { consigneeGst: "" }),
    }));
  };

  const handleFreightAutoRecalculate = () => {
    setForm((previous) => ({ ...previous, freightManuallyEdited: false }));
    setRateBadge(form.rateSource === "auto" ? "auto-general" : "");
  };

  const handleBookingTimeChange = (event) => {
    setTimeIsManual(true);
    handleChange("bookingTime")(event);
  };

  const isBookingToday = form.bookingDate === getTodayDate();

  const customerRoleFields = {
    consignor: { name: "consignorName", mobile: "consignorMobile", gst: "consignorGst", address: "consignorAddress", pincode: "consignorPincode", city: "consignorCity", state: "consignorState" },
    consignee: { name: "consigneeName", mobile: "consigneeMobile", gst: "consigneeGst", address: "consigneeAddress", pincode: "consigneePincode", city: "consigneeCity", state: "consigneeState" },
  };

  const handlePincodeChange = (role) => async (event) => {
    const digits = event.target.value.replace(/\D/g, "").slice(0, 6);
    const fields = customerRoleFields[role];
    setForm((previous) => ({ ...previous, [fields.pincode]: digits }));
    setPincodeErrors((previous) => ({ ...previous, [role]: "" }));

    if (digits.length < 6) {
      setPincodeLoading((previous) => ({ ...previous, [role]: false }));
      lastPincodeFetchRef.current[role] = "";
      return;
    }

    if (lastPincodeFetchRef.current[role] === digits) return;
    lastPincodeFetchRef.current[role] = digits;
    setPincodeLoading((previous) => ({ ...previous, [role]: true }));

    try {
      const result = await lookupPincode(digits);
      if (!result.ok) {
        setPincodeErrors((previous) => ({ ...previous, [role]: result.message }));
        setForm((previous) => ({ ...previous, [fields.city]: "", [fields.state]: "" }));
        return;
      }
      const cityState = [result.city, result.state].filter(Boolean).join(", ");
      const districtKey = result.city || cityState;

      setForm((previous) => ({
        ...previous,
        [fields.city]: result.city,
        [fields.state]: result.state,
        ...(role === "consignor" ? { bookingBranch: cityState } : {}),
        ...(role === "consignee"
          ? { toStation: cityState, deliveryBranch: districtKey }
          : {}),
      }));

      if (role === "consignor") {
        setRouteError((previous) => ({ ...previous, from: "" }));
        flashRouteAutoFilled("from");
        enableRateLookup();
      }
      if (role === "consignee") {
        setRouteError((previous) => ({ ...previous, to: "" }));
        autoFillRate(districtKey);
        flashRouteAutoFilled("to");
        enableRateLookup();
      }
    } catch {
      setPincodeErrors((previous) => ({ ...previous, [role]: "Unable to fetch pincode details. Try again." }));
      setForm((previous) => ({ ...previous, [fields.city]: "", [fields.state]: "" }));
    } finally {
      setPincodeLoading((previous) => ({ ...previous, [role]: false }));
    }
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
      ...(role === "consignee"
        ? {
          consigneeIdType: "GST",
          consigneeIdNumber: customer.gst || "",
        }
        : {}),
      paymentType: role === "consignor" && customer.defaultPayment ? customer.defaultPayment : previous.paymentType,
    }));
    setCustomerSearchRole("");
    if (role === "consignor") enableRateLookup();
  };

  const applySavedParty = (role, party) => {
    const fields = customerRoleFields[role];
    const cityState = [party.city, party.state].filter(Boolean).join(", ");
    const consigneeIdType = party.idType || (party.gst ? "GST" : "GST");
    const consigneeIdNumber = party.idNumber || party.gst || "";
    setForm((previous) => ({
      ...previous,
      [fields.name]: party.name || "",
      [fields.mobile]: party.mobile || "",
      [fields.gst]: role === "consignor" ? (party.gst || "") : (consigneeIdType === "GST" ? consigneeIdNumber : ""),
      [fields.address]: party.address || "",
      [fields.pincode]: party.pincode || "",
      [fields.city]: party.city || "",
      [fields.state]: party.state || "",
      ...(role === "consignee"
        ? {
          consigneeIdType,
          consigneeIdNumber,
        }
        : {}),
      ...(role === "consignor" && cityState ? { bookingBranch: cityState } : {}),
      ...(role === "consignee" && cityState
        ? { toStation: cityState, deliveryBranch: party.city || cityState }
        : {}),
    }));
    if (role === "consignor") {
      setConsignorPartyId(party.id || "");
      enableRateLookup();
    } else {
      setConsigneePartyId(party.id || "");
      if (party.city || cityState) autoFillRate(party.city || cityState);
      enableRateLookup();
    }
    setPartySaveState((previous) => ({ ...previous, [role]: "" }));
  };

  const savePartyToDb = async (role) => {
    const fields = customerRoleFields[role];
    const payload = {
      partyType: role,
      name: form[fields.name].trim(),
      mobile: form[fields.mobile],
      gst: role === "consignor" ? form[fields.gst] : (form.consigneeIdType === "GST" ? form.consigneeIdNumber : ""),
      pincode: form[fields.pincode],
      city: form[fields.city],
      state: form[fields.state],
      address: form[fields.address],
      ...(role === "consignee"
        ? {
          idType: form.consigneeIdType || "GST",
          idNumber: form.consigneeIdNumber || "",
        }
        : {}),
    };
    if (!payload.name) {
      window.alert("Party name is required to save.");
      return;
    }
    setPartySaveState((previous) => ({ ...previous, [role]: "saving" }));
    try {
      const partyId = role === "consignor" ? consignorPartyId : consigneePartyId;
      const url = partyId ? `/api/parties/${encodeURIComponent(partyId)}` : "/api/parties";
      const method = partyId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        window.alert(data.error || "Failed to save party.");
        setPartySaveState((previous) => ({ ...previous, [role]: "" }));
        return;
      }
      const savedId = data.party?.id;
      if (role === "consignor" && savedId) setConsignorPartyId(savedId);
      if (role === "consignee" && savedId) setConsigneePartyId(savedId);
      setPartySaveState((previous) => ({ ...previous, [role]: "saved" }));
      window.setTimeout(() => {
        setPartySaveState((previous) => (previous[role] === "saved" ? { ...previous, [role]: "" } : previous));
      }, 2500);
    } catch {
      window.alert("Failed to save party.");
      setPartySaveState((previous) => ({ ...previous, [role]: "" }));
    }
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
    if (!isEditMode) setLrMode("automatic");
    setRateLookupReady(true);
    setRateBadge("");
    setTimeIsManual(false);
    lastPincodeFetchRef.current = { consignor: "", consignee: "" };
    lastRoutePincodeFetchRef.current = { from: "", to: "" };
    setPincodeLoading({ consignor: false, consignee: false });
    setPincodeErrors({ consignor: "", consignee: "" });
    setRouteLoading({ from: false, to: false });
    setRouteError({ from: "", to: "" });
    setRouteAutoFilled({ from: false, to: false });
    setConsignorPartyId("");
    setConsigneePartyId("");
    setPartySaveState({ consignor: "", consignee: "" });
    setHamaliManuallyEdited(false);
    const nextLr = isEditMode ? form.lrNumber : readNextLrNumber();
    setForm({
      lrNumber: nextLr, lrCode: DEFAULT_LR_CODE, bookingDate: getTodayDate(), bookingTime: getCurrentTime(), bookingBranch: DEFAULT_BOOKING_BRANCH,
      consignorName: "", consignorMobile: "", consignorGst: "", consignorPincode: "",
      consignorCity: "", consignorState: "", consignorAddress: "",
      consigneeName: "", consigneeMobile: "", consigneeIdType: "GST", consigneeIdNumber: "", consigneeGst: "", consigneePincode: "",
      consigneeCity: "", consigneeState: "", consigneeAddress: "",
      deliveryBranch: "", toStation: "", deliveryAt: "", godownAddress: "", godownMobile: "",
      rate: "", rateSource: "manual", rateType: "Per Kg",
      articles: "", packageType: "", noOfPackages: "", privateMark: "", goodsDescription: "",
      invoiceNumber: "", ewayBillNumber: "", actualWeight: "", chargedWeight: "",
      dimensionLength: "", dimensionWidth: "", dimensionHeight: "",
      dimensionUnit: "cm", dimensionPieces: "1",
      riskType: "", declaredValue: "", codAmount: 0,
      freight: "", freightManuallyEdited: false, fmChargeRate: 1.50, fmChargeAmount: "", hamali: "", doorDelivery: "", localCartageCharges: "", selfBuiltyCharge: "", otherCharges: "",
      builtyCharge: "150",
      paymentType: "to_pay",
      deliveryType: "door",
      handlingType: "fm",
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
    const nextCharged = chargedWeight > 0 ? chargedWeight.toFixed(2) : "";
    setForm((previous) => (String(previous.chargedWeight) === nextCharged ? previous : { ...previous, chargedWeight: nextCharged }));
  }, [chargedWeight]);

  useEffect(() => {
    if (form.freightManuallyEdited) return;
    const unitRate = Number(form.rate) || 0;
    const rateType = form.rateType || "Per Kg";
    let autoFreight = 0;
    if (rateType === "Per Kg" || rateType === "per_kg") {
      autoFreight = roundMoney(unitRate * chargedWeight);
    } else if (rateType === "Per Package") {
      autoFreight = roundMoney(unitRate * packagesCount);
    } else {
      autoFreight = roundMoney(unitRate);
    }
    const freightStr = autoFreight > 0 ? autoFreight.toFixed(2) : autoFreight === 0 && unitRate === 0 ? "" : "0.00";
    setForm((previous) => (String(previous.freight) === freightStr ? previous : { ...previous, freight: freightStr }));
  }, [form.rate, form.rateType, form.freightManuallyEdited, chargedWeight, packagesCount]);

  useEffect(() => {
    if (hamaliManuallyEdited) return;
    if (packagesCount > 0) {
      const hamaliStr = roundMoney(packagesCount * HAMALI_PER_PACKAGE).toFixed(2);
      setForm((previous) => (String(previous.hamali) === hamaliStr ? previous : { ...previous, hamali: hamaliStr }));
      return;
    }
    setForm((previous) => (previous.hamali === "" ? previous : { ...previous, hamali: "" }));
  }, [form.noOfPackages, hamaliManuallyEdited, packagesCount]);

  useEffect(() => {
    if (!rateLookupReady || form.freightManuallyEdited) return;
    if (form.rateSource === "auto" && Number(form.rate) > 0) return;
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
      rates: rateMaster,
    });
    if (!match) {
      setRateBadge("missing");
      return;
    }
    setForm((previous) => ({
      ...previous,
      rate: String(match.rate.rate ?? ""),
      rateType: match.rate.rateType || "Per Kg",
      rateSource: "auto",
      freightManuallyEdited: false,
    }));
    setRateBadge(match.source === "customer" ? "auto-customer" : "auto-general");
  }, [
    rateLookupReady,
    form.freightManuallyEdited,
    form.consignorName,
    form.consignorMobile,
    form.bookingBranch,
    form.deliveryBranch,
    chargedWeight,
    packagesCount,
    customers,
    branches,
    rateMaster,
    form.rate,
    form.rateSource,
  ]);

  const toPayBuiltyCharge = form.paymentType === "to_pay" ? 100 : 0;
  const builtyCharge = compute("builtyCharge") || 150;
  const freightTotal = compute("freight");
  const codAmountNum = Number(form.codAmount) || 0;
  const codHandlingFee = codAmountNum > 0 ? COD_HANDLING_FEE : 0;

  const fmChargesActive = form.handlingType !== "selfdrop";

  const fmChargeAmount = useMemo(() => (
    fmChargesActive
      ? roundMoney(chargedWeight * (Number(form.fmChargeRate) || 1.5))
      : 0
  ), [fmChargesActive, form.fmChargeRate, chargedWeight]);

  useEffect(() => {
    const next = fmChargeAmount > 0 ? fmChargeAmount.toFixed(2) : "";
    setForm((previous) => (String(previous.fmChargeAmount) === next ? previous : { ...previous, fmChargeAmount: next }));
  }, [fmChargeAmount]);

  const chargesSubtotal = useMemo(() => (
    freightTotal
    + fmChargeAmount
    + compute("hamali")
    + compute("doorDelivery")
    + compute("localCartageCharges")
    + codHandlingFee
    + builtyCharge
    + compute("otherCharges")
    + toPayBuiltyCharge
  ), [
    freightTotal,
    fmChargeAmount,
    form.hamali,
    form.doorDelivery,
    form.localCartageCharges,
    codHandlingFee,
    builtyCharge,
    form.otherCharges,
    toPayBuiltyCharge,
  ]);

  const displayTotal = chargesSubtotal + compute("selfBuiltyCharge");
  const grandTotal = displayTotal;
  const totalStr = grandTotal > 0 ? grandTotal.toFixed(2) : "";

  const otherChargesTotal = useMemo(() => (
    compute("hamali")
    + compute("doorDelivery")
    + compute("localCartageCharges")
    + compute("selfBuiltyCharge")
    + compute("otherCharges")
    + builtyCharge
    + toPayBuiltyCharge
  ), [
    form.hamali,
    form.doorDelivery,
    form.localCartageCharges,
    form.selfBuiltyCharge,
    form.otherCharges,
    builtyCharge,
    toPayBuiltyCharge,
  ]);

  const rateTypeLabel = useMemo(() => {
    const type = form.rateType || "Per Kg";
    if (type === "Per Package") return "₹/package";
    if (type === "Fixed") return "fixed";
    return "₹/kg";
  }, [form.rateType]);

  const freightRateHint = useMemo(() => {
    const unitRate = Number(form.rate) || 0;
    const type = form.rateType || "Per Kg";
    if (type === "Per Kg" || type === "per_kg") {
      const weightLabel = chargedWeight > 0 ? chargedWeight.toFixed(2) : "0";
      return `₹${unitRate}/kg × ${weightLabel} kg`;
    }
    if (type === "Per Package") {
      return `₹${unitRate}/pkg × ${packagesCount} pkg`;
    }
    return `₹${unitRate} fixed`;
  }, [form.rate, form.rateType, chargedWeight, packagesCount]);

  const buildBookingPayload = (existingStatus) => ({
    lrCode: form.lrCode,
    status: existingStatus || "Booked",
    date: form.bookingDate,
    time: form.bookingTime,
    paymentType: form.paymentType,
    deliveryType: form.deliveryType || "door",
    handlingType: form.handlingType === "selfdrop" ? "selfdrop" : "fm",
    godownAddress: form.godownAddress || "",
    godownMobile: form.godownMobile || "",
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
      idType: form.consigneeIdType || "GST",
      idNumber: String(form.consigneeIdNumber || "").trim(),
      gst: form.consigneeIdType === "GST" ? String(form.consigneeIdNumber || "").trim() : "",
      pincode: form.consigneePincode,
      city: form.consigneeCity,
      state: form.consigneeState,
      address: form.consigneeAddress,
    },
    route: {
      bookingBranch: form.bookingBranch,
      deliveryBranch: form.deliveryBranch,
      toStation: form.toStation,
      deliveryAt: form.deliveryAt,
      godownAddress: form.godownAddress || "",
      godownMobile: form.godownMobile || "",
    },
    unitRate: Number(form.rate) || 0,
    rateSource: form.rateSource,
    rateType: form.rateType,
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
      codAmount: Number(form.codAmount) || 0,
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
      gstOnFreight: 0,
      codHandlingFee,
      fmCharges: fmChargesActive,
      fmChargeRate: Number(form.fmChargeRate) || 1.5,
      fmChargeAmount,
      applyGst: false,
      gstRate: 0,
    },
  });

  const handleSubmit = async (e) => {
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
    const consigneeIdCheck = validateConsigneeId(form.consigneeIdType, form.consigneeIdNumber);
    if (!consigneeIdCheck.ok) {
      failValidation(consigneeIdCheck.message, "consigneeIdNumber");
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

    const bookingPayload = buildBookingPayload("Booked");
    let savedLrNumber = form.lrNumber;

    try {
      const response = await fetch(
        isEditMode
          ? `/api/bookings/${encodeURIComponent(form.lrNumber)}`
          : "/api/bookings",
        {
          method: isEditMode ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bookingPayload),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        window.alert(data.error || "Failed to save booking.");
        return;
      }

      savedLrNumber = data.booking?.lrNumber || form.lrNumber;
      if (!isEditMode) {
        setForm((previous) => ({ ...previous, lrNumber: savedLrNumber }));
        window.localStorage.setItem(
          LR_STORAGE_KEY,
          normalizeLrNumber(Number(savedLrNumber) + 1),
        );
      }
    } catch {
      window.alert("Failed to save booking.");
      return;
    }
    const navigateToSavedBooking = () => {
      window.location.href = `/bookings/${encodeURIComponent(savedLrNumber)}`;
    };
    window.addEventListener("afterprint", navigateToSavedBooking, { once: true });
    window.print();
  };
  const handlePrint = async () => {
    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(form.lrNumber)}`);
      if (!response.ok) {
        window.alert("Please save the LR before printing.");
        return;
      }
      window.print();
    } catch {
      window.alert("Please save the LR before printing.");
    }
  };
  const printText = (value, fallback = "-") => value || fallback;
  const paymentLabel = form.paymentType === "to_pay" ? "TO PAY" : form.paymentType === "paid" ? "PAID" : "TBB";
  const deliveryTypeLabel = form.deliveryType === "godown" ? "GODOWN DELIVERY" : "DOOR DELIVERY";
  const handlingTypeLabel = form.handlingType === "selfdrop" ? "SELF DROP" : "FM PICKUP";
  const currentLrNumber = /^79\d{8}$/.test(form.lrNumber) ? form.lrNumber : String(FIRST_LR_NUMBER);

  const lrPrintForm = useMemo(() => {
    const pseudoBooking = {
      deliveryType: form.deliveryType,
      godownAddress: form.godownAddress,
      godownMobile: form.godownMobile,
      route: {
        deliveryBranch: form.deliveryBranch,
        toStation: form.toStation,
        deliveryAt: form.deliveryAt,
        godownAddress: form.godownAddress,
        godownMobile: form.godownMobile,
      },
    };
    const { godownAddress, godownMobile } = godownFieldsFromRateMaster(pseudoBooking, rateMaster);
    return {
      ...form,
      godownAddress,
      godownMobile,
      deliveryAt: form.deliveryAt || (form.deliveryType === "godown" ? godownAddress : ""),
    };
  }, [form, rateMaster]);

  // Compact operator inputs for counter-style booking screen
  const inp = "w-full h-[42px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";
  const inpRo = "w-full h-[42px] cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 text-[14px] font-medium text-slate-600";
  const smInp = "w-full h-[42px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";
  const ta = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100 resize-none";
  const chev = "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:18px_18px] bg-[right_12px_center] bg-no-repeat pr-9";
  const sel = inp + " " + chev;

  return (
    <AppLayout>
      <div className="screen-only">
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

                <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-3">
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
                    <label className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                      <span>Date</span>
                      {isBookingToday && (
                        <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[9px] font-bold normal-case tracking-normal text-green-300">
                          Today
                        </span>
                      )}
                    </label>
                    <input
                      type="date"
                      name="bookingDate"
                      value={form.bookingDate}
                      onChange={handleChange("bookingDate")}
                      className="w-full h-[42px] rounded-lg border border-white/10 bg-white/5 px-3 text-[14px] text-white outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-500/30 [color-scheme:dark]"
                    />
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                    <label className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                      <span>Time</span>
                      {!isEditMode && !timeIsManual ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 px-2 py-0.5 text-[9px] font-bold normal-case tracking-normal text-green-300">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                          </span>
                          Live
                        </span>
                      ) : timeIsManual ? (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold normal-case tracking-normal text-slate-300">
                          Manual
                        </span>
                      ) : null}
                    </label>
                    <input
                      type="time"
                      name="bookingTime"
                      value={form.bookingTime}
                      onChange={handleBookingTimeChange}
                      className="w-full h-[42px] rounded-lg border border-white/10 bg-white/5 px-3 text-[14px] text-white outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-500/30 [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
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
                  <div className="space-y-4">
                    <Field label="Saved party">
                      <PartySearchSelect
                        partyType="consignor"
                        onSelect={(party) => applySavedParty("consignor", party)}
                        placeholder="Select saved consignor…"
                        inputClassName={inp}
                      />
                    </Field>
                    <div className="relative">
                      <Field label="Name">
                        <input type="text" name="consignorName" placeholder="Consignor name / company" value={form.consignorName} onChange={handleCustomerNameChange("consignor")} onFocus={() => setCustomerSearchRole("consignor")} className={inp} />
                      </Field>
                      {customerMatches("consignor").length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                          {customerMatches("consignor").map((customer) => (
                            <button key={customer.id} type="button" onClick={() => selectCustomer("consignor", customer)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-orange-50">
                              <span className="font-semibold text-slate-800">{customer.name}</span>
                              <span className="text-xs text-slate-500">{customer.mobile}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {form.consignorName.trim() && customerMatches("consignor").length === 0 && customerSearchRole === "consignor" && (
                        <button type="button" onClick={() => saveNewCustomer("consignor")} className="mt-1 text-xs font-semibold text-orange-600 hover:text-orange-700">Save New Customer</button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Mobile"><input type="tel" placeholder="Mobile number" value={form.consignorMobile} onChange={handleChange("consignorMobile")} className={inp} /></Field>
                      <Field label="GST"><input type="text" placeholder="GSTIN" value={form.consignorGst} onChange={handleChange("consignorGst")} className={inp} /></Field>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Field label="Pincode">
                        <div className="relative">
                          <input type="text" inputMode="numeric" placeholder="000000" maxLength={6} value={form.consignorPincode} onChange={handlePincodeChange("consignor")} className={inp} />
                          {pincodeLoading.consignor && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-orange-600 animate-pulse">Looking up…</span>
                          )}
                        </div>
                        {pincodeErrors.consignor && <p className="mt-1 text-[11px] font-medium text-red-600">{pincodeErrors.consignor}</p>}
                      </Field>
                      <Field label="City"><input type="text" placeholder="Auto-fill" readOnly value={form.consignorCity} className={inpRo} /></Field>
                      <Field label="State"><input type="text" placeholder="Auto-fill" readOnly value={form.consignorState} className={inpRo} /></Field>
                    </div>
                    <Field label="Address">
                      <textarea rows="3" placeholder="Full consignor address" value={form.consignorAddress} onChange={handleChange("consignorAddress")} className={`${ta} min-h-[88px]`} />
                    </Field>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => savePartyToDb("consignor")}
                        disabled={partySaveState.consignor === "saving"}
                        className="inline-flex h-[42px] items-center gap-2 rounded-lg px-4 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
                        style={{ backgroundColor: NAVY }}
                      >
                        {partySaveState.consignor === "saving" ? "Saving…" : "Save as Party"}
                      </button>
                      {partySaveState.consignor === "saved" && (
                        <span className="text-xs font-semibold text-emerald-600">Party saved</span>
                      )}
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
                  <div className="space-y-4">
                    <Field label="Saved party">
                      <PartySearchSelect
                        partyType="consignee"
                        onSelect={(party) => applySavedParty("consignee", party)}
                        placeholder="Select saved consignee…"
                        inputClassName={inp}
                      />
                    </Field>
                    <div className="relative">
                      <Field label="Name">
                        <input type="text" name="consigneeName" placeholder="Consignee name / company" value={form.consigneeName} onChange={handleCustomerNameChange("consignee")} onFocus={() => setCustomerSearchRole("consignee")} className={inp} />
                      </Field>
                      {customerMatches("consignee").length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                          {customerMatches("consignee").map((customer) => (
                            <button key={customer.id} type="button" onClick={() => selectCustomer("consignee", customer)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-orange-50">
                              <span className="font-semibold text-slate-800">{customer.name}</span>
                              <span className="text-xs text-slate-500">{customer.mobile}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {form.consigneeName.trim() && customerMatches("consignee").length === 0 && customerSearchRole === "consignee" && (
                        <button type="button" onClick={() => saveNewCustomer("consignee")} className="mt-1 text-xs font-semibold text-orange-600 hover:text-orange-700">Save New Customer</button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Mobile"><input type="tel" placeholder="Mobile number" value={form.consigneeMobile} onChange={handleChange("consigneeMobile")} className={inp} /></Field>
                      <Field label="ID Type">
                        <select
                          name="consigneeIdType"
                          value={form.consigneeIdType || "GST"}
                          onChange={handleConsigneeIdTypeChange}
                          className={sel}
                        >
                          {CONSIGNEE_ID_TYPES.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <Field label={(CONSIGNEE_ID_META[form.consigneeIdType] || CONSIGNEE_ID_META.GST).label}>
                      <input
                        type="text"
                        name="consigneeIdNumber"
                        inputMode={(CONSIGNEE_ID_META[form.consigneeIdType] || CONSIGNEE_ID_META.GST).inputMode}
                        maxLength={(CONSIGNEE_ID_META[form.consigneeIdType] || CONSIGNEE_ID_META.GST).maxLength}
                        placeholder={(CONSIGNEE_ID_META[form.consigneeIdType] || CONSIGNEE_ID_META.GST).placeholder}
                        value={form.consigneeIdNumber}
                        onChange={handleConsigneeIdNumberChange}
                        className={inp}
                        autoComplete="off"
                      />
                    </Field>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Field label="Pincode">
                        <div className="relative">
                          <input type="text" inputMode="numeric" placeholder="000000" maxLength={6} value={form.consigneePincode} onChange={handlePincodeChange("consignee")} className={inp} />
                          {pincodeLoading.consignee && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-orange-600 animate-pulse">Looking up…</span>
                          )}
                        </div>
                        {pincodeErrors.consignee && <p className="mt-1 text-[11px] font-medium text-red-600">{pincodeErrors.consignee}</p>}
                      </Field>
                      <Field label="City"><input type="text" placeholder="Auto-fill" readOnly value={form.consigneeCity} className={inpRo} /></Field>
                      <Field label="State"><input type="text" placeholder="Auto-fill" readOnly value={form.consigneeState} className={inpRo} /></Field>
                    </div>
                    <Field label="Address">
                      <textarea rows="3" placeholder="Full consignee address" value={form.consigneeAddress} onChange={handleChange("consigneeAddress")} className={`${ta} min-h-[88px]`} />
                    </Field>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => savePartyToDb("consignee")}
                        disabled={partySaveState.consignee === "saving"}
                        className="inline-flex h-[42px] items-center gap-2 rounded-lg px-4 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
                        style={{ backgroundColor: NAVY }}
                      >
                        {partySaveState.consignee === "saving" ? "Saving…" : "Save as Party"}
                      </button>
                      {partySaveState.consignee === "saved" && (
                        <span className="text-xs font-semibold text-emerald-600">Party saved</span>
                      )}
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
                  <Field label="From">
                    <div className="relative">
                      <SearchableSelect
                        value={form.bookingBranch}
                        onChange={handleFromChange}
                        onPincodeDetected={handleRoutePincodeDetected("from")}
                        options={cityOptions}
                        placeholder="Type pincode or search city"
                        allowCustom
                        inputClassName={`${inp}${routeLoading.from || routeAutoFilled.from ? " pr-10" : ""}`}
                        name="bookingBranch"
                      />
                      {routeLoading.from && (
                        <span className="pointer-events-none absolute right-3 top-[11px]">
                          <svg className="h-4 w-4 animate-spin text-orange-500" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        </span>
                      )}
                      {!routeLoading.from && routeAutoFilled.from && !routeError.from && (
                        <span className="pointer-events-none absolute right-3 top-[11px] text-green-500" title="City and state filled">
                          ✓
                        </span>
                      )}
                    </div>
                    {routeError.from && <p className="mt-1 text-xs text-red-500">{routeError.from}</p>}
                  </Field>
                  <div className="hidden md:flex md:items-center md:justify-center md:pt-6"><div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-orange-200 bg-orange-50 text-orange-600"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></div></div>
                  <Field label="Destination">
                    <div className="relative">
                      <SearchableSelect
                        value={form.toStation}
                        onChange={handleDestinationChange}
                        onPincodeDetected={handleRoutePincodeDetected("to")}
                        options={destinations}
                        placeholder="Type pincode or search station"
                        allowCustom
                        inputClassName={`${inp}${routeLoading.to || routeAutoFilled.to ? " pr-10" : ""}`}
                        name="deliveryBranch"
                      />
                      {routeLoading.to && (
                        <span className="pointer-events-none absolute right-3 top-[11px]">
                          <svg className="h-4 w-4 animate-spin text-orange-500" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        </span>
                      )}
                      {!routeLoading.to && routeAutoFilled.to && !routeError.to && (
                        <span className="pointer-events-none absolute right-3 top-[11px] text-green-500" title="City and state filled">
                          ✓
                        </span>
                      )}
                    </div>
                    {routeError.to && <p className="mt-1 text-xs text-red-500">{routeError.to}</p>}
                  </Field>
                  <div className="hidden md:flex md:items-center md:justify-center md:pt-6"><div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-orange-200 bg-orange-50 text-orange-600"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div></div>
                  <Field label="Delivery At">
                    <SearchableSelect
                      value={form.deliveryAt}
                      onChange={handleDeliveryAtChange}
                      options={destinations}
                      placeholder="Select station or type delivery address"
                      allowCustom
                      inputClassName={inp}
                      name="deliveryAt"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Stations from rate master; you can type a custom godown or address.
                    </p>
                  </Field>
                </div>
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Pickup / Handling
                    </label>
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, handlingType: "fm" }))}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                          form.handlingType === "fm" || !form.handlingType
                            ? "bg-[#071B34] text-white"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        FM Pickup
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, handlingType: "selfdrop" }))}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                          form.handlingType === "selfdrop"
                            ? "bg-orange-500 text-white"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Self Drop
                      </button>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {form.handlingType === "selfdrop"
                        ? "Consignor drops at branch — no FM charges"
                        : "First mile pickup — ₹1.50/kg FM charges apply"}
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Delivery Type
                    </label>
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, deliveryType: "door" }))}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                          form.deliveryType === "door" || !form.deliveryType
                            ? "bg-[#071B34] text-white"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Door Delivery
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          let station = "";
                          setForm((prev) => {
                            station = prev.deliveryBranch || prev.toStation || prev.deliveryAt;
                            const godownAddress = prev.godownAddress || "";
                            return {
                              ...prev,
                              deliveryType: "godown",
                              ...(godownAddress ? { deliveryAt: godownAddress } : {}),
                            };
                          });
                          if (station) autoFillRate(station, "godown");
                        }}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                          form.deliveryType === "godown"
                            ? "bg-orange-500 text-white"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Godown Delivery
                      </button>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {form.deliveryType === "godown"
                        ? "Consignee collects from godown / warehouse"
                        : "Delivery at consignee address"}
                    </p>
                  </div>
                </div>
                  {form.deliveryType === "godown" && (
                    <div className="mt-4 grid gap-3 rounded-xl border border-orange-200 bg-orange-50/40 p-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-orange-700">
                          Godown Address
                        </label>
                        <input
                          type="text"
                          value={form.godownAddress || ""}
                          onChange={(e) => setForm({ ...form, godownAddress: e.target.value })}
                          placeholder="Auto-filled from rate master"
                          className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-orange-700">
                          Godown Mobile
                        </label>
                        <input
                          type="text"
                          value={form.godownMobile || ""}
                          onChange={(e) => setForm({ ...form, godownMobile: e.target.value })}
                          placeholder="Auto-filled from rate master"
                          className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400"
                        />
                      </div>
                    </div>
                  )}
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
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6 xl:col-span-6">
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
                  <Field
                    label={(
                      <span className="flex w-full items-center justify-between gap-2">
                        <span>COD Amount</span>
                        {(Number(form.codAmount) || 0) > 0 ? (
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-orange-700">
                            COD
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                            Prepaid
                          </span>
                        )}
                      </span>
                    )}
                  >
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base font-semibold text-slate-400">₹</span>
                      <input
                        type="number"
                        name="codAmount"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={form.codAmount}
                        onChange={handleChange("codAmount")}
                        className={`${inp} pl-8`}
                      />
                    </div>
                  </Field>
                  </div>
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
                  <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                    <label className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      <span>Unit Rate</span>
                      {form.rateSource === "auto" ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-700">Auto-filled from rate master</span>
                      ) : (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">Manual entry</span>
                      )}
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base font-semibold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={form.rate}
                        onChange={handleRateChange}
                        className={`${inp} pl-8`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      <label className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        <span>Freight</span>
                        {!form.freightManuallyEdited && (
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-700">Auto</span>
                        )}
                        {form.freightManuallyEdited && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700">Manual</span>
                        )}
                        {rateBadge === "auto-customer" && (
                          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-700">Customer Rate</span>
                        )}
                        {rateBadge === "auto-general" && (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-700">General Rate</span>
                        )}
                        {rateBadge === "missing" && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">No Rate Found</span>
                        )}
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base font-semibold text-slate-400">₹</span>
                        <input
                          type="number"
                          name="freight"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={form.freight}
                          onChange={handleChange("freight")}
                          className={`${inp} pl-8`}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">{freightRateHint}</p>
                      {form.freightManuallyEdited && (
                        <button type="button" onClick={handleFreightAutoRecalculate} className="mt-1 text-[11px] font-semibold text-orange-600 hover:text-orange-700">
                          Recalculate from rate
                        </button>
                      )}
                      {fmChargesActive && (
                        <p className="mt-1 text-[11px] font-semibold text-slate-700">
                          FM charges: ₹{(Number(form.fmChargeRate) || 1.5).toFixed(2)}/kg × {chargedWeight.toFixed(2)} kg = ₹{fmChargeAmount.toFixed(2)}
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      <label className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        <span>Hamali</span>
                        {!hamaliManuallyEdited && packagesCount > 0 && (
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-700">Auto</span>
                        )}
                        {hamaliManuallyEdited && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700">Manual</span>
                        )}
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base font-semibold text-slate-400">₹</span>
                        <input
                          type="number"
                          name="hamali"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={form.hamali}
                          onChange={(e) => {
                            setHamaliManuallyEdited(true);
                            setForm((prev) => ({ ...prev, hamali: e.target.value }));
                          }}
                          className={`${inp} pl-8`}
                        />
                      </div>
                      {!hamaliManuallyEdited && packagesCount > 0 && (
                        <p className="mt-1 text-[11px] text-slate-500">
                          ₹{HAMALI_PER_PACKAGE}/pkg × {packagesCount} pkg
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Door Delivery</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base font-semibold text-slate-400">₹</span>
                        <input type="number" name="doorDelivery" min="0" step="0.01" placeholder="0.00" value={form.doorDelivery} onChange={handleChange("doorDelivery")} className={`${inp} pl-8`} />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Local Cartage</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base font-semibold text-slate-400">₹</span>
                        <input type="number" name="localCartageCharges" min="0" step="0.01" placeholder="0.00" value={form.localCartageCharges} onChange={handleChange("localCartageCharges")} className={`${inp} pl-8`} />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      <label className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        <span>COD Charge</span>
                        <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-700">Auto</span>
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base font-semibold text-slate-400">₹</span>
                        <input type="text" readOnly value={codHandlingFee > 0 ? codHandlingFee.toFixed(2) : "0.00"} className={`${inpRo} pl-8`} />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {codAmountNum > 0 ? `Flat ₹${COD_HANDLING_FEE} when COD amount is entered` : "No COD amount on shipment"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Builty Charge</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base font-semibold text-slate-400">₹</span>
                        <input type="number" name="builtyCharge" min="0" step="0.01" placeholder="0.00" value={form.builtyCharge} onChange={handleChange("builtyCharge")} className={`${inp} pl-8`} />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Other Charges</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base font-semibold text-slate-400">₹</span>
                        <input type="number" name="otherCharges" min="0" step="0.01" placeholder="0.00" value={form.otherCharges} onChange={handleChange("otherCharges")} className={`${inp} pl-8`} />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">To Pay Builty Charge</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base font-semibold text-slate-400">₹</span>
                        <input type="text" readOnly value={toPayBuiltyCharge.toFixed(2)} className={`${inpRo} pl-8`} />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {form.paymentType === "to_pay" ? "Applied for To Pay bookings" : "Not applicable for this payment type"}
                      </p>
                    </div>
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
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h3 className="mb-3 text-xs font-semibold tracking-wide text-slate-500">
                      FREIGHT BREAKDOWN
                    </h3>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">
                          Freight
                          <span className="ml-1 text-xs text-slate-400">
                            ({freightRateHint})
                          </span>
                        </span>
                        <span className="font-semibold text-slate-800">₹{freightTotal.toFixed(2)}</span>
                      </div>

                      {fmChargeAmount > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">
                            FM Charges
                            <span className="ml-1 text-xs text-slate-400">
                              (₹{(Number(form.fmChargeRate) || 1.5).toFixed(2)}/kg × {chargedWeight.toFixed(2)} kg)
                            </span>
                          </span>
                          <span className="font-semibold text-slate-800">₹{fmChargeAmount.toFixed(2)}</span>
                        </div>
                      )}

                      {otherChargesTotal > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Other Charges</span>
                          <span className="font-semibold text-slate-800">₹{otherChargesTotal.toFixed(2)}</span>
                        </div>
                      )}

                      {codHandlingFee > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">
                            COD Handling
                            <span className="ml-1 text-xs text-slate-400">(flat)</span>
                          </span>
                          <span className="font-semibold text-slate-800">₹{codHandlingFee.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="my-2 border-t border-dashed border-slate-200" />
                    </div>

                    <div className="mt-2 flex items-center justify-between rounded-lg bg-[#071B34] px-4 py-3 text-white">
                      <span className="text-sm font-semibold">Grand Total</span>
                      <span className="text-lg font-bold">₹{grandTotal.toFixed(2)}</span>
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
      </div>

      <div className="lr-print-section">
        <LrPrintLayout
          lrNumber={currentLrNumber}
          form={lrPrintForm}
          paymentLabel={paymentLabel}
          deliveryTypeLabel={deliveryTypeLabel}
          handlingTypeLabel={handlingTypeLabel}
          actualWeight={actualWeight}
          chargedWeight={chargedWeight}
          volumetricWeight={volumetricWeight}
          cubicFeet={cubicFeet}
          cbm={cbm}
          chargedByVolumetricWeight={chargedByVolumetricWeight}
          builtyCharge={builtyCharge}
          toPayBuiltyCharge={toPayBuiltyCharge}
          codHandlingFee={codHandlingFee}
          grandTotal={displayTotal}
          compute={compute}
          printText={printText}
        />
      </div>
    </AppLayout>
  );
}
