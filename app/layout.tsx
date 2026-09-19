import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SCW1050 Power Monitor",
  description: "Tuya smart plug control and energy monitoring dashboard",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}