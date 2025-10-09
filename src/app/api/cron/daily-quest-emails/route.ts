import { NextRequest, NextResponse } from "next/server";
import { sendDailyQuestEmailsForAllUsers } from "@/lib/daily-quest-email-service";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/cron/daily-quest-emails - Send daily quest emails (morning and evening)
export async function GET(req: NextRequest) {
  try {
    const secret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await sendDailyQuestEmailsForAllUsers();
    
    return NextResponse.json({ 
      ok: true, 
      ...result,
      timestamp: new Date().toISOString()
    }, { 
      headers: { "Cache-Control": "no-store" } 
    });
  } catch (error) {
    console.error("Error sending daily quest emails:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
