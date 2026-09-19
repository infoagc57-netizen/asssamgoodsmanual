export function monthKeyFromDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function partyName(party) {
  if (!party) return "";
  if (typeof party === "string") return party;
  return String(party.name || "").trim();
}

export function routeLabel(route) {
  if (!route) return "";
  if (typeof route === "string") return route;
  const from = route.bookingBranch || route.fromBranch || route.from || "";
  const to = route.deliveryBranch || route.toBranch || route.toStation || route.to || "";
  const parts = [from, to].filter(Boolean);
  if (parts.length) return parts.join(" → ");
  return String(route.deliveryAt || "").trim();
}

export function serializeCartage(doc, booking) {
  if (!doc) return null;
  const entry = { ...doc };
  if (entry._id) {
    entry.id = String(entry._id);
    delete entry._id;
  }
  delete entry.__v;
  if (entry.bookingId) {
    entry.bookingId = String(entry.bookingId);
  }
  if (entry.createdBy) {
    entry.createdBy = String(entry.createdBy);
  }
  entry.consignee = booking ? partyName(booking.consignee) : "";
  entry.route = booking ? routeLabel(booking.route) : "";
  return entry;
}
