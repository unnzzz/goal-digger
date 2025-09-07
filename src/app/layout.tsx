import "./globals.css";
import type { Metadata } from "next";
import Provider from "@/components/SessionProvider";
import NavBar from "@/components/NavBar";
import { AvatarProvider } from "@/contexts/AvatarContext";

export const metadata: Metadata = {
  title: "Goal-Digger",
  description: "Goal → daily roadmap with Learn / Practice / Reflect",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Baloo+Bhai:wght@400&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Provider>
          <AvatarProvider>
            {children}
          </AvatarProvider>
        </Provider>
      </body>
    </html>
  );
}
