import clsx from "clsx";

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-navy-200 bg-white/50 px-6 py-16 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-50 text-navy-500">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-navy-900">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-navy-500">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
