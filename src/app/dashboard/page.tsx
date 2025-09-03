import Link from "next/link";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const s = await getServerSession(authOptions);
  if (!s?.user?.email) redirect("/login");
  const u = await prisma.user.findUnique({ where: { email: s.user.email } });
  const goals = await prisma.goal.findMany({ where: { userId: u!.id }, orderBy: { createdAt:"desc" } });
  return (
    <main className="container"><div className="card">
      <h1>Your goals</h1>
      <p><Link className="btn" href="/">Create new roadmap</Link></p>
      <ul className="list">
        {goals.map(g => (<li key={g.id}><Link href={`/goal/${g.id}`}>{g.title}</Link> <span className="kpill">{g.totalDays} days</span></li>))}
      </ul>
    </div></main>
  );
}
