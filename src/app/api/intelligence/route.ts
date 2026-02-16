// src/app/api/intelligence/route.ts
import { NextResponse } from 'next/server';
import { fetchAllFieldIntelligence } from '@/lib/search';
import { buildMarketOverview } from '@/lib/intelligence';
import { logger } from '@/lib/logger';
import type { ApiRes, MarketOverview } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse<ApiRes<MarketOverview>>> {
  try {
    const fields   = await fetchAllFieldIntelligence();
    const overview = buildMarketOverview(fields);
    return NextResponse.json({ ok: true, data: overview });
  } catch (err) {
    logger.error('api_intelligence_failed', { error: String(err) });
    return NextResponse.json({ ok: false, error: 'Intelligence unavailable' }, { status: 503 });
  }
}
