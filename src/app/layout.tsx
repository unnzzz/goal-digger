import "./globals.css";
import type { Metadata } from "next";
import Provider from "@/components/SessionProvider";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Roadmap Generator",
  description: "Goal → daily roadmap with Learn / Practice / Reflect",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body>
        <nav style={{padding:12, borderBottom:"1px solid #222"}}>
          <div className="container" style={{display:"flex", gap:12, alignItems:"center"}}>
            <Link href="/">Generator</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/diary">Diary</Link>
            <div style={{marginLeft:"auto"}}>
              {session?.user ? (
                <>
                  <span style={{marginRight:8}}>Hi, {session.user.email}</span>
                  <a href="/api/auth/signout">Sign out</a>
                </>
              ) : (
                <>
                  <Link href="/signup">Sign up</Link><span style={{margin:"0 8px"}}>•</span>
                  <Link href="/login">Log in</Link>
                </>
              )}
            </div>
          </div>
        </nav>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
