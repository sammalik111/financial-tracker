// src/app/api/analytics/route.ts
import { NextResponse } from 'next/server';
import { listTransactions, listAccounts } from '@/lib/aws/dynamo';
import { buildDashboardSummary } from '@/lib/analytics';
import { logger } from '@/lib/logger';
import type { ApiRes, DashboardSummary } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse<ApiRes<DashboardSummary>>> {
  try {
    const [transactions, accounts] = await Promise.all([
      listTransactions(undefined, 500),
      listAccounts(),
    ]);
    const summary = buildDashboardSummary(transactions, accounts);
    return NextResponse.json({ ok: true, data: summary });
  } catch (err) {
    logger.error('api_analytics_failed', { error: String(err) });
    return NextResponse.json({ ok: false, error: 'Analytics unavailable' }, { status: 500 });
  }
}
