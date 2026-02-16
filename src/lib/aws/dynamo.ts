// src/lib/aws/dynamo.ts
//
// Single DynamoDB module for:
//   1. ft-transactions  — the main ledger
//   2. ft-accounts      — account definitions
//   3. ft-events        — async domain event log (fire-and-forget)
//
// All writes to ft-events are fire-and-forget; DynamoDB failure never
// surfaces to the user.

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
  UpdateCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';
import type { Transaction, Account, AppEventType } from '@/types';

const REGION = process.env.AWS_REGION ?? 'us-east-1';
const TBL_TX   = process.env.DYNAMODB_TABLE_TRANSACTIONS ?? 'ft-transactions';
const TBL_ACC  = process.env.DYNAMODB_TABLE_ACCOUNTS     ?? 'ft-accounts';
const TBL_EVT  = process.env.DYNAMODB_TABLE_EVENTS       ?? 'ft-events';
const EVT_TTL  = 90 * 24 * 60 * 60; // 90 days

let _doc: DynamoDBDocumentClient | null = null;
function db(): DynamoDBDocumentClient {
  if (!_doc) {
    _doc = DynamoDBDocumentClient.from(
      new DynamoDBClient({ region: REGION }),
      { marshallOptions: { removeUndefinedValues: true } }
    );
  }
  return _doc;
}

// ── Event log ─────────────────────────────────────────────────────────────────

export function logDomainEvent(
  type: AppEventType,
  meta?: Record<string, unknown>
): void {
  db().send(new PutCommand({
    TableName: TBL_EVT,
    Item: {
      PK: `event#${type}`,
      SK: `ts#${new Date().toISOString()}`,
      id: randomUUID(),
      type,
      ttl: Math.floor(Date.now() / 1000) + EVT_TTL,
      ...meta,
    },
  })).catch(err => logger.error('dynamo_event_write_failed', { type, err: String(err) }));
}

// ── Transactions ──────────────────────────────────────────────────────────────

export async function createTransaction(
  tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Transaction> {
  const now = new Date().toISOString();
  const item: Transaction = {
    ...tx,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await db().send(new PutCommand({
    TableName: TBL_TX,
    Item: { PK: `account#${item.accountId}`, SK: `tx#${item.id}`, ...item },
  }));
  logDomainEvent('transaction_created', { txId: item.id, amount: item.amount, type: item.type });
  logger.info('transaction_created', { id: item.id, amount: item.amount });
  return item;
}

export async function getTransaction(id: string, accountId: string): Promise<Transaction | null> {
  const res = await db().send(new GetCommand({
    TableName: TBL_TX,
    Key: { PK: `account#${accountId}`, SK: `tx#${id}` },
  }));
  return (res.Item as Transaction) ?? null;
}

export async function listTransactions(
  accountId?: string,
  limit = 100
): Promise<Transaction[]> {
  if (accountId) {
    const res = await db().send(new QueryCommand({
      TableName: TBL_TX,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `account#${accountId}`, ':sk': 'tx#' },
      ScanIndexForward: false,
      Limit: limit,
    }));
    return (res.Items ?? []) as Transaction[];
  }
  // Scan all (small dataset assumption for personal finance tracker)
  const res = await db().send(new ScanCommand({
    TableName: TBL_TX,
    FilterExpression: 'begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':sk': 'tx#' },
    Limit: limit,
  }));
  const items = (res.Items ?? []) as Transaction[];
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

export async function updateTransaction(
  id: string,
  accountId: string,
  patch: Partial<Omit<Transaction, 'id' | 'accountId' | 'createdAt'>>
): Promise<Transaction | null> {
  const now = new Date().toISOString();
  const sets: string[] = ['updatedAt = :ua'];
  const vals: Record<string, unknown> = { ':ua': now };

  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) {
      sets.push(`#${k} = :${k}`);
      vals[`:${k}`] = v;
    }
  }

  const names = Object.fromEntries(
    Object.keys(patch)
      .filter(k => patch[k as keyof typeof patch] !== undefined)
      .map(k => [`#${k}`, k])
  );

  const res = await db().send(new UpdateCommand({
    TableName: TBL_TX,
    Key: { PK: `account#${accountId}`, SK: `tx#${id}` },
    UpdateExpression: `SET ${sets.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: vals,
    ReturnValues: 'ALL_NEW',
  }));

  logDomainEvent('transaction_updated', { txId: id });
  return (res.Attributes as Transaction) ?? null;
}

export async function deleteTransaction(id: string, accountId: string): Promise<void> {
  await db().send(new DeleteCommand({
    TableName: TBL_TX,
    Key: { PK: `account#${accountId}`, SK: `tx#${id}` },
  }));
  logDomainEvent('transaction_deleted', { txId: id });
  logger.info('transaction_deleted', { id });
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export async function createAccount(
  acc: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Account> {
  const now = new Date().toISOString();
  const item: Account = { ...acc, id: randomUUID(), createdAt: now, updatedAt: now };
  await db().send(new PutCommand({
    TableName: TBL_ACC,
    Item: { PK: `account#${item.id}`, SK: 'meta', ...item },
  }));
  logDomainEvent('account_created', { accountId: item.id });
  logger.info('account_created', { id: item.id, name: item.name });
  return item;
}

export async function listAccounts(): Promise<Account[]> {
  const res = await db().send(new ScanCommand({
    TableName: TBL_ACC,
    FilterExpression: 'SK = :sk',
    ExpressionAttributeValues: { ':sk': 'meta' },
  }));
  return (res.Items ?? []) as Account[];
}

export async function getAccount(id: string): Promise<Account | null> {
  const res = await db().send(new GetCommand({
    TableName: TBL_ACC,
    Key: { PK: `account#${id}`, SK: 'meta' },
  }));
  return (res.Item as Account) ?? null;
}

export async function updateAccountBalance(
  id: string,
  delta: number
): Promise<void> {
  await db().send(new UpdateCommand({
    TableName: TBL_ACC,
    Key: { PK: `account#${id}`, SK: 'meta' },
    UpdateExpression: 'SET balance = balance + :d, updatedAt = :ua',
    ExpressionAttributeValues: { ':d': delta, ':ua': new Date().toISOString() },
  }));
}
