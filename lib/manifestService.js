export function serializeManifest(doc) {
  if (!doc) return null;
  const manifest = { ...doc };
  if (manifest._id) {
    manifest.id = String(manifest._id);
    delete manifest._id;
  }
  if (manifest.bookingIds) {
    manifest.bookingIds = manifest.bookingIds.map((id) => String(id));
  }
  delete manifest.__v;
  return manifest;
}

export async function getNextManifestNumber(Manifest) {
  const year = new Date().getFullYear();
  const prefix = `MAN-${year}-`;
  const pattern = new RegExp(`^MAN-${year}-\\d+$`);
  const last = await Manifest.findOne({ manifestNumber: pattern })
    .sort({ manifestNumber: -1 })
    .select("manifestNumber")
    .lean();

  let seq = 1;
  if (last?.manifestNumber) {
    const part = last.manifestNumber.slice(prefix.length);
    seq = (parseInt(part, 10) || 0) + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export function summarizeBookings(bookings) {
  return bookings.reduce(
    (totals, booking) => {
      totals.totalBookings += 1;
      totals.totalPackages += Number(booking.goods?.packages || 0);
      totals.totalWeight += Number(booking.goods?.chargedWeight || booking.goods?.actualWeight || 0);
      totals.totalAmount += Number(booking.grandTotal || 0);
      return totals;
    },
    { totalBookings: 0, totalPackages: 0, totalWeight: 0, totalAmount: 0 },
  );
}
