"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [name,setName]=useState("");
  const [err,setErr]=useState<string|null>(null); const router=useRouter();

  const submit = async (e:React.FormEvent)=> {
    e.preventDefault(); setErr(null);
    const res = await fetch("/api/signup",{ method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({email,password,name})});
    if(!res.ok){ const j=await res.json(); setErr(j.error||"Sign up failed"); return; }
    await signIn("credentials",{ email,password,redirect:false }); router.push("/dashboard");
  };

  return (<main className="container"><div className="card">
    <h1>Create account</h1>
    <form onSubmit={submit}>
      <label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} required />
      <label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
      <label>Name (optional)</label><input value={name} onChange={e=>setName(e.target.value)} />
      <button className="btn" style={{marginTop:12}}>Sign up</button>{err&&<p style={{color:"#f88"}}>{err}</p>}
    </form></div></main>);
}
