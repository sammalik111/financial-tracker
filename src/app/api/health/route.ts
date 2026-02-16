// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
const START = Date.now();
export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json({
    status: 'ok', uptime: Math.floor((Date.now() - START) / 1000),
    timestamp: new Date().toISOString(),
  });
}
