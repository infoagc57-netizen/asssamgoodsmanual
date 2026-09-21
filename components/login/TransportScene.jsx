"use client";

const PACKAGES = [
  { left: "12%", size: 28, delay: 0, duration: 14 },
  { left: "28%", size: 22, delay: 3, duration: 16 },
  { left: "45%", size: 32, delay: 1, duration: 18 },
  { left: "62%", size: 24, delay: 5, duration: 15 },
  { left: "78%", size: 26, delay: 2, duration: 17 },
  { left: "88%", size: 20, delay: 7, duration: 19 },
];

function PackageIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 8h16v12H4V8zm2-4h12l2 4H4l2-4zm6 7v5h2v-5h-2z" opacity="0.9" />
    </svg>
  );
}

function TruckSvg() {
  return (
    <svg className="transport-scene__truck" width="132" height="56" viewBox="0 0 132 56" fill="none" aria-hidden="true">
      <rect x="2" y="18" width="52" height="28" rx="3" fill="#F97316" />
      <rect x="6" y="22" width="20" height="12" rx="1" fill="rgba(255,255,255,0.35)" />
      <rect x="30" y="22" width="18" height="12" rx="1" fill="rgba(255,255,255,0.2)" />
      <path d="M54 26h36l14 12v8H54V26z" fill="#e2e8f0" />
      <rect x="72" y="30" width="22" height="14" rx="2" fill="rgba(7,27,52,0.15)" />
      <circle cx="24" cy="48" r="7" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
      <circle cx="24" cy="48" r="3" fill="#64748b" />
      <circle cx="96" cy="48" r="7" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
      <circle cx="96" cy="48" r="3" fill="#64748b" />
      <circle cx="118" cy="48" r="7" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
      <circle cx="118" cy="48" r="3" fill="#64748b" />
      <rect x="0" y="14" width="8" height="6" rx="1" fill="#fbbf24" />
    </svg>
  );
}

export default function TransportScene() {
  return (
    <div className="transport-scene">
      <div className="transport-scene__grid" aria-hidden="true" />
      <div className="transport-scene__glow transport-scene__glow--orange" />
      <div className="transport-scene__glow transport-scene__glow--blue" />

      <div className="transport-scene__brand">
        <img
          src="/brand/agc-logo.jpg"
          alt="Assam Goods Carrier"
          className="mb-4 h-20 w-auto object-contain sm:h-24"
        />
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
          Assam Goods Carrier
        </h1>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">
          A unit of SD Enterprises
        </p>
        <p className="mt-3 hidden text-sm text-white/55 sm:block">
          Transport ERP — bookings, manifests, billing &amp; tracking in one place.
        </p>
      </div>

      <svg className="transport-scene__route" viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true">
        <path
          className="transport-scene__route-path"
          d="M 30 70 Q 120 20, 200 50 T 370 35"
        />
        <g transform="translate(24, 62)">
          <circle className="transport-scene__pin-pulse" cx="6" cy="10" r="14" />
          <path className="transport-scene__pin" d="M6 0C2.7 0 0 2.7 0 6c0 4.5 6 12 6 12s6-7.5 6-12c0-3.3-2.7-6-6-6zm0 8.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" transform="scale(0.85)" />
          <text x="0" y="32" fill="rgba(255,255,255,0.7)" fontSize="9" fontWeight="600">Origin</text>
        </g>
        <g transform="translate(352, 22)">
          <circle className="transport-scene__pin-pulse" cx="6" cy="10" r="14" style={{ animationDelay: "1s" }} />
          <path className="transport-scene__pin" d="M6 0C2.7 0 0 2.7 0 6c0 4.5 6 12 6 12s6-7.5 6-12c0-3.3-2.7-6-6-6zm0 8.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" transform="scale(0.85)" />
          <text x="-8" y="32" fill="rgba(255,255,255,0.7)" fontSize="9" fontWeight="600">Destination</text>
        </g>
      </svg>

      <div className="transport-scene__packages" aria-hidden="true">
        {PACKAGES.map((pkg, i) => (
          <div
            key={i}
            className="transport-scene__package"
            style={{
              left: pkg.left,
              bottom: `${15 + (i % 3) * 8}%`,
              animationDuration: `${pkg.duration}s`,
              animationDelay: `${pkg.delay}s`,
            }}
          >
            <PackageIcon size={pkg.size} />
          </div>
        ))}
      </div>

      <p className="transport-scene__tagline">
        Moving India&apos;s goods
        <span>Safe • Reliable • On time</span>
      </p>

      <div className="transport-scene__highway" aria-hidden="true">
        <div className="transport-scene__road" />
        <div className="transport-scene__dashes" />
        <div className="transport-scene__truck-wrap">
          <TruckSvg />
        </div>
      </div>
    </div>
  );
}
