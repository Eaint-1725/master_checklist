import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Myanmar Incorporation Extractor",
  description:
    "Extract key data from signed Myanmar Incorporation Services Proposal contracts into a structured Excel checklist.",
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
