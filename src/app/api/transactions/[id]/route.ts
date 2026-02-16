// src/app/api/transactions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getTransaction, updateTransaction, deleteTransaction, updateAccountBalance,
} from '@/lib/aws/dynamo';
import { logger } from '@/lib/logger';
import type { ApiRes, Transaction } from '@/types';

export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  accountId:   z.string().uuid(),
  description: z.string().min(1).max(200).optional(),
  amount:      z.number().positive().optional(),
  category:    z.enum(['housing','food','transport','utilities','health',
                        'entertainment','shopping','savings','salary',
                        'investment','freelance','other']).optional(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes:       z.string().max(500).optional(),
});

type Ctx = { params: { id: string } };

export async function GET(
  req: NextRequest, { params }: Ctx
): Promise<NextResponse<ApiRes<Transaction>>> {
  const accountId = req.nextUrl.searchParams.get('accountId') ?? '';
  const tx = await getTransaction(params.id, accountId);
  if (!tx) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: tx });
}

export async function PATCH(
  req: NextRequest, { params }: Ctx
): Promise<NextResponse<ApiRes<Transaction>>> {
  try {
    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
    }
    const { accountId, ...patch } = parsed.data;
    const updated = await updateTransaction(params.id, accountId, patch);
    if (!updated) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    logger.error('api_tx_patch_failed', { error: String(err) });
    return NextResponse.json({ ok: false, error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest, { params }: Ctx
): Promise<NextResponse<ApiRes<{ id: string }>>> {
  try {
    const accountId = req.nextUrl.searchParams.get('accountId') ?? '';
    const tx = await getTransaction(params.id, accountId);
    if (!tx) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

    await deleteTransaction(params.id, accountId);

    // Reverse the balance effect
    const delta = tx.type === 'income' ? -tx.amount : tx.amount;
    await updateAccountBalance(accountId, delta);

    return NextResponse.json({ ok: true, data: { id: params.id } });
  } catch (err) {
    logger.error('api_tx_delete_failed', { error: String(err) });
    return NextResponse.json({ ok: false, error: 'Delete failed' }, { status: 500 });
  }
}
