# FinTrack — Financial Tracker

> Migrated from a 6-line Express "Hello World" to a production-grade Next.js application on AWS EC2 with DynamoDB, CloudWatch, and a least-privilege IAM role.

---

## What changed from your original `app.js`

| Before | After |
|---|---|
| `var express = require('express')` | Next.js 14 App Router (no Express needed) |
| `res.send('Hello World!')` | SSR pages, REST API routes, interactive React UI |
| No data storage | DynamoDB — transactions + accounts + event log |
| No logging | Winston → CloudWatch Logs (structured JSON) |
| No auth/secrets | IAM role + SSM Parameter Store (no hard-coded keys) |
| No monitoring | CloudWatch alarms, health endpoint, domain event log |
| 6 lines of code | Full-stack application with resilient AWS architecture |

Your original `app.js` → `GET /` → "Hello World!" is now:
- `GET /` → redirects to `/dashboard`
- `GET /dashboard` → SSR financial summary with Recharts
- `GET /transactions` → paginated transaction ledger + add form
- `GET /accounts` → account list + balance tracking
- `GET /api/transactions` → REST endpoint (Zod-validated)
- `GET /api/accounts` → REST endpoint
- `GET /api/analytics` → derived metrics
- `GET /api/health` → DynamoDB connectivity + uptime

---

## Project Structure

```
financial-tracker/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # / → redirect to /dashboard
│   │   ├── layout.tsx                  # Root layout with sidebar nav
│   │   ├── globals.css                 # Dark luxury design system
│   │   ├── dashboard/page.tsx          # SSR dashboard (stats + charts)
│   │   ├── transactions/page.tsx       # SSR transaction list + add form
│   │   ├── accounts/page.tsx           # SSR account management
│   │   └── api/
│   │       ├── transactions/route.ts   # GET list, POST create
│   │       ├── transactions/[id]/route.ts  # GET, PATCH, DELETE
│   │       ├── accounts/route.ts       # GET list, POST create
│   │       ├── analytics/route.ts      # GET dashboard summary
│   │       └── health/route.ts         # GET health check
│   ├── components/
│   │   ├── charts/DashboardCharts.tsx  # Client: Recharts (hydrated)
│   │   ├── forms/AddTransactionPanel.tsx  # Client: POST form
│   │   ├── forms/AddAccountPanel.tsx      # Client: POST form
│   │   └── ui/
│   │       ├── SideNav.tsx             # Persistent sidebar navigation
│   │       └── TransactionRow.tsx      # Transaction list item
│   ├── lib/
│   │   ├── aws/dynamo.ts               # DynamoDB CRUD + event log
│   │   ├── analytics.ts                # Pure computation (no DB calls)
│   │   └── logger.ts                   # Winston + CloudWatch transport
│   └── types/index.ts                  # All shared TypeScript types
├── infrastructure/
│   ├── iam/ec2-role-policy.json        # Least-privilege IAM policy
│   └── cloudwatch/alarms.yaml          # CloudFormation alarm stack
├── scripts/
│   ├── create-tables.sh                # One-time DynamoDB setup
│   └── bootstrap-ec2.sh               # EC2 user-data install script
└── .env.example                        # Non-secret config template
```

---

## Architecture

```
Browser
  │
  ▼
EC2 (port 3000, PM2 cluster mode)
  │
  ├── Next.js SSR pages
  │   ├── /dashboard      — renders stats server-side, hydrates charts client-side
  │   ├── /transactions   — renders list server-side, form is interactive client-side
  │   └── /accounts       — same SSR + client pattern
  │
  └── Next.js API routes (server-only — IAM role handles AWS auth)
      ├── /api/transactions  ─────────────────────┐
      ├── /api/accounts      ──── DynamoDB ────────┤  ft-transactions
      └── /api/analytics                            │  ft-accounts
                                                   └  ft-events (event log, 90d TTL)
                                                      ↓
                                                   CloudWatch Logs
                                                   /financial-tracker/app
```

