export const TRACKING_EVENTS = [
  "Booking created",
  "Manifest Uploaded",
  "Shipment Picked Up",
  "Vehicle Departed from Client Location",
  "Shipment Received at Origin Center",
  "Weight Captured",
  "Added to Bag",
  "Bag Added to Trip",
  "Vehicle Departed",
  "Trip Arrived",
  "Bag Received at Facility",
  "Reached Destination",
  "Out for Delivery",
  "Delivered",
  "POD Received",
  "Shipment On Hold",
  "Shipment Damaged",
];

export function nextTrackingId(history) {
  const highest = (history || []).reduce(
    (max, item) => Math.max(max, Number(String(item.id || "").replace("EVT", "")) || 0),
    0,
  );
  return `EVT${String(highest + 1).padStart(3, "0")}`;
}
