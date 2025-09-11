import nodemailer from "nodemailer";

let cachedTransport: nodemailer.Transporter | null = null;

export async function getTransport() {
  if (cachedTransport) return cachedTransport;

  const host = process.env.EMAIL_SERVER_HOST;
  const port = process.env.EMAIL_SERVER_PORT ? Number(process.env.EMAIL_SERVER_PORT) : undefined;
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;

  if (host && port && user && pass) {
    cachedTransport = nodemailer.createTransport({
      host, port, auth: { user, pass }, secure: port === 465,
    });
    return cachedTransport;
  }

  // Dev fallback: Ethereal mailbox (prints preview URL in logs)
  const test = await nodemailer.createTestAccount();
  cachedTransport = nodemailer.createTransport({
    host: test.smtp.host,
    port: test.smtp.port,
    secure: test.smtp.secure,
    auth: { user: test.user, pass: test.pass },
  });
  return cachedTransport;
}

export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text?: string }) {
  const transporter = await getTransport();
  const from = process.env.EMAIL_FROM || "Goal Digger <no-reply@example.com>";

  const info = await transporter.sendMail({
    to, from, subject, html, text,
  });

  // Log preview URL for Ethereal (dev)
  const preview = (nodemailer as any).getTestMessageUrl?.(info);
  if (preview) {
    console.log("📧 Ethereal preview:", preview);
  }
}

export async function sendVerificationEmail(to: string, url: string) {
  const transporter = await getTransport();
  const from = process.env.EMAIL_FROM || "Roadmap App <no-reply@example.com>";

  const info = await transporter.sendMail({
    to, from,
    subject: "Verify your email",
    html: `
      <div style="font-family:system-ui,Segoe UI,Arial">
        <h2>Confirm your email</h2>
        <p>Click the button below to verify your email and activate your account.</p>
        <p><a href="${url}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;border-radius:6px;text-decoration:none">Verify email</a></p>
        <p>If the button doesn't work, copy and paste this link:</p>
        <code>${url}</code>
      </div>
    `,
    text: `Verify your email: ${url}`,
  });

  // Log preview URL for Ethereal (dev)
  const preview = (nodemailer as any).getTestMessageUrl?.(info);
  if (preview) {
    console.log("📧 Ethereal preview:", preview);
  }
}
