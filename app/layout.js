import "./globals.css";
import AuthSessionProvider from "@/components/providers/AuthSessionProvider";

export const metadata = {
  title: "AGC Manual ERP",
  description: "AGC Manual ERP",
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
