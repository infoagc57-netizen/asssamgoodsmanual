import mongoose from "mongoose";
import Rate from "@/models/Rate";

const userObjectId = (userId) => (
  userId && mongoose.Types.ObjectId.isValid(String(userId)) ? userId : undefined
);

export const stationKey = (value) => String(value || "").trim().toLowerCase();

export const normalizeStationKey = (value) => stationKey(value).split(",")[0].trim();

export const stationKeysLooselyMatch = (destinationKey, rateKey) => {
  if (!destinationKey || !rateKey) return false;
  if (destinationKey === rateKey) return true;
  const destFirst = destinationKey.split(/\s+/)[0];
  const rateFirst = rateKey.split(/\s+/)[0];
  if (destFirst && rateFirst && destFirst === rateFirst) return true;
  if (destinationKey.startsWith(`${rateKey} `) || rateKey.startsWith(`${destinationKey} `)) return true;
  return false;
};

export const matchesGeneralStation = (rate, station) => {
  if (!rate?.generalRate) return false;
  const key = normalizeStationKey(station);
  if (!key) return false;
  const candidates = [rate.toStation, rate.toBranchName, rate.toBranch]
    .map(normalizeStationKey)
    .filter(Boolean);
  return candidates.some((candidate) => stationKeysLooselyMatch(key, candidate));
};

export const titleCaseStation = (station) => String(station || "").trim().replace(/\b\w/g, (char) => char.toUpperCase());

export const todayIsoDate = () => new Date().toISOString().slice(0, 10);

export const serializeRate = (doc) => {
  if (!doc) return null;
  const rate = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: String(rate._id),
    toStation: rate.toStation || "",
    toBranch: rate.toBranch || "",
    toBranchName: rate.toBranchName || "",
    fromBranch: rate.fromBranch || "",
    fromBranchName: rate.fromBranchName || "All",
    customerId: rate.customerId || "",
    customerName: rate.customerName || "General Rate",
    generalRate: Boolean(rate.generalRate),
    rate: rate.rate,
    rateType: rate.rateType || "Per Kg",
    minFreight: rate.minFreight ?? 0,
    godownAddress: rate.godownAddress || "",
    godownMobile: rate.godownMobile || "",
    effectiveFrom: rate.effectiveFrom || "",
    status: rate.status || "Active",
    createdAt: rate.createdAt ? new Date(rate.createdAt).toISOString() : "",
    updatedAt: rate.updatedAt ? new Date(rate.updatedAt).toISOString() : "",
  };
};

const duplicateKey = (record) => [
  record.generalRate ? "GENERAL" : record.customerId,
  record.fromBranch,
  record.toBranch,
  record.rateType,
].join("|");

export const isDuplicateActive = (rates, candidate, excludeId) => {
  if (candidate.status !== "Active") return false;
  return rates.some((rate) => {
    const id = rate.id || String(rate._id);
    if (id === excludeId || rate.status !== "Active") return false;
    return duplicateKey(rate) === duplicateKey(candidate);
  });
};

export async function listRates({ status, q } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (q) {
    const query = String(q).trim();
    if (query) {
      filter.$or = [
        { customerName: { $regex: query, $options: "i" } },
        { toStation: { $regex: query, $options: "i" } },
        { toBranchName: { $regex: query, $options: "i" } },
        { fromBranchName: { $regex: query, $options: "i" } },
      ];
    }
  }
  const docs = await Rate.find(filter).sort({ updatedAt: -1 });
  return docs.map(serializeRate);
}

export async function importParsedGeneralRates(parsedRates, userId) {
  const effectiveFrom = todayIsoDate();
  let importedCount = 0;
  const allRates = await Rate.find({}).lean();

  for (const row of parsedRates) {
    const trimmedStation = String(row.station || "").trim();
    const rateValue = Number(row.rate);
    if (!trimmedStation || !Number.isFinite(rateValue) || rateValue <= 0) continue;

    const godownAddress = String(row.godown_address || row.godownAddress || "").trim();
    const godownMobile = String(row.godown_mobile || row.godownMobile || "").trim();

    const existing = allRates.find((item) => matchesGeneralStation(item, trimmedStation));
    if (existing) {
      await Rate.findByIdAndUpdate(existing._id, {
        $set: {
          toStation: trimmedStation,
          toBranch: trimmedStation,
          toBranchName: titleCaseStation(trimmedStation),
          rate: rateValue,
          rateType: existing.rateType || "Per Kg",
          godownAddress: godownAddress || existing.godownAddress || "",
          godownMobile: godownMobile || existing.godownMobile || "",
          effectiveFrom,
          status: "Active",
          generalRate: true,
        },
      });
      Object.assign(existing, {
        toStation: trimmedStation,
        toBranch: trimmedStation,
        toBranchName: titleCaseStation(trimmedStation),
        rate: rateValue,
        godownAddress: godownAddress || existing.godownAddress || "",
        godownMobile: godownMobile || existing.godownMobile || "",
      });
    } else {
      const created = await Rate.create({
        customerId: "",
        customerName: "General Rate",
        generalRate: true,
        fromBranch: "",
        fromBranchName: "All",
        toStation: trimmedStation,
        toBranch: trimmedStation,
        toBranchName: titleCaseStation(trimmedStation),
        rate: rateValue,
        rateType: "Per Kg",
        godownAddress,
        godownMobile,
        minFreight: 0,
        effectiveFrom,
        status: "Active",
        createdBy: userObjectId(userId),
      });
      allRates.push(created.toObject());
    }
    importedCount += 1;
  }

  const rates = await listRates();
  return { importedCount, rates, total: rates.length };
}

