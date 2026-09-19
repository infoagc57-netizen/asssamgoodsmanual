export function serializeLoadingSheet(doc) {
  if (!doc) return null;
  const sheet = { ...doc };
  if (sheet._id) {
    sheet.id = String(sheet._id);
    delete sheet._id;
  }
  if (sheet.bookingIds) {
    sheet.bookingIds = sheet.bookingIds.map((id) => String(id));
  }
  delete sheet.__v;
  return sheet;
}

export async function getNextLoadingSheetNumber(LoadingSheet) {
  const sheets = await LoadingSheet.find({ manifestNumber: /^MAN\d{6}$/ })
    .select("manifestNumber")
    .lean();

  const highest = sheets.reduce((max, sheet) => {
    const numeric = Number(String(sheet.manifestNumber || "").replace(/^MAN/, "")) || 0;
    return Math.max(max, numeric);
  }, 0);

  return `MAN${String(highest + 1).padStart(6, "0")}`;
}

export function summarizeLoadingBookings(bookings) {
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
