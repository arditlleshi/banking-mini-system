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

