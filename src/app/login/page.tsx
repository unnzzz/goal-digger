"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [err,setErr]=useState<string|null>(null);
  const router=useRouter();
  const submit=async(e:React.FormEvent)=>{ e.preventDefault(); setErr(null);
    const res=await signIn("credentials",{ email,password,redirect:false });
    if(res?.error){ setErr(res.error); return; } router.push("/dashboard");
  };

  return (<main className="container"><div className="card">
    <h1>Log in</h1>
    <form onSubmit={submit}>
      <label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} required />
      <label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
      <button className="btn" style={{marginTop:12}}>Log in</button>{err&&<p style={{color:"#f88"}}>{err}</p>}
    </form></div></main>);
}
