import AppLayout from "../../components/layout/AppLayout";

export default function ReportsPage() {
  return (
    <AppLayout>
      <main className="flex min-h-[70vh] items-center justify-center">
        <section className="rounded-[18px] border border-[#E5E7EB] bg-white p-10 text-center shadow-card">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F97316]">Assam Goods Carrier</p>
          <h1 className="mt-2 text-3xl font-bold text-[#071B34]">Reports</h1>
          <p className="mt-3 text-sm text-[#1F2937]/70">Coming Soon</p>
        </section>
      </main>
    </AppLayout>
  );
}
