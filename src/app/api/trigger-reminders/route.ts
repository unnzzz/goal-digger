import { NextRequest, NextResponse } from "next/server";
import { sendQuestRemindersForAllUsers } from "@/lib/quest-email-service";

export const runtime = 'nodejs';

// POST /api/trigger-reminders - Manual trigger for quest reminders
// This can be called by external cron services like cron-job.org
export async function POST(req: NextRequest) {
  try {
    // Simple authentication - you can add a secret key if needed
    const authHeader = req.headers.get('authorization');
    const expectedAuth = process.env.CRON_SECRET || 'default-secret';
    
    if (authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await sendQuestRemindersForAllUsers();
    
    return NextResponse.json({
      message: "Quest reminders processed",
      sent: result.sent,
      errors: result.errors,
      skipped: result.skipped,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error triggering quest reminders:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}

// GET /api/trigger-reminders - Simple trigger without auth (for testing)
export async function GET(req: NextRequest) {
  try {
    const result = await sendQuestRemindersForAllUsers();
    
    return NextResponse.json({
      message: "Quest reminders processed",
      sent: result.sent,
      errors: result.errors,
      skipped: result.skipped,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error triggering quest reminders:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
