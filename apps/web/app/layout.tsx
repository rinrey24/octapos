import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OctaPOS Dashboard",
  description: "Multi-outlet POS management dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
