// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { listAccounts } from '@/lib/aws/dynamo';

export const dynamic = 'force-dynamic';
const START = Date.now();

export async function GET() {
  let dbOk = false;
  try { await listAccounts(); dbOk = true; } catch { /* noop */ }

  return NextResponse.json({
    status: dbOk ? 'ok' : 'degraded',
    uptime: Math.floor((Date.now() - START) / 1000),
    timestamp: new Date().toISOString(),
    services: { dynamodb: dbOk ? 'ok' : 'error' },
  }, { status: dbOk ? 200 : 503 });
}
