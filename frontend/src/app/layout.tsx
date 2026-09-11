import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QBIT | Quantum Digital Signature Security",
  description: "Live quantum signature threat detection dashboard"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