### Key design decisions

**No secrets in code** — The EC2 instance's IAM role is the only credential. The AWS SDK picks it up automatically from the EC2 metadata endpoint. You never set `AWS_ACCESS_KEY_ID` on the server.

**SSR + selective hydration** — Pages are rendered server-side (fast first paint, works without JS). Only interactive parts (charts, forms) hydrate on the client.

**Fire-and-forget event log** — Every mutation (transaction created/deleted, account created) is logged asynchronously to `ft-events` in DynamoDB. A DynamoDB write failure for the event log never surfaces to the user.

**DynamoDB single-table design** — Both tables use `PK` (partition key) + `SK` (sort key) entity pattern:
- `ft-transactions`: `PK = account#<accountId>` / `SK = tx#<txId>`
- `ft-accounts`: `PK = account#<accountId>` / `SK = meta`
- `ft-events`: `PK = event#<type>` / `SK = ts#<ISO>`, TTL = 90 days

---

## Setup Guide

### Step 1 — Create DynamoDB tables (run once)
```bash
AWS_REGION=us-east-1 bash scripts/create-tables.sh
```

### Step 2 — Create IAM role and attach policy
1. Go to IAM → Roles → Create Role → "EC2"
2. Create an inline policy, paste `infrastructure/iam/ec2-role-policy.json`
3. Replace `REGION` and `ACCOUNT_ID` with your values
4. Attach the role to your EC2 instance

### Step 3 — Launch EC2
- Amazon Linux 2023 or Ubuntu 22.04 LTS
- Attach the IAM role created in Step 2
- Open port 3000 in security group (or 80 behind a load balancer)
- Paste `scripts/bootstrap-ec2.sh` as **User Data**, or run manually

### Step 4 — Local development
```bash
cp .env.example .env.local
# Set AWS_REGION and ensure ~/.aws/credentials has a profile with DynamoDB access
npm install
npm run dev        # http://localhost:3000
```

---

## API Reference

### Transactions

| Method | Path | Body / Params |
|---|---|---|
| `GET` | `/api/transactions` | `?accountId=&limit=100` |
| `POST` | `/api/transactions` | `{ accountId, type, category, amount, description, date }` |
| `GET` | `/api/transactions/:id` | `?accountId=` |
| `PATCH` | `/api/transactions/:id` | `{ accountId, description?, amount?, category?, date? }` |
| `DELETE` | `/api/transactions/:id` | `?accountId=` |

### Accounts

| Method | Path | Body |
|---|---|---|
| `GET` | `/api/accounts` | — |
| `POST` | `/api/accounts` | `{ name, type, balance?, currency?, color? }` |

### Analytics
```
GET /api/analytics
```
Returns full `DashboardSummary`: balances, monthly trend (6 months), category breakdown, recent transactions.

### Health
```
GET /api/health
→ 200 { status: "ok", uptime: 3600, services: { dynamodb: "ok" } }
→ 503 { status: "degraded", services: { dynamodb: "error" } }
```

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `AWS_REGION` | AWS region | Yes |
| `DYNAMODB_TABLE_TRANSACTIONS` | Transactions table (default: `ft-transactions`) | No |
| `DYNAMODB_TABLE_ACCOUNTS` | Accounts table (default: `ft-accounts`) | No |
| `DYNAMODB_TABLE_EVENTS` | Events table (default: `ft-events`) | No |
| `CLOUDWATCH_LOG_GROUP` | CW log group (default: `/financial-tracker/app`) | No |
| `NEXT_PUBLIC_CURRENCY` | Display currency (default: `USD`) | No |

> ⚠️ Do **not** set `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` on EC2. The IAM role provides credentials automatically.

---

## Transaction Categories

`housing` · `food` · `transport` · `utilities` · `health` · `entertainment` · `shopping` · `savings` · `salary` · `investment` · `freelance` · `other`

## Account Types

`checking` · `savings` · `credit` · `investment` · `cash`
