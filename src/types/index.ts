// src/types/index.ts

export type TransactionType = 'income' | 'expense' | 'transfer';

export type TransactionCategory =
  | 'housing' | 'food' | 'transport' | 'utilities' | 'health'
  | 'entertainment' | 'shopping' | 'savings' | 'salary' | 'investment'
  | 'freelance' | 'other';

export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;          // always positive; type determines direction
  description: string;
  date: string;            // ISO date string YYYY-MM-DD
  createdAt: string;       // ISO datetime
  updatedAt: string;
  tags?: string[];
  notes?: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'cash';
  balance: number;
  currency: string;
  color: string;           // hex colour for UI
  createdAt: string;
  updatedAt: string;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface MonthlyTotal {
  month: string;           // "YYYY-MM"
  income: number;
  expenses: number;
  net: number;
}

export interface CategoryBreakdown {
  category: TransactionCategory;
  amount: number;
  count: number;
  pct: number;             // 0–100
}

export interface DashboardSummary {
  totalBalance: number;
  monthIncome: number;
  monthExpenses: number;
  monthNet: number;
  recentTransactions: Transaction[];
  monthlyTrend: MonthlyTotal[];
  categoryBreakdown: CategoryBreakdown[];
  accounts: Account[];
}

// ── API envelopes ─────────────────────────────────────────────────────────────

export interface ApiOk<T>    { ok: true;  data: T }
export interface ApiErr      { ok: false; error: string; code?: string }
export type ApiRes<T> = ApiOk<T> | ApiErr;

// ── Event logging ─────────────────────────────────────────────────────────────

export type AppEventType =
  | 'transaction_created' | 'transaction_updated' | 'transaction_deleted'
  | 'account_created'     | 'account_updated'
  | 'app_start'           | 'error';
