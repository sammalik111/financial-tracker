// src/app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createTransaction, listTransactions, updateAccountBalance } from '@/lib/aws/dynamo';
import { logger } from '@/lib/logger';
import type { ApiRes, Transaction } from '@/types';

export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
  accountId:   z.string().uuid(),
  type:        z.enum(['income', 'expense', 'transfer']),
  category:    z.enum(['housing','food','transport','utilities','health',
                        'entertainment','shopping','savings','salary',
                        'investment','freelance','other']),
  amount:      z.number().positive(),
  description: z.string().min(1).max(200),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes:       z.string().max(500).optional(),
  tags:        z.array(z.string()).optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse<ApiRes<Transaction[]>>> {
  try {
    const accountId = req.nextUrl.searchParams.get('accountId') ?? undefined;
    const limit     = parseInt(req.nextUrl.searchParams.get('limit') ?? '100');
    const txs       = await listTransactions(accountId, limit);
    return NextResponse.json({ ok: true, data: txs });
  } catch (err) {
    logger.error('api_tx_list_failed', { error: String(err) });
    return NextResponse.json({ ok: false, error: 'Failed to load transactions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiRes<Transaction>>> {
  try {
    const body   = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.message, code: 'VALIDATION' }, { status: 400 });
    }

    const tx = await createTransaction(parsed.data);

    // Update account balance atomically
    const delta = tx.type === 'income' ? tx.amount : -tx.amount;
    await updateAccountBalance(tx.accountId, delta);

    return NextResponse.json({ ok: true, data: tx }, { status: 201 });
  } catch (err) {
    logger.error('api_tx_create_failed', { error: String(err) });
    return NextResponse.json({ ok: false, error: 'Failed to create transaction' }, { status: 500 });
  }
}
