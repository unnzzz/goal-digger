import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendQuestReminderEmail, sendQuestRemindersForAllUsers, shouldSendReminder } from "@/lib/quest-email-service";

export const runtime = 'nodejs';

// POST /api/send-quest-reminders - Send quest reminder for a specific user
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { goalId, dateLabel } = await req.json();
    
    if (!goalId) {
      return NextResponse.json({ error: "Goal ID is required" }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const targetDate = dateLabel || today;

    // Check if we should send a reminder
    const shouldSend = await shouldSendReminder(session.user.id, targetDate);
    if (!shouldSend) {
      return NextResponse.json({ 
        message: "Reminder not needed at this time",
        reason: "Already sent recently or quests completed"
      });
    }

    const success = await sendQuestReminderEmail(session.user.id, goalId, targetDate);
    
    if (success) {
      return NextResponse.json({ 
        message: "Quest reminder sent successfully",
        date: targetDate
      });
    } else {
      return NextResponse.json({ 
        error: "Failed to send quest reminder" 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error sending quest reminder:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}

// GET /api/send-quest-reminders - Send quest reminders for all users (admin/cron job)
export async function GET(req: NextRequest) {
  try {
    // In production, you might want to add admin authentication here
    // For now, we'll allow this endpoint to be called by cron jobs
    
    const result = await sendQuestRemindersForAllUsers();
    
    return NextResponse.json({
      message: "Quest reminders processed",
      sent: result.sent,
      errors: result.errors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error sending quest reminders for all users:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
