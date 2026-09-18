import clsx from "clsx";

export default function SectionHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}) {
  return (
    <div
      className={clsx(
        "mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="space-y-1">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-navy-600 sm:text-base">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
