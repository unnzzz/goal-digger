import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendQuestReminderEmail } from "@/lib/quest-email-service";

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { goalId } = await req.json();
    
    if (!goalId) {
      return NextResponse.json({ error: "Goal ID is required" }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const success = await sendQuestReminderEmail(userId, goalId, today);
    
    if (success) {
      return NextResponse.json({ 
        message: "Test quest reminder sent successfully",
        email: session.user.email
      });
    } else {
      return NextResponse.json({ 
        error: "Failed to send test quest reminder" 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error sending test quest reminder:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
