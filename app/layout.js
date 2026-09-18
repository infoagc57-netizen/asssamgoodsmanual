import "./globals.css";

export const metadata = {
  title: "AGC Manual ERP",
  description: "AGC Manual ERP",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
