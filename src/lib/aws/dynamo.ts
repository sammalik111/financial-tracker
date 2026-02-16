// src/lib/aws/dynamo.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '@/lib/logger';

const REGION = process.env.AWS_REGION ?? 'us-east-1';
const TBL_CACHE  = process.env.DYNAMODB_TABLE_CACHE  ?? 'jmi-cache';
const TBL_EVENTS = process.env.DYNAMODB_TABLE_EVENTS ?? 'jmi-events';
const CACHE_TTL  = parseInt(process.env.CACHE_TTL_SECONDS ?? '600');
const EVENT_TTL  = 90 * 24 * 60 * 60;

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

// ── Cache ─────────────────────────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const res = await db().send(new GetCommand({ TableName: TBL_CACHE, Key: { cacheKey: key } }));
    if (!res.Item) return null;
    if (res.Item.ttl < Math.floor(Date.now() / 1000)) return null;
    return res.Item.value as T;
  } catch (err) {
    logger.warn('cache_get_failed', { key, err: String(err) });
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttl = CACHE_TTL): Promise<void> {
  try {
    await db().send(new PutCommand({
      TableName: TBL_CACHE,
      Item: { cacheKey: key, value, ttl: Math.floor(Date.now() / 1000) + ttl, cachedAt: new Date().toISOString() },
    }));
  } catch (err) {
    logger.warn('cache_set_failed', { key, err: String(err) });
  }
}

// ── Event log (fire-and-forget) ───────────────────────────────────────────────

export function logEvent(type: string, meta?: Record<string, unknown>): void {
  const { randomUUID } = require('crypto');
  db().send(new PutCommand({
    TableName: TBL_EVENTS,
    Item: {
      PK: `event#${type}`, SK: `ts#${new Date().toISOString()}`,
      id: randomUUID(), type,
      ttl: Math.floor(Date.now() / 1000) + EVENT_TTL,
      ...meta,
    },
  })).catch(err => logger.error('event_log_failed', { type, err: String(err) }));
}
