// src/lib/analytics.ts
//
// Pure computation layer — derives all dashboard metrics from raw transactions.
// No DynamoDB calls here; keeps analytics testable and framework-independent.

import {
  startOfMonth, endOfMonth, subMonths, format, parseISO, isWithinInterval,
} from 'date-fns';
import type {
  Transaction, Account, MonthlyTotal, CategoryBreakdown,
  DashboardSummary, TransactionType,
} from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

export function signedAmount(tx: Transaction): number {
  return tx.type === 'income' ? tx.amount : -tx.amount;
}

function txInMonth(tx: Transaction, year: number, month: number): boolean {
  const d = parseISO(tx.date);
  return d.getFullYear() === year && d.getMonth() === month;
}

// ── Monthly trend (last N months) ─────────────────────────────────────────────

export function buildMonthlyTrend(
  transactions: Transaction[],
  months = 6
): MonthlyTotal[] {
  const result: MonthlyTotal[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const ref    = subMonths(now, i);
    const yr     = ref.getFullYear();
    const mo     = ref.getMonth();
    const label  = format(ref, 'yyyy-MM');

    const relevant = transactions.filter(tx => txInMonth(tx, yr, mo));

    const income   = relevant.filter(t => t.type === 'income')
                              .reduce((s, t) => s + t.amount, 0);
    const expenses = relevant.filter(t => t.type === 'expense')
                              .reduce((s, t) => s + t.amount, 0);

    result.push({ month: label, income, expenses, net: income - expenses });
  }

  return result;
}

// ── Category breakdown (this month's expenses) ───────────────────────────────

export function buildCategoryBreakdown(
  transactions: Transaction[]
): CategoryBreakdown[] {
  const now    = new Date();
  const start  = startOfMonth(now);
  const end    = endOfMonth(now);

  const expenses = transactions.filter(
    tx => tx.type === 'expense' &&
          isWithinInterval(parseISO(tx.date), { start, end })
  );

  const totalSpent = expenses.reduce((s, t) => s + t.amount, 0);

  const map = new Map<string, { amount: number; count: number }>();
  for (const tx of expenses) {
    const cur = map.get(tx.category) ?? { amount: 0, count: 0 };
    map.set(tx.category, { amount: cur.amount + tx.amount, count: cur.count + 1 });
  }

  return Array.from(map.entries())
    .map(([category, { amount, count }]) => ({
      category: category as Transaction['category'],
      amount,
      count,
      pct: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

// ── This-month income / expense totals ────────────────────────────────────────

export function buildMonthSummary(transactions: Transaction[]): {
  income: number; expenses: number; net: number;
} {
  const now   = new Date();
  const start = startOfMonth(now);
  const end   = endOfMonth(now);

  const thisMonth = transactions.filter(
    tx => isWithinInterval(parseISO(tx.date), { start, end })
  );

  const income   = thisMonth.filter(t => t.type === 'income')
                             .reduce((s, t) => s + t.amount, 0);
  const expenses = thisMonth.filter(t => t.type === 'expense')
                             .reduce((s, t) => s + t.amount, 0);

  return { income, expenses, net: income - expenses };
}

// ── Full dashboard summary ────────────────────────────────────────────────────

export function buildDashboardSummary(
  transactions: Transaction[],
  accounts: Account[]
): DashboardSummary {
  const totalBalance     = accounts.reduce((s, a) => s + a.balance, 0);
  const { income, expenses, net } = buildMonthSummary(transactions);

  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  return {
    totalBalance,
    monthIncome:   income,
    monthExpenses: expenses,
    monthNet:      net,
    recentTransactions,
    monthlyTrend:       buildMonthlyTrend(transactions, 6),
    categoryBreakdown:  buildCategoryBreakdown(transactions),
    accounts,
  };
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function formatCurrency(
  amount: number,
  currency = process.env.NEXT_PUBLIC_CURRENCY ?? 'USD'
): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}
