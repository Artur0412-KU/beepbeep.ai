import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/features/auth/providers/auth-provider";

export const metadata: Metadata = {
  title: "BeepBeep AI",
  description: "Browse a curated set of vehicle listings.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
