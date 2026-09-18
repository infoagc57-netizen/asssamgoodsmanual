import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import {
  Package,
  Truck,
  MapPin,
  DollarSign,
  ArrowUpRight,
  Layers3,
  TrendingUp,
  Boxes,
  Users,
} from "lucide-react";

const statCards = [
  {
    label: "Total Shipments",
    value: "0",
    change: "+0%",
    trend: "up",
    icon: Truck,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
  },
  {
    label: "Active Bookings",
    value: "0",
    change: "+0%",
    trend: "up",
    icon: Package,
    iconBg: "bg-navy-50",
    iconColor: "text-navy-600",
  },
  {
    label: "In Transit",
    value: "0",
    change: "0",
    trend: "neutral",
    icon: MapPin,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    label: "Revenue (MTD)",
    value: "$0.00",
    change: "+0%",
    trend: "up",
    icon: DollarSign,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
];

const quickLinks = [
  { label: "New Booking", icon: Layers3, href: "/bookings/new", variant: "primary" },
  { label: "Track Shipment", icon: TrendingUp, href: "/tracking", variant: "outline" },
  { label: "Add Inventory", icon: Boxes, href: "/inventory/new", variant: "outline" },
  { label: "Customers", icon: Users, href: "/customers", variant: "outline" },
];

export default function DashboardPlaceholder() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Dashboard"
        title="Welcome to AGC Manual ERP"
        description="Your centralized logistics operations hub. Manage bookings, shipments, inventory, and more."
        actions={
          <div className="flex flex-wrap gap-2">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              const variantClass =
                link.variant === "primary" ? "btn-accent" : "btn-outline";
              return (
                <a key={link.label} href={link.href} className={variantClass}>
                  <Icon className="h-4 w-4" />
                  {link.label}
                </a>
              );
            })}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-navy-500">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-2xl font-bold tracking-tight text-navy-900">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconBg} ${stat.iconColor}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs">
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <span className="h-3.5 w-3.5 rounded-full bg-navy-200" />
                  )}
                  <span
                    className={`font-medium ${
                      stat.trend === "up"
                        ? "text-emerald-600"
                        : "text-navy-500"
                    }`}
                  >
                    {stat.change}
                  </span>
                  <span className="text-navy-400">vs last period</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="card-header">
            <div>
              <h2 className="card-title">Recent Activity</h2>
              <p className="mt-0.5 text-xs text-navy-500">
                Latest operations across the platform
              </p>
            </div>
          </div>
          <div className="card-body">
            <EmptyState
              icon={<Layers3 className="h-7 w-7" />}
              title="No activity yet"
              description="Once you start creating bookings and shipments, they'll appear here."
            />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Shipment Status</h2>
              <p className="mt-0.5 text-xs text-navy-500">
                Current pipeline overview
              </p>
            </div>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {[
                { label: "Pending", count: 0, color: "bg-amber-500", pct: 0 },
                { label: "In Transit", count: 0, color: "bg-orange-500", pct: 0 },
                { label: "Delivered", count: 0, color: "bg-emerald-500", pct: 0 },
                { label: "Exception", count: 0, color: "bg-rose-500", pct: 0 },
              ].map((status) => (
                <div key={status.label}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-navy-700">{status.label}</span>
                    <span className="text-navy-500">{status.count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-navy-100">
                    <div
                      className={`h-full rounded-full ${status.color} transition-all`}
                      style={{ width: `${status.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
