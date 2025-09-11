import { NextRequest, NextResponse } from 'next/server';
import { generationJobs } from '@/lib/jobStorage';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
  }

  const job = generationJobs.get(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json({
    status: job.status,
    progress: job.progress,
    message: job.message,
    result: job.result,
    error: job.error
  });
}
