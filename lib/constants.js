export const SHIPMENT_STATUS = Object.freeze({
  PENDING: "pending",
  PICKED_UP: "picked_up",
  IN_TRANSIT: "in_transit",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  EXCEPTION: "exception",
  CANCELLED: "cancelled",
  RETURNED: "returned",
});

export const SHIPMENT_STATUS_LABELS = Object.freeze({
  [SHIPMENT_STATUS.PENDING]: "Pending",
  [SHIPMENT_STATUS.PICKED_UP]: "Picked Up",
  [SHIPMENT_STATUS.IN_TRANSIT]: "In Transit",
  [SHIPMENT_STATUS.OUT_FOR_DELIVERY]: "Out for Delivery",
  [SHIPMENT_STATUS.DELIVERED]: "Delivered",
  [SHIPMENT_STATUS.EXCEPTION]: "Exception",
  [SHIPMENT_STATUS.CANCELLED]: "Cancelled",
  [SHIPMENT_STATUS.RETURNED]: "Returned",
});

export const SHIPMENT_STATUS_BADGE = Object.freeze({
  [SHIPMENT_STATUS.PENDING]: "badge-warning",
  [SHIPMENT_STATUS.PICKED_UP]: "badge-primary",
  [SHIPMENT_STATUS.IN_TRANSIT]: "badge-accent",
  [SHIPMENT_STATUS.OUT_FOR_DELIVERY]: "badge-primary",
  [SHIPMENT_STATUS.DELIVERED]: "badge-success",
  [SHIPMENT_STATUS.EXCEPTION]: "badge-danger",
  [SHIPMENT_STATUS.CANCELLED]: "badge-danger",
  [SHIPMENT_STATUS.RETURNED]: "badge-danger",
});

export const BOOKING_STATUS = Object.freeze({
  DRAFT: "draft",
  CONFIRMED: "confirmed",
  PROCESSING: "processing",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
});

export const PAYMENT_STATUS = Object.freeze({
  UNPAID: "unpaid",
  PARTIAL: "partial",
  PAID: "paid",
  OVERDUE: "overdue",
  REFUNDED: "refunded",
});

export const USER_ROLES = Object.freeze({
  ADMIN: "admin",
  MANAGER: "manager",
  OPERATOR: "operator",
  VIEWER: "viewer",
  CUSTOMER: "customer",
});

export const ID_PREFIXES = Object.freeze({
  BOOKING: "BKG",
  SHIPMENT: "SHP",
  CUSTOMER: "CUS",
  INVOICE: "INV",
  WAREHOUSE: "WHS",
  ITEM: "ITM",
});

export const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 20,
  MAX_PER_PAGE: 100,
});
