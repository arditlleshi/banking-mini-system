# Banking Mini System

This repository contains two separate applications:

- `frontend`: Angular client app
- `backend`: Spring Boot API

## Project Structure

```text
banking-mini-system/
  frontend/
  backend/
```

## Prerequisites

- Node.js 20+
- Angular CLI (`ng`) available in terminal PATH
- Java 21 (Temurin/OpenJDK 21 LTS recommended)
- `JAVA_HOME` set to your JDK folder

## Run Backend

From the `backend` folder:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Or run it directly from the repository root:

```powershell
.\backend\mvnw.cmd -f .\backend\pom.xml spring-boot:run
```

If you see `JAVA_HOME environment variable is not defined correctly`, set it to your installed JDK 21 path:

```powershell
setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
```

Then close and reopen the terminal before starting the backend again.

## Run Backend (PostgreSQL)

From `backend`:

```powershell
Copy-Item .env.example .env
docker compose --env-file .env -f docker-compose.postgres.yaml up -d
.\mvnw.cmd spring-boot:run
```

When finished:

```powershell
docker compose --env-file .env -f docker-compose.postgres.yaml down
```

## Run Database Only (Docker Compose)

From `backend`:

```powershell
cd backend
Copy-Item .env.example .env
docker compose --env-file .env -f docker-compose.postgres.yaml up -d
```

Stop the database:

```powershell
docker compose --env-file .env -f docker-compose.postgres.yaml down
```

Stop and remove saved database data:

```powershell
docker compose --env-file .env -f docker-compose.postgres.yaml down -v
```

## Run Frontend

In a separate terminal, from the repository root:

```bash
cd frontend
bun install
bun run start
```

The frontend runs at `http://localhost:4200` by default.

## Notes

- Keep app-specific settings and scripts inside each app folder.
- Use this root README for shared setup and workflow instructions.
- Root `.gitignore` covers cross-project and generated files at the repository level.
