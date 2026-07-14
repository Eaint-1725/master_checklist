import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Client Master Checklist Extractor",
  description:
    "Extract key data from signed FocusCore service proposal contracts into a structured Excel checklist.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
