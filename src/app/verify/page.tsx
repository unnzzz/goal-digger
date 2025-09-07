"use client";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function VerifyForm() {
  const sp = useSearchParams();
  const status = sp.get("status");
  const router = useRouter();

  const messages = {
    success: "Email verified! You can now log in.",
    expired: "Verification link expired. Please sign up again to get a new link.",
    invalid: "Invalid verification link.",
    error: "Something went wrong verifying your email.",
  } as const;
  
  const msg = messages[status as keyof typeof messages] || "Verification status unknown.";

  return (
    <main className="container">
      <div className="card" style={{maxWidth:520}}>
        <h1>Verify email</h1>
        <p>{msg}</p>
        <div style={{display:"flex", gap:8}}>
          <Link className="btn" href="/login">Go to login</Link>
          <button className="btn" onClick={()=>router.push("/")}>Home</button>
        </div>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="loading-screen">Loading...</div>}>
      <VerifyForm />
    </Suspense>
  );
}
