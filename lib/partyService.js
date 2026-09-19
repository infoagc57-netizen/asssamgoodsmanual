import Party from "@/models/Party";

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function normalizePartyInput(raw = {}) {
  return {
    name: String(raw.name || "").trim(),
    mobile: String(raw.mobile || "").replace(/\D/g, "").slice(0, 10),
    gst: String(raw.gst || "").trim().toUpperCase(),
    idType: String(raw.idType || "").trim(),
    idNumber: String(raw.idNumber || "").trim(),
    pincode: String(raw.pincode || "").replace(/\D/g, "").slice(0, 6),
    city: String(raw.city || "").trim(),
    state: String(raw.state || "").trim(),
    address: String(raw.address || "").trim(),
    email: String(raw.email || "").trim().toLowerCase(),
  };
}

export function serializeParty(doc) {
  if (!doc) return null;
  const item = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(item._id),
    partyType: item.partyType,
    name: item.name,
    mobile: item.mobile || "",
    gst: item.gst || "",
    idType: item.idType || "",
    idNumber: item.idNumber || "",
    pincode: item.pincode || "",
    city: item.city || "",
    state: item.state || "",
    address: item.address || "",
    email: item.email || "",
    usageCount: item.usageCount ?? 0,
    lastUsedAt: item.lastUsedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function partyTypeFilter(partyType) {
  if (partyType === "consignor" || partyType === "consignee") {
    return { partyType: { $in: [partyType, "both"] } };
  }
  return {};
}

export async function findExistingParty(details, partyType) {
  const normalized = normalizePartyInput(details);
  if (!normalized.name) return null;

  const typeClause = partyTypeFilter(partyType);

  if (normalized.mobile) {
    const byMobile = await Party.findOne({ mobile: normalized.mobile, ...typeClause });
    if (byMobile) return byMobile;
  }
  if (normalized.gst) {
    const byGst = await Party.findOne({ gst: normalized.gst, ...typeClause });
    if (byGst) return byGst;
  }

  return Party.findOne({
    name: new RegExp(`^${escapeRegex(normalized.name)}$`, "i"),
    pincode: normalized.pincode || "",
    ...typeClause,
  });
}

function mergePartyFields(existing, incoming) {
  const next = { ...incoming };
  Object.keys(next).forEach((key) => {
    if (!next[key] && existing[key]) next[key] = existing[key];
  });
  return next;
}

function resolvePartyType(existingType, requestedType) {
  if (!existingType || existingType === requestedType) return requestedType || "both";
  if (existingType === "both" || requestedType === "both") return "both";
  if (existingType !== requestedType) return "both";
  return requestedType;
}

export async function upsertParty(details, partyType, userId) {
  const normalized = normalizePartyInput(details);
  if (!normalized.name) {
    return { party: null, created: false };
  }

  const existing = await findExistingParty(normalized, partyType);
  const now = new Date();

  if (existing) {
    const merged = mergePartyFields(existing.toObject(), normalized);
    const nextType = resolvePartyType(existing.partyType, partyType);
    await Party.updateOne(
      { _id: existing._id },
      {
        $set: {
          ...merged,
          partyType: nextType,
          lastUsedAt: now,
        },
        $inc: { usageCount: 1 },
      },
    );
    const updated = await Party.findById(existing._id);
    return { party: updated, created: false };
  }

  const created = await Party.create({
    ...normalized,
    partyType: partyType || "both",
    createdBy: userId,
    lastUsedAt: now,
    usageCount: 1,
  });
  return { party: created, created: true };
}

export async function searchParties({ q, partyType, limit = 20 }) {
  const cap = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const filter = { ...partyTypeFilter(partyType) };

  const needle = String(q || "").trim();
  if (needle) {
    const regex = new RegExp(escapeRegex(needle), "i");
    filter.$or = [
      { name: regex },
      { mobile: regex },
      { gst: regex },
      { city: regex },
      { idNumber: regex },
    ];
  }

  const parties = await Party.find(filter)
    .sort({ lastUsedAt: -1, usageCount: -1 })
    .limit(cap)
    .lean();

  return parties.map(serializeParty);
}
