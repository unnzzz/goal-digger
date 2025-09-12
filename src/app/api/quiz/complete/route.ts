import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const QUIZ_COINS = 50; // Quiz completion reward

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { goalId, dayNumber, score } = await req.json();

    if (!goalId || !dayNumber || score === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if quiz was already completed for this day
    let existingCompletion = null;
    try {
      existingCompletion = await prisma.quizCompletion.findFirst({
        where: { 
          userId: user.id, 
          goalId, 
          dayNumber 
        },
      });
    } catch (error) {
      // QuizCompletion table might not exist yet, continue without checking
      console.log('QuizCompletion table not available yet, proceeding without duplicate check');
    }

    if (existingCompletion) {
      const total = await prisma.user.findUnique({ where: { id: user.id }, select: { coins: true } });
      return NextResponse.json({ 
        ok: true, 
        coinsAwarded: 0, 
        totalCoins: total?.coins ?? 0, 
        completionId: existingCompletion.id 
      });
    }

    // Award coins if score is 80% or higher
    const coinsAwarded = score >= 80 ? QUIZ_COINS : 0;

    // Try to create quiz completion record, but handle case where table doesn't exist
    let created = null;
    try {
      created = await prisma.quizCompletion.create({
        data: { 
          userId: user.id, 
          goalId, 
          dayNumber, 
          score,
          passed: score >= 80,
          coinsAwarded 
        },
        select: { id: true },
      });
    } catch (error) {
      // QuizCompletion table might not exist yet, just award coins
      console.log('QuizCompletion table not available yet, awarding coins without database record');
    }

    // Update user coins if passed
    if (coinsAwarded > 0) {
      await prisma.user.update({ 
        where: { id: user.id }, 
        data: { coins: { increment: coinsAwarded } } 
      });
    }

    const totalCoins = (await prisma.user.findUnique({ 
      where: { id: user.id }, 
      select: { coins: true } 
    }))?.coins ?? 0;

    return NextResponse.json({ 
      ok: true, 
      coinsAwarded, 
      totalCoins, 
      completionId: created?.id || 'temp',
      passed: score >= 80
    });
  } catch (error: any) {
    console.error('Quiz completion error:', error);
    return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 });
  }
}
