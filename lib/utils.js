import clsx from "clsx";

export function cn(...inputs) {
  return clsx(...inputs);
}

export function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatNumber(num, decimals = 0) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num || 0);
}

export function formatDate(date, opts) {
  const d = typeof date === "string" || date instanceof Date
    ? new Date(date)
    : new Date();

  if (isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...opts,
  }).format(d);
}

export function formatDateTime(date) {
  return formatDate(date, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(date) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHr / 24);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(date);
}

export function generateId(prefix = "DOC") {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

export function slugify(str) {
  return str
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export function truncate(str, len = 50) {
  if (!str) return "";
  if (str.length <= len) return str;
  return `${str.substring(0, len)}...`;
}

export function paginate(array, page = 1, perPage = 20) {
  const start = (page - 1) * perPage;
  const end = start + perPage;
  return {
    items: array.slice(start, end),
    page,
    perPage,
    total: array.length,
    totalPages: Math.ceil(array.length / perPage),
  };
}
