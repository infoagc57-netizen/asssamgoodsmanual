import AppLayout from "../../components/layout/AppLayout";
import ProfileSettings from "../../components/settings/ProfileSettings";

const NAVY = "#071B34";
const ORANGE = "#F97316";

export default function SettingsPage() {
  return (
    <AppLayout>
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>
              Administration
            </p>
            <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>
              Settings
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your account profile and security.
            </p>
          </div>
          <ProfileSettings />
        </div>
      </main>
    </AppLayout>
  );
}
