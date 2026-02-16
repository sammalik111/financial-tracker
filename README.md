# JobSignal — Job Market Intelligence

> See which fields are underrepresented, where competition is lowest, and where you have the best shot — for the entire job market, not just individual listings.

---

## What it does

**Dashboard** — Market-wide overview across 15 fields: total openings, average applicants per role, competition rankings, fastest growing fields, and your top 10 opportunities sorted by opportunity score.

**Explore** — Full sortable table of all fields showing openings, applicants/role, competition level, degree requirements, salary, remote ratio, and opportunity score. Click any row to drill in.

**Field Detail** — The LinkedIn-style deep dive:
- Applicants today vs. total (per field)
- Degree breakdown: what % of postings require bachelor's vs master's vs no degree
- Daily applicant volume chart (7-day trend)
- Salary range with average
- Entry-level % — how accessible the field is to career changers
- Competition score vs opportunity score

---

## Architecture

```
Browser
  │
  ▼
EC2 :3000 (Next.js, systemd-managed)
  │
  ├── /dashboard    — SSR market overview + Recharts (hydrated client-side)
  ├── /explore      — SSR field comparison table
  ├── /field?name=  — SSR field detail with degree breakdown
  │
  └── API Routes (server-only)
      ├── /api/intelligence  — full market overview JSON
      ├── /api/search        — job search with inline field intelligence
      └── /api/health        — liveness check
          │
          ├── Adzuna API  ──── circuit breaker + retry + timeout
          │
          └── DynamoDB
              ├── jmi-cache   (10-min TTL, avoids hammering Adzuna)
              └── jmi-events  (90-day TTL event log)
                  ↓
              CloudWatch Logs /jobsignal/app
```

---

## Setup

### 1. Get a free Adzuna API key
Sign up at https://developer.adzuna.com — free tier gives 250 requests/day, enough for development.

### 2. Create DynamoDB tables
```bash
AWS_REGION=us-east-1 bash scripts/create-tables.sh
```

### 3. Deploy to EC2
- Launch Ubuntu 22.04 EC2 instance
- Attach your `AdminSDK` IAM role (handles AWS auth automatically)
- Paste `scripts/bootstrap-ec2.sh` as User Data
- Open port 80 in security group (Caddy proxies to :3000)

### 4. Add Adzuna credentials (after first boot)
SSH in and add to the env file:
```bash
sudo bash -c 'echo "ADZUNA_APP_ID=your_id" >> /etc/jobsignal.env'
sudo bash -c 'echo "ADZUNA_API_KEY=your_key" >> /etc/jobsignal.env'
sudo systemctl restart jobsignal
```

### 5. Local development
```bash
cp .env.example .env.local
# Fill in ADZUNA_APP_ID and ADZUNA_API_KEY
npm install
npm run dev  # http://localhost:3000
```

---

## Intelligence model

**Competition Score (0–100)** — Based on estimated applicants per opening. Lower = less competition = better for you.

**Opportunity Score (0–100)** — Weighted composite:
- 40% low competition
- 30% salary potential
- 20% entry-level accessibility
- 10% remote availability

**Degree Breakdown** — Inferred from job description text. Shows what % of postings in a field actually require a PhD, Master's, Bachelor's, or no degree — so you can see if you're over-qualified or under-qualified before applying.

**Applicant Counts** — Modelled from field-level baselines calibrated to realistic LinkedIn-observed ranges. Adzuna's free API doesn't expose exact applicant counts, so we derive realistic estimates that accurately reflect relative competition across fields.

---

## File Structure

```
src/
├── app/
│   ├── dashboard/page.tsx      # Market overview (SSR)
│   ├── explore/page.tsx        # All-fields table (SSR)
│   ├── field/page.tsx          # Field deep-dive (SSR)
│   └── api/
│       ├── intelligence/       # Full market overview
│       ├── search/             # Job search endpoint
│       └── health/             # Liveness
├── components/
│   ├── charts/
│   │   ├── MarketCharts.tsx    # Scatter + bar (client)
│   │   └── FieldCharts.tsx     # Pie + trend + salary (client)
│   └── ui/TopNav.tsx
├── lib/
│   ├── intelligence.ts         # Core analysis engine (pure, no AWS)
│   ├── search.ts               # Orchestrator with caching
│   ├── upstream/adzuna.ts      # Adzuna API client
│   ├── aws/dynamo.ts           # Cache + event log
│   └── logger.ts               # Winston + CloudWatch
└── types/index.ts
```
