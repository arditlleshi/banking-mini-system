# Home Page Charts Feasibility (Frontend + Backend Analysis)

## Goal

Define which charts can be added to the Home page right now using the current Angular + backend APIs, and which charts need backend additions first.

---

## Current System Reality

## Frontend (what is already implemented)

- Home page currently uses only `GET /api/test` (connectivity/sample modules), not real banking aggregates.
- Accounts page already consumes real account data from `GET /api/accounts` and computes:
  - total current balance
  - total available balance
  - active account count
- Account details page already consumes:
  - `GET /api/accounts/{accountNumber}/details`
  - `GET /api/accounts/{accountId}/transactions?fromDate&toDate`
- Payments page uses transfers and exchange rates:
  - `POST /api/transfers`
  - `GET /api/admin/exchange-rates`

## Backend (what data exists)

### Account-level data (available now)

From `GET /api/accounts`:

- `id`
- `type` (`CURRENT`, `SAVINGS`, `SAVINGS_PLAN`)
- `currency` (`EUR`, `USD`, `GBP`, `ALL`)
- `status` (`ACTIVE`, `BLOCKED`, `DORMANT`, `CLOSED`)
- `currentBalance`
- `availableBalance`
- `overdraftLimit`
- `annualInterestRate`
- `openedAt`, `closedAt`

### Transaction-level data (available now)

From `GET /api/accounts/{accountId}/transactions`:

- `direction` (`DEBIT` / `CREDIT`)
- `amount`
- `currency`
- `type`, `status`
- `bookingTimestamp`, `valueDate`
- `balanceAfter`
- `fxRate`, `fxReferenceAmount`, `fxReferenceCurrency`

### Exchange rates (available now, auth-dependent)

From `GET /api/admin/exchange-rates`:

- base/quote currencies
- buy/sell rates
- validFrom, updatedAt

Note:
- Endpoint is under `/api/admin/...` and may be role-restricted operationally.
- In current code, non-admin behavior has already been handled on the frontend with warning messages.

---

## Constraints That Matter for Chart Design

1. Multi-currency portfolio totals are not normalized by default.
   - Raw sums across mixed currencies can be misleading.
2. No dedicated dashboard aggregate endpoint exists.
   - Home must either derive aggregates client-side from `/api/accounts`, or call per-account transaction endpoints and aggregate client-side.
3. Fetching transaction history for all accounts is N+1 calls.
   - Fine for small account counts; can become expensive later.
4. No explicit transfer history endpoint by date range for all accounts.
   - Transfer analytics must be inferred from account transactions.

---

## Charts You Can Add Immediately (No Backend Changes)

## 1) Asset Distribution by Account Type (Doughnut)

**Data source:** `GET /api/accounts`  
**Metric:** sum of `currentBalance` (or `availableBalance`) per `type`  
**Value:** direct answer to "where assets are allocated"

Status: **Ready now**

---

## 2) Asset Distribution by Currency (Doughnut)

**Data source:** `GET /api/accounts`  
**Metric:** sum balance per `currency`  
**Value:** shows currency exposure

Status: **Ready now**

Important label:
- Mark this as "native currency view" (not FX-normalized).

---

## 3) Current vs Available Balance by Account (Horizontal Bar)

**Data source:** `GET /api/accounts`  
**Metric:** `currentBalance` and `availableBalance` side by side for each account  
**Value:** liquidity comparison and overdraft pressure visibility

Status: **Ready now**

---

## 4) Accounts by Status (Bar or Donut)

**Data source:** `GET /api/accounts`  
**Metric:** count by `status`  
**Value:** operational health signal (active vs blocked/dormant/closed)

Status: **Ready now**

---

## 5) Accounts Opened Over Time (Monthly Bar/Line)

**Data source:** `GET /api/accounts`  
**Metric:** count grouped by `openedAt` month  
**Value:** onboarding/account growth trend

Status: **Ready now**

---

## Charts Possible Now, But With Heavier Client Work

## 6) Inflow vs Outflow Trend by Month (Line/Stacked Bar)

**Data source:** `GET /api/accounts` + `GET /api/accounts/{id}/transactions` for each account  
**Metric:** monthly credits vs debits (group by `valueDate` or `bookingTimestamp`)  
**Value:** spending vs incoming trend

Status: **Possible now** (requires multiple API calls and client aggregation)

---

## 7) Net Movement Trend (Line)

**Data source:** same as above  
**Metric:** `credits - debits` per month  
**Value:** net cash trend

Status: **Possible now** (same N+1 cost)

---

## 8) Top Spending Counterparties (Horizontal Bar)

**Data source:** transaction endpoints  
**Metric:** total debit amount grouped by `counterpartyName` / `counterpartyAccount`  
**Value:** concentration of outgoing payments

Status: **Possible now** (data quality depends on counterparty completeness)

---

## Charts Not Reliable Yet (Recommend Backend Support First)

## 9) Portfolio Value Over Time (single normalized curve)

Why blocked:
- Mixed currencies require historical FX normalization at each timestamp.
- Current frontend would need complex reconstruction logic and historical FX joins.

Recommended backend support:
- endpoint returning daily normalized portfolio snapshots in a chosen base currency.

---

## 10) Transfer Funnel / Success Rate / Failure Rate

Why blocked:
- no direct "all transfers with statuses over time" aggregate endpoint.

Recommended backend support:
- transfer analytics endpoint (totals/counts by status and date buckets).

---

## Recommended Home Charts for Phase 1 (Best ROI)

Build these first:

1. Asset Distribution by Account Type
2. Asset Distribution by Currency (native values)
3. Current vs Available Balance by Account
4. Accounts by Status

Reason:
- single endpoint (`/api/accounts`)
- fast rendering
- no heavy data joins
- gives immediate business value

---

## Recommended Home Charts for Phase 2

Add with controlled scope:

1. Inflow vs Outflow monthly trend
2. Net movement monthly trend
3. Top spending counterparties

Conditions:
- fetch transactions lazily or behind a date filter
- add loading/empty/error states
- cap date range by default (example: last 90 days)

---

## Suggested Backend Additions (for a clean long-term dashboard)

Create a dedicated dashboard endpoint, for example:

- `GET /api/dashboard/overview?fromDate=&toDate=&baseCurrency=`

Return pre-aggregated payload:

- totals by account type
- totals by currency (native + normalized)
- monthly inflow/outflow/net
- account status distribution
- top counterparties

Benefit:
- removes N+1 calls from Home
- guarantees consistent numbers between frontend screens
- simplifies caching and performance tuning

---

## Practical Implementation Notes for `ng2-charts`

- Use Chart.js registration once (bootstrap/app config).
- Keep Home charts in small presentational components (one chart per card).
- Reuse existing surface tokens and card styles from Spartan/Tailwind classes.
- Always show:
  - loading state
  - empty state ("No data for selected range")
  - backend error state
- For multi-currency charts, make labels explicit:
  - "Native currency totals"
  - or "Converted to ALL/EUR at latest available rate"

---

## Final Recommendation

For the deep Home refactor, start with **Phase 1 charts from `/api/accounts` only** and wire transaction-based charts as Phase 2.

This gives you a stable, meaningful dashboard quickly, without backend churn, while keeping a clear path for deeper analytics.
