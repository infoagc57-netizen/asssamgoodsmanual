export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-navy-100 bg-white/50">
      <div className="flex flex-col items-center justify-between gap-2 px-4 py-4 sm:flex-row sm:px-6">
        <p className="text-xs text-navy-500">
          © {year} AGC Manual ERP. All rights reserved.
        </p>
        <div className="flex items-center gap-4 text-xs text-navy-500">
          <a href="/terms" className="hover:text-navy-900">
            Terms
          </a>
          <a href="/privacy" className="hover:text-navy-900">
            Privacy
          </a>
          <a href="/support" className="hover:text-navy-900">
            Support
          </a>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>System online</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
