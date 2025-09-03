import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Roadmap Generator",
  description: "Goal → daily roadmap with Learn / Practice / Reflect",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
