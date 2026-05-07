# Banking Mini System

This repository contains two separate applications:

- `frontend`: Angular client app
- `backend/banking-api`: Spring Boot API

## Project Structure

```text
banking-mini-system/
  frontend/
  backend/
    banking-api/
```

## Prerequisites

- Node.js 20+
- Angular CLI (`ng`) available in terminal PATH
- Java 17+
- Maven (or use the included Maven wrapper)

## Run Backend

From the repository root:

```bash
cd backend/banking-api
.\mvnw.cmd spring-boot:run
```

On Windows PowerShell:

```powershell
cd backend/banking-api
.\mvnw.cmd spring-boot:run
```

## Run Frontend

In a separate terminal, from the repository root:

```bash
cd frontend
npm install
ng serve
```

The frontend runs at `http://localhost:4200` by default.

## Notes

- Keep app-specific settings and scripts inside each app folder.
- Use this root README for shared setup and workflow instructions.
- Root `.gitignore` covers cross-project and generated files at the repository level.

