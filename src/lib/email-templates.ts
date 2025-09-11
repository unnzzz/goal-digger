export interface QuestReminderData {
  userName: string;
  goalTitle: string;
  dayNumber: number;
  dayTitle: string;
  totalMinutes: number;
  completedQuests: number;
  totalQuests: number;
  quests: {
    section: 'learn' | 'practice' | 'reflect';
    index: number;
    title: string;
    url?: string;
    kind?: 'watch' | 'read' | 'listen';
    duration?: number;
    completed: boolean;
  }[];
  progressPercentage: number;
  timeRemaining: string;
}

export function generateQuestReminderEmail(data: QuestReminderData): string {
  const { userName, goalTitle, dayNumber, dayTitle, totalMinutes, completedQuests, totalQuests, quests, progressPercentage, timeRemaining } = data;
  
  const completedColor = '#10B981'; // Green
  const pendingColor = '#F59E0B'; // Amber
  const primaryColor = '#3B82F6'; // Blue
  const textColor = '#374151'; // Gray-700
  const lightGray = '#F9FAFB'; // Gray-50
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Daily Quest - ${goalTitle}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: ${textColor};
            margin: 0;
            padding: 0;
            background-color: #f3f4f6;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, ${primaryColor} 0%, #1D4ED8 100%);
            color: white;
            padding: 32px 24px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .header p {
            margin: 8px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .progress-section {
            padding: 24px;
            background-color: ${lightGray};
            border-bottom: 1px solid #E5E7EB;
        }
        .progress-bar {
            width: 100%;
            height: 12px;
            background-color: #E5E7EB;
            border-radius: 6px;
            overflow: hidden;
            margin: 16px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, ${completedColor} 0%, #059669 100%);
            width: ${progressPercentage}%;
            transition: width 0.3s ease;
        }
        .progress-stats {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 16px;
        }
        .stat {
            text-align: center;
        }
        .stat-number {
            font-size: 24px;
            font-weight: 700;
            color: ${primaryColor};
        }
        .stat-label {
            font-size: 14px;
            color: #6B7280;
            margin-top: 4px;
        }
        .quests-section {
            padding: 24px;
        }
        .section-title {
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 16px 0;
            color: ${textColor};
        }
        .quest-list {
            margin: 0;
            padding: 0;
            list-style: none;
        }
        .quest-item {
            display: flex;
            align-items: center;
            padding: 16px;
            margin-bottom: 12px;
            background-color: white;
            border: 2px solid #E5E7EB;
            border-radius: 8px;
            transition: all 0.2s ease;
        }
        .quest-item.completed {
            border-color: ${completedColor};
            background-color: #F0FDF4;
        }
        .quest-item.pending {
            border-color: ${pendingColor};
            background-color: #FFFBEB;
        }
        .quest-checkbox {
            width: 20px;
            height: 20px;
            border-radius: 4px;
            margin-right: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
        }
        .quest-checkbox.completed {
            background-color: ${completedColor};
            color: white;
        }
        .quest-checkbox.pending {
            background-color: ${pendingColor};
            color: white;
        }
        .quest-content {
            flex: 1;
        }
        .quest-title {
            font-weight: 600;
            margin: 0 0 4px 0;
            color: ${textColor};
        }
        .quest-meta {
            font-size: 14px;
            color: #6B7280;
            margin: 0;
        }
        .quest-link {
            color: ${primaryColor};
            text-decoration: none;
            font-weight: 500;
        }
        .quest-link:hover {
            text-decoration: underline;
        }
        .time-remaining {
            background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
            border: 1px solid #F59E0B;
            border-radius: 8px;
            padding: 16px;
            margin: 24px 0;
            text-align: center;
        }
        .time-remaining h3 {
            margin: 0 0 8px 0;
            color: #92400E;
            font-size: 18px;
        }
        .time-remaining p {
            margin: 0;
            color: #92400E;
            font-size: 14px;
        }
        .footer {
            background-color: #F9FAFB;
            padding: 24px;
            text-align: center;
            border-top: 1px solid #E5E7EB;
        }
        .footer p {
            margin: 0;
            color: #6B7280;
            font-size: 14px;
        }
        .motivation {
            background: linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%);
            border: 1px solid #A78BFA;
            border-radius: 8px;
            padding: 16px;
            margin: 24px 0;
            text-align: center;
        }
        .motivation h3 {
            margin: 0 0 8px 0;
            color: #5B21B6;
            font-size: 18px;
        }
        .motivation p {
            margin: 0;
            color: #5B21B6;
            font-size: 14px;
        }
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            .header {
                padding: 24px 16px;
            }
            .header h1 {
                font-size: 24px;
            }
            .progress-section, .quests-section, .footer {
                padding: 16px;
            }
            .quest-item {
                padding: 12px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Daily Quest Reminder</h1>
            <p>Day ${dayNumber}: ${dayTitle}</p>
        </div>
        
        <div class="progress-section">
            <h2 style="margin: 0 0 16px 0; font-size: 18px; color: ${textColor};">${goalTitle}</h2>
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <div class="progress-stats">
                <div class="stat">
                    <div class="stat-number">${completedQuests}</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${totalQuests}</div>
                    <div class="stat-label">Total Quests</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${totalMinutes}m</div>
                    <div class="stat-label">Today's Goal</div>
                </div>
            </div>
        </div>
        
        <div class="quests-section">
            <h2 class="section-title">📚 Today's Quests</h2>
            <ul class="quest-list">
                ${quests.map(quest => `
                    <li class="quest-item ${quest.completed ? 'completed' : 'pending'}">
                        <div class="quest-checkbox ${quest.completed ? 'completed' : 'pending'}">
                            ${quest.completed ? '✓' : '○'}
                        </div>
                        <div class="quest-content">
                            <h3 class="quest-title">${quest.title}</h3>
                            <p class="quest-meta">
                                ${quest.kind ? `${quest.kind.charAt(0).toUpperCase() + quest.kind.slice(1)}` : 'Quest'}${quest.duration ? ` • ${quest.duration} min` : ''}
                                ${quest.url ? ` • <a href="${quest.url}" class="quest-link">Open Resource</a>` : ''}
                            </p>
                        </div>
                    </li>
                `).join('')}
            </ul>
        </div>
        
        ${progressPercentage < 100 ? `
        <div class="time-remaining">
            <h3>⏰ Time Remaining</h3>
            <p>${timeRemaining}</p>
        </div>
        ` : ''}
        
        <div class="motivation">
            <h3>💪 Keep Going!</h3>
            <p>${progressPercentage === 100 ? 
                '🎉 Amazing! You\'ve completed all your quests for today! You\'re one step closer to achieving your goal.' :
                'Every quest you complete brings you closer to your goal. You\'ve got this!'}
            </p>
        </div>
        
        <div class="footer">
            <p>This is an automated reminder from Goal Digger. You'll receive updates daily until all quests are completed.</p>
            <p><a href="${process.env.NEXTAUTH_URL || 'https://goal-digger.vercel.app'}/dashboard" style="background: linear-gradient(45deg, #8B5CF6, #A78BFA); color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; font-weight: 600; display: inline-block; margin: 16px 0;">Complete Your Quests</a></p>
            <p>Keep up the great work, ${userName}! 🚀</p>
        </div>
    </div>
</body>
</html>
  `;
}

export function generateQuestCompletionEmail(data: QuestReminderData): string {
  const { userName, goalTitle, dayNumber, dayTitle, totalMinutes, completedQuests, totalQuests, progressPercentage } = data;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quest Complete! - ${goalTitle}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #374151;
            margin: 0;
            padding: 0;
            background-color: #f3f4f6;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            color: white;
            padding: 32px 24px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .celebration {
            background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
            border: 1px solid #F59E0B;
            border-radius: 8px;
            padding: 24px;
            margin: 24px;
            text-align: center;
        }
        .celebration h2 {
            margin: 0 0 16px 0;
            color: #92400E;
            font-size: 24px;
        }
        .celebration p {
            margin: 0;
            color: #92400E;
            font-size: 16px;
        }
        .stats {
            display: flex;
            justify-content: space-around;
            padding: 24px;
            background-color: #F9FAFB;
        }
        .stat {
            text-align: center;
        }
        .stat-number {
            font-size: 32px;
            font-weight: 700;
            color: #10B981;
        }
        .stat-label {
            font-size: 14px;
            color: #6B7280;
            margin-top: 4px;
        }
        .footer {
            background-color: #F9FAFB;
            padding: 24px;
            text-align: center;
            border-top: 1px solid #E5E7EB;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Quest Complete!</h1>
            <p>Day ${dayNumber}: ${dayTitle}</p>
        </div>
        
        <div class="celebration">
            <h2>🏆 Congratulations, ${userName}!</h2>
            <p>You've successfully completed all your quests for today! Your dedication is paying off.</p>
        </div>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-number">${completedQuests}</div>
                <div class="stat-label">Quests Completed</div>
            </div>
            <div class="stat">
                <div class="stat-number">${totalMinutes}m</div>
                <div class="stat-label">Time Invested</div>
            </div>
            <div class="stat">
                <div class="stat-number">100%</div>
                <div class="stat-label">Progress</div>
            </div>
        </div>
        
        <div class="footer">
            <p>Great job on completing today's quests for <strong>${goalTitle}</strong>!</p>
            <p><a href="${process.env.NEXTAUTH_URL || 'https://goal-digger.vercel.app'}/dashboard" style="background: linear-gradient(45deg, #10B981, #059669); color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; font-weight: 600; display: inline-block; margin: 16px 0;">View Your Progress</a></p>
            <p>Check back tomorrow for your next set of challenges. Keep up the momentum! 🚀</p>
        </div>
    </div>
</body>
</html>
  `;
}
