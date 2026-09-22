export const normalizeStationKey = (value) => String(value || "").trim().toLowerCase().split(",")[0].trim();

export const stationKeysLooselyMatch = (destinationKey, rateKey) => {
  if (!destinationKey || !rateKey) return false;
  if (destinationKey === rateKey) return true;
  const destFirst = destinationKey.split(/\s+/)[0];
  const rateFirst = rateKey.split(/\s+/)[0];
  if (destFirst && rateFirst && destFirst === rateFirst) return true;
  if (destinationKey.startsWith(`${rateKey} `) || rateKey.startsWith(`${destinationKey} `)) return true;
  return false;
};

export function findGeneralRateByStation(station, rates) {
  const key = normalizeStationKey(station);
  if (!key) return null;
  const list = Array.isArray(rates) ? rates : [];
  return list.find((rate) => {
    const isActive = (rate.status || "Active") === "Active";
    if (!isActive || !rate.generalRate) return false;
    const stationCandidates = [rate.toStation, rate.toBranchName, rate.toBranch].map(normalizeStationKey);
    return stationCandidates.some((candidate) => stationKeysLooselyMatch(key, candidate));
  }) || null;
}

export function godownFieldsFromRateMaster(booking, rates) {
  const route = booking?.route || {};
  let godownAddress = booking?.godownAddress || route.godownAddress || "";
  let godownMobile = booking?.godownMobile || route.godownMobile || "";

  if (booking?.deliveryType === "godown") {
    const station = route.deliveryBranch || route.toStation || route.deliveryAt || "";
    if ((!godownAddress || !godownMobile) && station) {
      const match = findGeneralRateByStation(station, rates);
      if (match) {
        if (!godownAddress && match.godownAddress) godownAddress = match.godownAddress;
        if (!godownMobile && match.godownMobile) godownMobile = match.godownMobile;
      }
    }
    if (!godownAddress && route.deliveryAt) {
      godownAddress = route.deliveryAt;
    }
  }

  return { godownAddress, godownMobile };
}
