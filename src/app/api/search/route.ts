// src/app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { searchJobs } from '@/lib/search';
import type { ApiRes, SearchResponse } from '@/types';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  query:    z.string().min(1).max(200),
  field:    z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  country:  z.string().length(2).default('us'),
  remote:   z.enum(['true','false']).transform(v => v === 'true').optional(),
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: NextRequest): Promise<NextResponse<ApiRes<SearchResponse>>> {
  const raw    = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid params', code: 'VALIDATION' }, { status: 400 });

  try {
    const data = await searchJobs(parsed.data);
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json({ ok: false, error: 'Search failed' }, { status: 503 });
  }
}
