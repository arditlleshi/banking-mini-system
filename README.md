# Banking Mini System

![Angular](https://img.shields.io/badge/Angular-21-dd0031?logo=angular&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.0-6db33f?logo=springboot&logoColor=white)
![Java](https://img.shields.io/badge/Java-21-007396?logo=openjdk&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?logo=postgresql&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-1.3-000000?logo=bun&logoColor=white)

A full-stack banking workspace that models core retail banking flows: secure sign-in, customer account management, internal transfers, beneficiary payments, currency-aware reporting, and PDF document generation.

This project is built as a portfolio-grade banking simulation. It focuses on clean product flows, realistic backend boundaries, database migrations, API security, and a polished Angular user experience.

## What This Project Shows

- End-to-end full-stack delivery with an Angular client and a Spring Boot API.
- Practical banking domain modeling: users, accounts, balances, transactions, exchange rates, payment details, and statements.
- Secure session handling with access tokens and HttpOnly refresh-token cookies.
- Real database workflow using PostgreSQL, Flyway migrations, and Docker Compose.
- User-facing financial workflows with validation, confirmation steps, error states, and PDF downloads.
- Automated backend and frontend tests covering authentication, accounts, payments, statements, and UI behavior.

## Product Features

### Banking Workspace

- Dashboard with net worth, monthly income, monthly expenses, account currency distribution, and cash-flow charts.
- Account inventory with account creation, balances, status, account numbers, IBAN-style identifiers, and account detail pages.
- Account transaction history with statement-style filters, totals, pagination, and direction-aware movement display.
- PDF generation for account statements and payment details.

### Payments and Transfers

- Own-account transfers with source and destination account validation.
- Beneficiary payments to another customer account.
- Beneficiary lookup before payment booking.
- Review-before-submit confirmation flow.
- Exchange-rate preview for cross-currency movement.
- Insufficient-funds and validation feedback before submission.

### Platform and Security

- Login, registration, refresh token, and logout flows.
- Role-aware backend foundation with seeded admin user support.
- Protected API routes and Angular route guards.
- OpenAPI documentation through Swagger UI.
- Environment-driven configuration for database, JWT, account numbering, statements, and dashboard reporting.

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | Angular 21, TypeScript, Angular Router, Angular Forms |
| UI | Tailwind CSS 4, Spartan UI primitives, ng-icons, Chart.js |
| Runtime | Bun |
| Backend | Java 21, Spring Boot 4, Spring Security, Spring Data JPA |
| Database | PostgreSQL, Flyway migrations |
| API Docs | springdoc OpenAPI, Swagger UI |
| Documents | Apache PDFBox |
| Testing | Vitest, Angular testing utilities, JUnit, Spring Boot tests, H2 test database |

## Repository Structure

```text
banking-mini-system/
  backend/    Spring Boot API, persistence, security, migrations, PDF generation
  frontend/   Angular client, authenticated workspace, UI components, tests
```

## Getting Started

### Prerequisites

- Java 21
- Docker and Docker Compose
- Bun 1.3+
- Node.js 20+ if your Angular tooling requires it locally

### 1. Start PostgreSQL

From the repository root:

```powershell
cd backend
Copy-Item .env.example .env
docker compose --env-file .env -f docker-compose.postgres.yaml up -d
```

The default local database values are defined in `backend/.env.example`.

### 2. Start the Backend API

From `backend`:

```powershell
.\mvnw.cmd spring-boot:run
```

The API runs on `http://localhost:8080`.

Swagger UI is available at:

```text
http://localhost:8080/swagger-ui.html
```

### 3. Start the Frontend

Open a second terminal from the repository root:

```powershell
cd frontend
bun install
bun run start
```

The app runs on:

```text
http://localhost:4200
```

The Angular dev server proxies `/api` requests to the backend at `http://localhost:8080`.

### Local Demo Login

After the backend migrations run, the local database includes a seeded admin user:

```text
Username: admin
Password: 123456
```

For anything beyond local development, replace the default `JWT_SECRET` in `backend/.env`.

## Testing

Run backend tests:

```powershell
cd backend
.\mvnw.cmd test
```

Run frontend tests:

```powershell
cd frontend
bun run test
```

Create a production frontend build:

```powershell
cd frontend
bun run build
```

## API Overview

Key backend areas include:

| Area | Example Routes |
| --- | --- |
| Authentication | `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout` |
| Current user | `GET /api/users/me` |
| Accounts | `GET /api/accounts`, `POST /api/accounts`, `GET /api/accounts/{accountNumber}/details` |
| Transactions | `GET /api/accounts/{accountId}/transactions` |
| Statements | `GET /api/accounts/{accountId}/statement` |
| Payment details | `GET /api/accounts/{accountId}/payment-details` |
| Transfers | `POST /api/transfers` |
| Payments | `POST /api/payments`, `GET /api/payments/beneficiary/{accountNumber}` |
| Dashboard | `GET /api/dashboard/summary`, `GET /api/dashboard/monthly-cash-flow` |
| Admin | `POST /api/admin/users`, `GET /api/admin/exchange-rates` |

## Design Decisions

- Feature-first backend packages keep business areas such as accounts, transactions, dashboard, exchange rates, and security easy to navigate.
- Flyway owns schema changes so the database can be recreated consistently from source.
- The frontend uses protected routes, API services, and focused feature pages to keep product flows separated.
- PDF generation lives in backend services so statements and payment details are generated from trusted server-side data.
- The dashboard excludes internal transfers from income and expense reporting, giving a cleaner view of external cash flow.

## Development Notes

- Keep secrets out of source control. Use `backend/.env` for local values.
- Stop the local database with:

```powershell
cd backend
docker compose --env-file .env -f docker-compose.postgres.yaml down
```

- Remove saved local database data with:

```powershell
cd backend
docker compose --env-file .env -f docker-compose.postgres.yaml down -v
```

## Project Status

This is an active portfolio project. The current version demonstrates a working full-stack banking simulation with authentication, account workflows, payment flows, financial dashboards, PDF generation, database migrations, and automated tests.
