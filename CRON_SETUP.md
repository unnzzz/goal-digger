# Quest Email System Setup

## New Daily Quest Email System

The system now sends **2 emails per day** for all your active goals:

1. **Morning Email** (8 AM UTC) - Start your day with quest reminders
2. **Evening Email** (6 PM UTC) - Check your progress and plan for tomorrow

### Features:
- **All Goals**: Shows quests for ALL your active goals in one email
- **Progress Tracking**: Visual progress bars and completion percentages
- **Smart Timing**: Only sends emails during appropriate hours (8-10 AM, 6-8 PM)
- **Beautiful Design**: Modern, responsive email templates
- **Resource Links**: Direct links to articles, videos, and practice materials

## Setup Options

### Option 1: GitHub Actions (Recommended - Free)
The system uses GitHub Actions to send emails twice daily:

**Current Setup:**
- Morning emails: `0 8 * * *` (8 AM UTC daily)
- Evening emails: `0 18 * * *` (6 PM UTC daily)
- Manual trigger available for testing

**Setup Steps:**
1. Go to your GitHub repository settings
2. Add secret: `CRON_SECRET` with a secure random string
3. The workflow will automatically run twice daily

### Option 2: External Cron Service
For more control, use an external cron service:

#### Using cron-job.org (Free)
1. Go to [cron-job.org](https://cron-job.org)
2. Create a free account
3. Add two cron jobs:
   - **Morning**: `0 8 * * *` → `https://your-app.vercel.app/api/cron/daily-quest-emails?secret=YOUR_SECRET`
   - **Evening**: `0 18 * * *` → `https://your-app.vercel.app/api/cron/daily-quest-emails?secret=YOUR_SECRET`

#### Using EasyCron (Free tier)
1. Go to [EasyCron](https://www.easycron.com)
2. Create a free account (5 cron jobs)
3. Add two cron jobs with the same schedule as above

### Option 3: Manual Testing
Test the system manually:
```bash
# Send emails to all users
curl -X GET "https://your-app.vercel.app/api/cron/daily-quest-emails?secret=YOUR_SECRET"
```

## Environment Variables

Add to your Vercel environment variables:
```
CRON_SECRET=your-secret-key-here
```

## How It Works

1. **Smart Timing**: Checks user's timezone and only sends emails during appropriate hours
2. **All Goals**: Aggregates quests from all active goals into one comprehensive email
3. **Progress Tracking**: Shows completion status for each quest and overall progress
4. **Resource Links**: Includes direct links to articles, videos, and practice materials
5. **Beautiful Design**: Modern, responsive email templates with progress bars

## Email Content

Each email includes:
- **Overall Progress**: Total quests completed across all goals
- **Goal Cards**: Individual progress for each active goal
- **Quest Details**: Title, completion status, and resource links
- **Call-to-Action**: Direct link to dashboard
- **Motivational Content**: Encouraging messages based on time of day

## Monitoring

Check the logs in Vercel dashboard to see:
- How many emails were sent
- How many were skipped (wrong timezone/time)
- Any errors that occurred

## Legacy System

The old reminder system (`/api/cron/reminders`) is still available but the new daily quest email system provides a much better user experience with:
- Better design and layout
- All goals in one email
- More frequent updates (2x per day)
- Better progress tracking
