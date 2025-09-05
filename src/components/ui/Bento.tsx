"use client";
import { ReactNode } from "react";

export function Bento({ title, right, color, children }:{
  title: string; right?: ReactNode; color?: string; children: ReactNode;
}) {
  return (
    <section className="bento" style={{ background: color ?? "var(--card)" }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <h2>{title}</h2>
        {right ?? null}
      </div>
      {children}
    </section>
  );
}
