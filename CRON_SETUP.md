# Quest Reminder Email System Setup

## Vercel Hobby Plan Limitations

Vercel's Hobby plan only allows:
- 2 cron jobs per account
- 1 execution per day per cron job
- No guaranteed timing (can be 1 hour late)

## Solutions for More Frequent Reminders

### Option 1: Vercel Cron (Once Daily)
The system is configured to run once daily at 9 AM UTC and send reminders to users who haven't received one in the last 4 hours.

**Current Setup:**
- Cron job runs at `0 9 * * *` (9 AM UTC daily)
- Sends reminders every 4 hours for users who need them
- Stops sending when all quests are completed

### Option 2: External Cron Service (Recommended)
For more frequent reminders (every 2-4 hours), use an external cron service:

#### Using cron-job.org (Free)
1. Go to [cron-job.org](https://cron-job.org)
2. Create a free account
3. Add a new cron job:
   - **URL**: `https://your-app.vercel.app/api/trigger-reminders`
   - **Schedule**: `0 */4 * * *` (every 4 hours)
   - **Method**: GET
   - **Title**: "Quest Reminders"

#### Using EasyCron (Free tier)
1. Go to [EasyCron](https://www.easycron.com)
2. Create a free account (5 cron jobs)
3. Add a new cron job:
   - **URL**: `https://your-app.vercel.app/api/trigger-reminders`
   - **Schedule**: `0 */4 * * *` (every 4 hours)
   - **Method**: GET

#### Using GitHub Actions (Free)
Create `.github/workflows/quest-reminders.yml`:
```yaml
name: Quest Reminders
on:
  schedule:
    - cron: '0 */4 * * *'  # Every 4 hours
  workflow_dispatch:  # Manual trigger

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Quest Reminders
        run: |
          curl -X GET "https://your-app.vercel.app/api/trigger-reminders"
```

### Option 3: Manual Testing
Test the system manually:
```bash
# Send reminders to all users
curl -X GET "https://your-app.vercel.app/api/trigger-reminders"

# Send reminder to specific user (requires auth)
curl -X POST "https://your-app.vercel.app/api/send-quest-reminders" \
  -H "Content-Type: application/json" \
  -d '{"goalId": "your-goal-id"}'
```

## Environment Variables

Add to your Vercel environment variables:
```
CRON_SECRET=your-secret-key-here
```

## How It Works

1. **Daily Cron**: Runs once per day at 9 AM UTC
2. **Smart Reminders**: Only sends to users who:
   - Have active goals
   - Haven't completed all quests
   - Haven't received a reminder in the last 4 hours
3. **Completion Detection**: Stops sending when all quests are done
4. **Progress Tracking**: Shows completion status and remaining quests

## Monitoring

Check the logs in Vercel dashboard to see:
- How many emails were sent
- How many were skipped (already sent recently)
- Any errors that occurred

## Upgrade to Pro Plan

For unlimited cron executions, consider upgrading to Vercel Pro:
- 40 cron jobs per account
- Unlimited cron invocations
- Guaranteed timing
- Better performance
