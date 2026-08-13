import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alice - AI Agent",
  description: "Autonomous Agent Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
