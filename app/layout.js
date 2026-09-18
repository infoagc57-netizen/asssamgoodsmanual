import "./globals.css";
import AuthSessionProvider from "@/components/providers/AuthSessionProvider";

export const metadata = {
  title: "AGC Manual ERP",
  description: "AGC Manual ERP",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#F97316",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
