export const runtime = 'nodejs';

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hashRoadmap } from "@/lib/hash";
import { sendQuestReminderEmail } from "@/lib/quest-email-service";

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user?.email) return new Response("Unauthorized", { status: 401 });
  const u = await prisma.user.findUnique({ where: { email: s.user.email } });
  const goals = await prisma.goal.findMany({ where: { userId: u!.id }, orderBy: { createdAt: "desc" } });
  return new Response(JSON.stringify(goals), { headers: { "Content-Type": "application/json" } });
}

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s?.user?.email) return new Response("Unauthorized", { status: 401 });

  const u = await prisma.user.findUnique({ where: { email: s.user.email } });
  if (!u) return new Response("Unauthorized", { status: 401 });

  const { title, dailyMinutes, totalDays, content, startGoal } = await req.json();

  if (!title || !dailyMinutes || !totalDays || !content) {
    return new Response(JSON.stringify({ error: "Bad Request" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // Parse the content if it's a string
  const roadmapData = typeof content === 'string' ? JSON.parse(content) : content;
  
  // Sanitize the roadmap data to remove any null bytes that could cause UTF8 encoding issues
  const sanitizedRoadmapData = JSON.parse(JSON.stringify(roadmapData).replace(/\0/g, ''));
  const contentHash = hashRoadmap(sanitizedRoadmapData);

  // Find existing goal with the same hash
  let existing = await prisma.goal.findFirst({
    where: { userId: u.id, contentHash },
  });

  if (existing) {
    // If caller asked to start now and it's not started yet, set startDate
    if (startGoal && !existing.startDate) {
      existing = await prisma.goal.update({
        where: { id: existing.id },
        data: { 
          startDate: new Date(),
          roadmapJson: sanitizedRoadmapData // Update the roadmap data as well
        },
      });
      
      // Send daily quest email when goal is started
      try {
        await sendQuestReminderEmail(u.id, existing.id, new Date().toLocaleDateString());
      } catch (error) {
        console.error('Failed to send quest reminder email:', error);
        // Don't fail the request if email fails
      }
    }
    return new Response(JSON.stringify({ id: existing.id, existed: true, goal: existing }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }

  // Create new goal (first time we see this content for this user)
  const goal = await prisma.goal.create({
    data: {
      userId: u.id,
      title,
      dailyMinutes,
      totalDays,
      roadmapJson: sanitizedRoadmapData,
      startDate: startGoal ? new Date() : null,
      contentHash,
    },
  });

  // Send daily quest email if goal is started immediately
  if (startGoal) {
    try {
      await sendQuestReminderEmail(u.id, goal.id, new Date().toLocaleDateString());
    } catch (error) {
      console.error('Failed to send quest reminder email:', error);
      // Don't fail the request if email fails
    }
  }

  return new Response(JSON.stringify({ id: goal.id, existed: false, goal }), {
    headers: { "Content-Type": "application/json" },
    status: 201,
  });
}
