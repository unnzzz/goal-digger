import "./globals.css";
import type { Metadata } from "next";
import Provider from "@/components/SessionProvider";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Roadmap Generator",
  description: "Goal → daily roadmap with Learn / Practice / Reflect",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Provider>
          <NavBar />
          {children}
        </Provider>
      </body>
    </html>
  );
}
