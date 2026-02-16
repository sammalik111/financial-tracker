// src/app/api/accounts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAccount, listAccounts } from '@/lib/aws/dynamo';
import { logger } from '@/lib/logger';
import type { ApiRes, Account } from '@/types';

export const dynamic = 'force-dynamic';

const ACCOUNT_COLORS = ['#6366F1','#10B981','#F59E0B','#EF4444','#3B82F6','#8B5CF6','#EC4899'];

const CreateSchema = z.object({
  name:     z.string().min(1).max(100),
  type:     z.enum(['checking', 'savings', 'credit', 'investment', 'cash']),
  balance:  z.number().default(0),
  currency: z.string().length(3).default('USD'),
  color:    z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export async function GET(): Promise<NextResponse<ApiRes<Account[]>>> {
  try {
    const accounts = await listAccounts();
    return NextResponse.json({ ok: true, data: accounts });
  } catch (err) {
    logger.error('api_accounts_list_failed', { error: String(err) });
    return NextResponse.json({ ok: false, error: 'Failed to load accounts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiRes<Account>>> {
  try {
    const body   = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
    }
    const { color, ...rest } = parsed.data;
    const account = await createAccount({
      ...rest,
      color: color ?? ACCOUNT_COLORS[Math.floor(Math.random() * ACCOUNT_COLORS.length)],
    });
    return NextResponse.json({ ok: true, data: account }, { status: 201 });
  } catch (err) {
    logger.error('api_accounts_create_failed', { error: String(err) });
    return NextResponse.json({ ok: false, error: 'Failed to create account' }, { status: 500 });
  }
}
