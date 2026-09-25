const STYLES = {
  draft: "bg-slate-100 text-slate-700",
  scheduled: "bg-amber-50 text-amber-800",
  published: "bg-emerald-50 text-emerald-800",
  failed: "bg-red-50 text-red-700",
};

export default function PostStatusBadge({ status }) {
  const value = status || "draft";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STYLES[value] || STYLES.draft}`}>
      {value}
    </span>
  );
}
