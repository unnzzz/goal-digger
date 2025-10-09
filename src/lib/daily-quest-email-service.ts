import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { dayNumberFrom, localNowParts, isValidTZ } from "@/lib/time";

export interface DailyQuestData {
  userName: string;
  dateLabel: string;
  goals: {
    goalTitle: string;
    dayNumber: number;
    dayTitle: string;
    totalMinutes: number;
    completedQuests: number;
    totalQuests: number;
    progressPercentage: number;
    quests: {
      section: 'learn' | 'practice' | 'reflect' | 'quiz';
      title: string;
      url?: string;
      completed: boolean;
      index: number;
    }[];
  }[];
  totalCompletedQuests: number;
  totalQuests: number;
  overallProgress: number;
}

export async function sendDailyQuestEmail(userId: string, dateLabel: string, isMorning: boolean = true): Promise<boolean> {
  try {
    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.email) return false;

    // Get all active goals for the user
    const goals = await prisma.goal.findMany({
      where: { 
        userId: userId,
        startDate: { not: null }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (goals.length === 0) return false;

    const goalsData = [];
    let totalCompletedQuests = 0;
    let totalQuests = 0;

    for (const goal of goals) {
      const roadmap = goal.roadmapJson as any;
      if (!roadmap?.days?.length) continue;

      const dayNumber = dayNumberFrom(new Date(goal.startDate!), dateLabel);
      if (dayNumber < 1 || dayNumber > roadmap.total_days) continue;

      const day = roadmap.days.find((d: any) => d.day === dayNumber) || roadmap.days[dayNumber - 1];
      if (!day) continue;

      // Get quest completions for this day
      const completions = await prisma.questCompletion.findMany({
        where: { 
          userId: userId, 
          goalId: goal.id, 
          dayNumber: dayNumber 
        },
        select: { section: true, index: true }
      });

      const quizCompletions = await prisma.quizCompletion.findMany({
        where: { 
          userId: userId, 
          goalId: goal.id, 
          dayNumber: dayNumber 
        },
        select: { passed: true }
      });

      const isCompleted = (section: string, index: number) => 
        completions.some(c => c.section === section && c.index === index);

      // Build quests array
      const quests = [];
      
      // Learn quests
      if (day.learn) {
        for (let i = 0; i < day.learn.length; i++) {
          const quest = day.learn[i];
          quests.push({
            section: 'learn' as const,
            title: quest?.title || `Learn ${i + 1}`,
            url: quest?.url,
            completed: isCompleted('learn', i),
            index: i
          });
        }
      }

      // Practice quests
      if (day.practice) {
        for (let i = 0; i < day.practice.length; i++) {
          const quest = day.practice[i];
          quests.push({
            section: 'practice' as const,
            title: quest?.title || `Practice ${i + 1}`,
            url: quest?.url,
            completed: isCompleted('practice', i),
            index: i
          });
        }
      }

      // Reflection quest
      if (day.reflect) {
        quests.push({
          section: 'reflect' as const,
          title: day.reflect?.title || 'Daily Reflection',
          url: day.reflect?.url,
          completed: isCompleted('reflect', 0),
          index: 0
        });
      }

      // Quiz quest
      if (day.quiz && day.quiz.length > 0) {
        const isQuizCompleted = quizCompletions.length > 0;
        quests.push({
          section: 'quiz' as const,
          title: `Quiz: Day ${dayNumber}`,
          url: day.quiz[0]?.url,
          completed: isQuizCompleted,
          index: 0
        });
      }

      const completedQuests = quests.filter(q => q.completed).length;
      const totalQuestsForGoal = quests.length;
      const progressPercentage = totalQuestsForGoal > 0 ? Math.round((completedQuests / totalQuestsForGoal) * 100) : 0;

      goalsData.push({
        goalTitle: goal.title,
        dayNumber: dayNumber,
        dayTitle: day.title || `Day ${dayNumber}`,
        totalMinutes: day.total_minutes || 30,
        completedQuests,
        totalQuests: totalQuestsForGoal,
        progressPercentage,
        quests
      });

      totalCompletedQuests += completedQuests;
      totalQuests += totalQuestsForGoal;
    }

    if (goalsData.length === 0) return false;

    const overallProgress = totalQuests > 0 ? Math.round((totalCompletedQuests / totalQuests) * 100) : 0;

    const emailData: DailyQuestData = {
      userName: user.name || 'Quest Master',
      dateLabel: dateLabel,
      goals: goalsData,
      totalCompletedQuests,
      totalQuests,
      overallProgress
    };

    // Generate email content
    const emailHtml = generateDailyQuestEmail(emailData, isMorning);
    const timeOfDay = isMorning ? 'Morning' : 'Evening';
    const subject = `${timeOfDay} Quest Update - ${totalCompletedQuests}/${totalQuests} completed (${overallProgress}%)`;

    // Send email
    await sendEmail({
      to: user.email,
      subject,
      html: emailHtml,
    });

    return true;
  } catch (error) {
    console.error('Failed to send daily quest email:', error);
    return false;
  }
}

export async function sendDailyQuestEmailsForAllUsers(): Promise<{ sent: number; errors: number; skipped: number }> {
  try {
    const users = await prisma.user.findMany({
      where: {
        goals: { some: { startDate: { not: null } } },
      },
      select: { id: true, email: true, tz: true },
    });

    let sent = 0;
    let errors = 0;
    let skipped = 0;

    for (const user of users) {
      const tz = (user.tz && isValidTZ(user.tz)) ? user.tz! : "America/Detroit";
      const now = localNowParts(tz);
      const dateLabel = now.label;

      // Send morning email (8 AM - 10 AM)
      const isMorningTime = now.h >= 8 && now.h < 10;
      // Send evening email (6 PM - 8 PM)
      const isEveningTime = now.h >= 18 && now.h < 20;

      if (isMorningTime || isEveningTime) {
        const success = await sendDailyQuestEmail(user.id, dateLabel, isMorningTime);
        
        if (success) {
          sent++;
        } else {
          errors++;
        }
      } else {
        skipped++;
      }
    }

    return { sent, errors, skipped };
  } catch (error) {
    console.error('Error sending daily quest emails for all users:', error);
    return { sent: 0, errors: 1, skipped: 0 };
  }
}

function generateDailyQuestEmail(data: DailyQuestData, isMorning: boolean): string {
  const timeOfDay = isMorning ? 'morning' : 'evening';
  const greeting = isMorning ? 'Good morning' : 'Good evening';
  const motivation = isMorning 
    ? 'Ready to tackle today\'s quests?' 
    : 'How did your quests go today?';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Daily Quest ${isMorning ? 'Morning' : 'Evening'} Update</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 28px; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .progress-bar { background: #f0f0f0; border-radius: 10px; height: 20px; margin: 20px 0; overflow: hidden; }
        .progress-fill { background: linear-gradient(90deg, #4CAF50, #45a049); height: 100%; border-radius: 10px; transition: width 0.3s ease; }
        .goal-card { background: white; border: 1px solid #e0e0e0; border-radius: 10px; margin: 20px 0; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .goal-header { background: #f8f9fa; padding: 20px; border-bottom: 1px solid #e0e0e0; }
        .goal-title { font-size: 20px; font-weight: bold; margin: 0 0 5px 0; color: #2c3e50; }
        .goal-subtitle { color: #7f8c8d; margin: 0; }
        .quests-section { padding: 20px; }
        .quest-item { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
        .quest-item:last-child { border-bottom: none; }
        .quest-icon { width: 24px; height: 24px; margin-right: 15px; display: flex; align-items: center; justify-content: center; }
        .quest-completed { color: #4CAF50; }
        .quest-pending { color: #ff9800; }
        .quest-content { flex: 1; }
        .quest-title { font-weight: 500; margin: 0 0 5px 0; }
        .quest-url { color: #3498db; text-decoration: none; font-size: 14px; }
        .quest-url:hover { text-decoration: underline; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #7f8c8d; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎯 ${greeting}, ${data.userName}!</h1>
        <p>${motivation}</p>
      </div>

      <div style="text-align: center; margin-bottom: 30px;">
        <h2>Overall Progress: ${data.totalCompletedQuests}/${data.totalQuests} quests completed</h2>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${data.overallProgress}%"></div>
        </div>
        <p style="font-size: 18px; font-weight: bold; color: #2c3e50;">${data.overallProgress}% Complete</p>
      </div>

      ${data.goals.map(goal => `
        <div class="goal-card">
          <div class="goal-header">
            <div class="goal-title">${goal.goalTitle}</div>
            <div class="goal-subtitle">Day ${goal.dayNumber}: ${goal.dayTitle} • ${goal.totalMinutes} minutes</div>
          </div>
          <div class="quests-section">
            <div style="margin-bottom: 15px;">
              <strong>Progress: ${goal.completedQuests}/${goal.totalQuests} completed (${goal.progressPercentage}%)</strong>
            </div>
            ${goal.quests.map(quest => `
              <div class="quest-item">
                <div class="quest-icon ${quest.completed ? 'quest-completed' : 'quest-pending'}">
                  ${quest.completed ? '✅' : '⏳'}
                </div>
                <div class="quest-content">
                  <div class="quest-title">${quest.title}</div>
                  ${quest.url ? `<a href="${quest.url}" class="quest-url" target="_blank">View Resource</a>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}

      <div style="text-align: center;">
        <a href="${process.env.NEXTAUTH_URL || 'https://goal-digger.vercel.app'}/dashboard" class="cta-button">
          ${isMorning ? 'Start Your Quests' : 'Check Progress'}
        </a>
      </div>

      <div class="footer">
        <p>Keep up the great work! Every quest completed brings you closer to your goals.</p>
        <p>This is your ${timeOfDay} quest update for ${data.dateLabel}</p>
      </div>
    </body>
    </html>
  `;
}
