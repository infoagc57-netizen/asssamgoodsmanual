export function serializeBooking(doc) {
  if (!doc) return null;
  const booking = { ...doc };
  if (booking._id) {
    booking.id = String(booking._id);
    delete booking._id;
  }
  delete booking.__v;
  return booking;
}

export const FIRST_LR_NUMBER = 7900000001;

export async function getNextLrNumber(Booking) {
  const lastBooking = await Booking.findOne({})
    .sort({ lrNumber: -1 })
    .select("lrNumber")
    .lean();

  if (!lastBooking?.lrNumber) {
    return String(FIRST_LR_NUMBER);
  }

  const next = Number(lastBooking.lrNumber) + 1;
  return String(next).padStart(10, "0");
}
