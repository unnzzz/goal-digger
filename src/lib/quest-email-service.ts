import { prisma } from './db';
import { sendEmail } from './mailer';
import { generateQuestReminderEmail, generateQuestCompletionEmail, QuestReminderData } from './email-templates';

export interface QuestProgress {
  dayNumber: number;
  dayTitle: string;
  totalMinutes: number;
  quests: {
    section: 'learn' | 'practice' | 'reflect';
    index: number;
    title: string;
    url?: string;
    kind?: 'watch' | 'read' | 'listen';
    duration?: number;
    completed: boolean;
  }[];
}

export async function getQuestProgress(userId: string, goalId: string, dateLabel: string): Promise<QuestProgress | null> {
  try {
    // Get the goal and its roadmap
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) return null;

    const roadmap = goal.roadmapJson as any;
    if (!roadmap?.days) return null;

    // Find today's day data
    const today = roadmap.days.find((day: any) => day.day === 1); // For now, assume day 1
    if (!today) return null;

    // Get completed quests for today
    const completions = await prisma.questCompletion.findMany({
      where: {
        userId,
        goalId,
        dayNumber: today.day,
      },
    });

    // Create a set of completed quests for quick lookup
    const completedSet = new Set(
      completions.map(c => `${c.section}-${c.index}`)
    );

    // Build quest list
    const quests: QuestProgress['quests'] = [];

    // Add learn quests
    if (today.learn) {
      today.learn.forEach((quest: any, index: number) => {
        quests.push({
          section: 'learn',
          index,
          title: quest.title,
          url: quest.url,
          kind: quest.kind,
          duration: quest.duration_minutes,
          completed: completedSet.has(`learn-${index}`),
        });
      });
    }

    // Add practice quests
    if (today.practice) {
      today.practice.forEach((quest: any, index: number) => {
        quests.push({
          section: 'practice',
          index,
          title: quest.title,
          url: quest.url,
          kind: quest.kind,
          duration: quest.duration_minutes,
          completed: completedSet.has(`practice-${index}`),
        });
      });
    }

    // Add reflect quest
    if (today.reflect) {
      quests.push({
        section: 'reflect',
        index: 0,
        title: today.reflect,
        completed: completedSet.has('reflect-0'),
      });
    }

    return {
      dayNumber: today.day,
      dayTitle: today.title,
      totalMinutes: today.minutes,
      quests,
    };
  } catch (error) {
    console.error('Error getting quest progress:', error);
    return null;
  }
}

export async function sendQuestReminderEmail(userId: string, goalId: string, dateLabel: string): Promise<boolean> {
  try {
    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.email) return false;

    // Get goal info
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal) return false;

    // Get quest progress
    const progress = await getQuestProgress(userId, goalId, dateLabel);
    if (!progress) return false;

    // Calculate progress stats
    const completedQuests = progress.quests.filter(q => q.completed).length;
    const totalQuests = progress.quests.length;
    const progressPercentage = totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 100) : 0;

    // Calculate time remaining (simplified - you might want to make this more sophisticated)
    const timeRemaining = progressPercentage === 100 
      ? "All quests completed! 🎉" 
      : `Keep going! ${totalQuests - completedQuests} quests remaining.`;

    // Prepare email data
    const emailData: QuestReminderData = {
      userName: user.name || 'Quest Master',
      goalTitle: goal.title,
      dayNumber: progress.dayNumber,
      dayTitle: progress.dayTitle,
      totalMinutes: progress.totalMinutes,
      completedQuests,
      totalQuests,
      quests: progress.quests,
      progressPercentage,
      timeRemaining,
    };

    // Generate email content
    const emailHtml = progressPercentage === 100 
      ? generateQuestCompletionEmail(emailData)
      : generateQuestReminderEmail(emailData);

    const subject = progressPercentage === 100
      ? `🎉 Quest Complete! Day ${progress.dayNumber} - ${goal.title}`
      : `🎯 Daily Quest Reminder - Day ${progress.dayNumber} - ${goal.title}`;

    // Send email
    await sendEmail({
      to: user.email,
      subject,
      html: emailHtml,
    });

    // Update reminder state
    await prisma.reminderState.upsert({
      where: {
        userId_dateLabel: {
          userId,
          dateLabel,
        },
      },
      update: {
        lastSentAt: new Date(),
        completed: progressPercentage === 100,
      },
      create: {
        userId,
        dateLabel,
        lastSentAt: new Date(),
        completed: progressPercentage === 100,
      },
    });

    return true;
  } catch (error) {
    console.error('Error sending quest reminder email:', error);
    return false;
  }
}

export async function sendQuestRemindersForAllUsers(): Promise<{ sent: number; errors: number; skipped: number }> {
  try {
    // Get all active users with goals
    const users = await prisma.user.findMany({
      where: {
        emailVerified: { not: null },
        goals: { some: {} },
      },
      include: {
        goals: {
          where: {
            startDate: { not: null },
          },
          orderBy: { createdAt: 'desc' },
          take: 1, // Get their most recent active goal
        },
      },
    });

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    let sent = 0;
    let errors = 0;
    let skipped = 0;

    for (const user of users) {
      if (user.goals.length === 0) continue;

      const goal = user.goals[0];
      
      // Check if we should send a reminder for this user
      const shouldSend = await shouldSendReminder(user.id, today);
      if (!shouldSend) {
        skipped++;
        continue;
      }

      const success = await sendQuestReminderEmail(user.id, goal.id, today);
      
      if (success) {
        sent++;
      } else {
        errors++;
      }
    }

    return { sent, errors, skipped };
  } catch (error) {
    console.error('Error sending quest reminders for all users:', error);
    return { sent: 0, errors: 1, skipped: 0 };
  }
}

export async function shouldSendReminder(userId: string, dateLabel: string): Promise<boolean> {
  try {
    const reminderState = await prisma.reminderState.findUnique({
      where: {
        userId_dateLabel: {
          userId,
          dateLabel,
        },
      },
    });

    // If no reminder state exists, we should send one
    if (!reminderState) return true;

    // If already completed, don't send
    if (reminderState.completed) return false;

    // For Hobby plan: Send reminders every 4 hours instead of 2
    // This allows for 6 reminders per day (9am, 1pm, 5pm, 9pm, 1am, 5am)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    return reminderState.lastSentAt ? reminderState.lastSentAt < fourHoursAgo : true;
  } catch (error) {
    console.error('Error checking reminder state:', error);
    return false;
  }
}
