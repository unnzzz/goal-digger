import "./globals.css";
import type { Metadata } from "next";
import Provider from "@/components/SessionProvider";
import NavBar from "@/components/NavBar";
import { AvatarProvider } from "@/contexts/AvatarContext";
import { RoadmapGenerationProvider } from "@/contexts/RoadmapGenerationContext";

export const metadata: Metadata = {
  title: "Goal-Digger",
  description: "Goal → daily roadmap with Learn / Practice / Reflect",
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Baloo+Bhai:wght@400&display=swap" rel="stylesheet" />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7178518721701659"
                crossOrigin="anonymous"></script>
      </head>
      <body>
        <Provider>
          <AvatarProvider>
            <RoadmapGenerationProvider>
              {children}
            </RoadmapGenerationProvider>
          </AvatarProvider>
        </Provider>
      </body>
    </html>
  );
}
