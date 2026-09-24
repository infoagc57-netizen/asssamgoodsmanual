import { findGeneralRateByStation } from "@/lib/rateStationMatch";

export const FM_CHARGE_RATE = 1.5;
export const COD_HANDLING_FEE = 100;

export const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

export function volumetricWeightKg({ length, width, height, packages }) {
  const l = Number(length) || 0;
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  const pkg = Math.max(0, Number(packages) || 0);
  if (!l || !w || !h || !pkg) return 0;
  return roundMoney((l * w * h * pkg) / 5000);
}

export function chargedWeightKg(actualWeight, volumetricWeight) {
  const actual = Number(actualWeight) || 0;
  const volumetric = Number(volumetricWeight) || 0;
  const charged = Math.max(actual, volumetric);
  return charged > 0 ? roundMoney(charged) : 0;
}

export function calculateFreightFromRate(rate, chargedWeight, packages) {
  if (!rate) return 0;
  const unitRate = Number(rate.rate) || 0;
  let calculated = 0;
  const type = rate.rateType || "Per Kg";
  if (type === "Per Kg" || type === "per_kg") {
    calculated = chargedWeight * unitRate;
  } else if (type === "Per Package") {
    calculated = packages * unitRate;
  } else {
    calculated = unitRate;
  }
  return roundMoney(Math.max(calculated, Number(rate.minFreight) || 0));
}

export function rateTypeLabel(rateType) {
  const type = rateType || "Per Kg";
  if (type === "Per Package") return "per package";
  if (type === "Fixed") return "fixed";
  return "per kg";
}

export function findDestinationGeneralRate(destination, rates) {
  return findGeneralRateByStation(destination, rates);
}

export function buildFreightEstimate({
  fromStation,
  toStation,
  packages,
  actualWeight,
  volumetricWeight,
  handlingType,
  codEnabled,
  doorDelivery,
  otherCharges,
  rates,
}) {
  const pkg = Math.max(0, Number(packages) || 0);
  const chargedWeight = chargedWeightKg(actualWeight, volumetricWeight);
  const weightSource =
    chargedWeight <= 0
      ? null
      : volumetricWeight > (Number(actualWeight) || 0)
        ? "volumetric"
        : "actual";

  const matchedRate = toStation ? findDestinationGeneralRate(toStation, rates) : null;
  const baseFreight = calculateFreightFromRate(matchedRate, chargedWeight, pkg);
  const fmActive = handlingType !== "selfdrop";
  const fmCharge = fmActive && chargedWeight > 0 ? roundMoney(chargedWeight * FM_CHARGE_RATE) : 0;
  const codCharge = codEnabled ? COD_HANDLING_FEE : 0;
  const door = roundMoney(Number(doorDelivery) || 0);
  const other = roundMoney(Number(otherCharges) || 0);
  const subTotal = roundMoney(baseFreight + fmCharge + codCharge + door + other);
  const grandTotal = subTotal;

  return {
    matchedRate,
    chargedWeight,
    weightSource,
    baseFreight,
    fmCharge,
    codCharge,
    doorDelivery: door,
    otherCharges: other,
    subTotal,
    grandTotal,
    rateMissing: Boolean(toStation?.trim()) && !matchedRate,
  };
}
