import { NextRequest, NextResponse } from "next/server";
import { generateRoadmap } from "@/lib/generateRoadmap";
import { checkGoalSafety } from "@/lib/goalGuard";
import { z } from "zod";

const Input = z.object({
  goal: z.string(),
  total_days: z.number().int().optional(),
  daily_minutes: z.number().int(),
});

// Store generation jobs in memory (in production, use Redis or database)
const generationJobs = new Map<string, {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  result?: any;
  error?: string;
  createdAt: Date;
}>();

// Export for use by status endpoint
export { generationJobs as jobs };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Safety check
    const goal = String(body?.goal || "");
    const guard = checkGoalSafety(goal);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.reason || "This goal is not allowed." }, { status: 400 });
    }

    const params = Input.parse(body);
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create job
    generationJobs.set(jobId, {
      id: jobId,
      status: 'pending',
      progress: 0,
      message: 'Starting generation...',
      createdAt: new Date(),
    });

    // Start generation in background
    generateRoadmapInBackground(jobId, params);

    return NextResponse.json({ 
      jobId,
      status: 'pending',
      message: 'Generation started'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 400 });
  }
}

async function generateRoadmapInBackground(jobId: string, params: any) {
  const job = generationJobs.get(jobId);
  if (!job) return;

  try {
    job.status = 'running';
    job.message = 'Generating roadmap...';
    job.progress = 10;

    // Simulate the generation process with progress updates
    const result = await generateRoadmap(params);
    
    job.status = 'completed';
    job.progress = 100;
    job.message = 'Generation completed!';
    job.result = result;
    
    console.log(`Generation job ${jobId} completed successfully`);
  } catch (error: any) {
    job.status = 'failed';
    job.error = error.message || 'Generation failed';
    job.message = 'Generation failed';
    console.error(`Generation job ${jobId} failed:`, error);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');
  
  if (!jobId) {
    return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
  }

  const job = generationJobs.get(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    message: job.message,
    result: job.result,
    error: job.error,
  });
}
