const LOGO_SRC = "/brand/agc-logo.jpg";

export default function BrandLogo({
  variant = "lockup",
  height = 46,
  className = "",
  inverted = false,
}) {
  const nameClass = inverted ? "text-white" : "text-[#F5F7FA]";
  const tagClass = inverted ? "text-orange-400" : "text-[#F97316]";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={LOGO_SRC}
        alt="Assam Goods Carrier"
        className="w-auto shrink-0 object-contain"
        style={{ height: `${height}px` }}
      />
      {variant === "lockup" && (
        <div className="min-w-0 leading-tight">
          <p className={`truncate text-sm font-bold tracking-tight ${nameClass}`}>Assam Goods Carrier</p>
          <p className={`mt-0.5 truncate text-[9px] font-semibold uppercase tracking-[0.14em] ${tagClass}`}>
            SAFE • RELIABLE • ON TIME
          </p>
        </div>
      )}
    </div>
  );
}

export { LOGO_SRC };
