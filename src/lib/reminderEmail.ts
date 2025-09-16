// src/lib/reminderEmail.ts - Sequential quest unlocking verified
import { getTransport } from "@/lib/mailer";

const BASE_URL = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

export type RemainingItem = {
  goalTitle: string;
  dayNumber: number;
  section: "learn" | "practice" | "reflect" | "quiz";
  index: number;
  title?: string;
  url?: string;
};

export async function sendReminderEmail(toEmail: string, dateLabel: string, items: RemainingItem[]) {
  const t = await getTransport();

  const lines = items.map(it => {
    const tt = it.title ? ` — ${it.title}` : "";
    const link = it.url ? ` (${it.url})` : "";
    return `• ${it.goalTitle} — Day ${it.dayNumber} — ${it.section.toUpperCase()}${tt}${link}`;
  }).join("\n");

  const dashboardLink = `${BASE_URL}/dashboard`;
  const subject = `Daily quests reminder — ${dateLabel}`;
  const text = `You still have quests to complete today:\n\n${lines}\n\nOpen daily quests: ${dashboardLink}`;

  const html = `
    <div>
      <p>You still have quests to complete today:</p>
      <ul>
        ${items.map(it => `
          <li>
            <strong>${escapeHtml(it.goalTitle)}</strong> — Day ${it.dayNumber} — <em>${it.section.toUpperCase()}</em>
            ${it.title ? ` — ${escapeHtml(it.title)}` : ""}
            ${it.url ? ` — <a href="${it.url}" target="_blank" rel="noreferrer">resource</a>` : ""}
          </li>`).join("")}
      </ul>
      <p><a href="${dashboardLink}">Open daily quests</a></p>
    </div>
  `;

  await t.sendMail({
    to: toEmail,
    from: process.env.EMAIL_FROM || "no-reply@example.com",
    subject,
    text,
    html,
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g,(c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c] as string));
}