export async function migrateLegacyRates(legacyRates, userId) {
  let migrated = 0;
  for (const item of legacyRates) {
    if (!item || typeof item !== "object") continue;
    const rateValue = Number(item.rate);
    if (!Number.isFinite(rateValue) || rateValue < 0) continue;

    const payload = {
      toStation: item.toStation || item.toBranch || item.toBranchName || "",
      toBranch: item.toBranch || item.toStation || "",
      toBranchName: item.toBranchName || titleCaseStation(item.toStation || item.toBranch || ""),
      fromBranch: item.fromBranch || "",
      fromBranchName: item.fromBranchName || "All",
      customerId: item.customerId || "",
      customerName: item.customerName || (item.generalRate ? "General Rate" : ""),
      generalRate: Boolean(item.generalRate),
      rate: rateValue,
      rateType: item.rateType || "Per Kg",
      minFreight: Number(item.minFreight) || 0,
      godownAddress: item.godownAddress || "",
      godownMobile: item.godownMobile || "",
      effectiveFrom: item.effectiveFrom || todayIsoDate(),
      status: item.status || "Active",
      createdBy: userObjectId(userId),
    };

    if (!payload.toStation && !payload.toBranch) continue;

    if (payload.generalRate && (payload.toStation || payload.toBranch)) {
      const all = await Rate.find({ generalRate: true }).lean();
      const existing = all.find((item) => matchesGeneralStation(item, payload.toStation || payload.toBranch));
      if (existing) {
        await Rate.findByIdAndUpdate(existing._id, { $set: payload });
      } else {
        await Rate.create(payload);
      }
    } else {
      await Rate.create(payload);
    }
    migrated += 1;
  }
  const rates = await listRates();
  return { migrated, rates };
}

export async function createRate(body, userId) {
  const rates = await listRates();
  const record = {
    ...body,
    id: undefined,
    createdBy: userObjectId(userId),
  };
  if (isDuplicateActive(rates, record)) {
    throw new Error("DUPLICATE_ACTIVE");
  }
  const doc = await Rate.create({
    customerId: body.customerId || "",
    customerName: body.customerName || "General Rate",
    generalRate: Boolean(body.generalRate),
    fromBranch: body.fromBranch || "",
    fromBranchName: body.fromBranchName || body.fromBranch || "All",
    toBranch: body.toBranch || "",
    toBranchName: body.toBranchName || body.toBranch || "",
    toStation: body.toStation || body.toBranch || "",
    rate: body.rate,
    rateType: body.rateType || "Per Kg",
    minFreight: body.minFreight ?? 0,
    godownAddress: body.godownAddress || "",
    godownMobile: body.godownMobile || "",
    effectiveFrom: body.effectiveFrom || todayIsoDate(),
    status: body.status || "Active",
    createdBy: userObjectId(userId),
  });
  return serializeRate(doc);
}

export async function updateRateById(id, body) {
  const rates = await listRates();
  const candidate = { ...body, id };
  if (isDuplicateActive(rates, candidate, id)) {
    throw new Error("DUPLICATE_ACTIVE");
  }
  const doc = await Rate.findByIdAndUpdate(
    id,
    {
      $set: {
        customerId: body.customerId || "",
        customerName: body.customerName || "General Rate",
        generalRate: Boolean(body.generalRate),
        fromBranch: body.fromBranch || "",
        fromBranchName: body.fromBranchName || body.fromBranch || "All",
        toBranch: body.toBranch || "",
        toBranchName: body.toBranchName || body.toBranch || "",
        toStation: body.toStation || body.toBranch || "",
        rate: body.rate,
        rateType: body.rateType || "Per Kg",
        minFreight: body.minFreight ?? 0,
        godownAddress: body.godownAddress || "",
        godownMobile: body.godownMobile || "",
        effectiveFrom: body.effectiveFrom || todayIsoDate(),
        status: body.status || "Active",
      },
    },
    { new: true },
  );
  return serializeRate(doc);
}
