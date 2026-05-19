# Backend Structure Guide

This backend uses a **feature-first** package layout with shared cross-cutting packages.

## Main Principles

- Group code by business area (`customer`, `account`, `transaction`) instead of technical layer only.
- Keep shared concerns in `common`.
- Keep controllers thin, services responsible for business rules, and repositories focused on persistence.
- Keep DTOs separate from JPA entities.

## Package Layout

```text
com.ardit.banking
  BankingApiApplication.java
  common
    config
    exception
    util
  customer
    controller
    service
    repository
    domain
    dto
  account
    controller
    service
    repository
    domain
    dto
  transaction
    controller
    service
    repository
    domain
    dto
```

## Resource Layout

```text
src/main/resources
  application.yaml
  db/migration
    V1__baseline.sql
```

## Local PostgreSQL Setup

This project supports running with a real local PostgreSQL database.

1. Copy environment template:

```powershell
Copy-Item .env.example .env
```

2. Start PostgreSQL with Docker:

```powershell
docker compose --env-file .env -f docker-compose.postgres.yaml up -d
```

3. Run backend:

```powershell
.\mvnw.cmd spring-boot:run
```

4. Stop database when done:

```powershell
docker compose --env-file .env -f docker-compose.postgres.yaml down
```

Notes:
- Database data is persisted in Docker volume `banking_postgres_data`.
- You can change credentials and DB name in `.env`.
- Set `JWT_SECRET` in `.env` to a long random string before non-local usage.

## Authentication

- `POST /api/auth/login` accepts `username` and `password`, returns `accessToken`, and sets refresh token in an HttpOnly cookie.
- `POST /api/auth/refresh` uses refresh cookie and returns a new `accessToken`.
- `POST /api/auth/logout` revokes refresh cookie/token and clears cookie.
- Access token must be sent in `Authorization: Bearer <token>`.
- Refresh token is **not** exposed to frontend JavaScript.
- `GET /api/test` is public.
- `GET /api/secure/me` requires a valid access token.

## Placement Rules

- Controller classes: `*.controller`
- Business logic classes: `*.service`
- Database interfaces: `*.repository`
- JPA entities/value objects: `*.domain`
- Request/response models: `*.dto`
- Global app configuration and shared utilities: `*.common.*`

## Next Recommended Additions

- `common/exception/GlobalExceptionHandler`
- `common/exception/ApiError`
- feature services and controllers for each business area
- profile-specific configs (`application-local.yaml`, `application-dev.yaml`)
