import { nextTrackingId } from "@/lib/trackingEvents";

export function appendTrackingEntry(booking, { event, location, remark, timestamp }) {
  const history = booking.trackingHistory || [];
  const entry = {
    id: nextTrackingId(history),
    event,
    status: event,
    location,
    remark,
    branch: location,
    note: remark,
    createdAt: timestamp.toISOString(),
    timestamp,
  };

  booking.trackingHistory = [...history, entry];

  if (event === "Delivered") {
    booking.status = "Delivered";
  } else if (event === "Out for Delivery") {
    booking.status = "Out for Delivery";
  } else if (["Vehicle Departed", "Trip Arrived", "Bag Added to Trip"].includes(event)) {
    booking.status = "In Transit";
  }

  return entry;
}
