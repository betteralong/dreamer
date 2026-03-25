# API AI boundary skeleton

## Purpose

Provide a runnable NestJS app in `apps/api` with health checks, an AI generation boundary module (placeholder-ready), and shared AI request/response types from `packages/shared` aligned with the frontend.

## Requirements

### Requirement: Backend MUST provide an initialized NestJS service skeleton
The backend application MUST be scaffolded as a runnable NestJS project in `apps/api` with standard bootstrap structure.

#### Scenario: Developer starts backend service
- **WHEN** the developer runs backend start command from the workspace
- **THEN** the NestJS application boots successfully and exposes a reachable HTTP server

### Requirement: Backend MUST expose a health-check endpoint
The backend MUST provide at least one health-check endpoint to validate service availability during local development.

#### Scenario: Client checks service status
- **WHEN** a client calls the documented health-check route
- **THEN** the backend returns a successful response indicating service readiness

### Requirement: Backend MUST define AI generation boundary module without provider implementation
The backend MUST include an AI-related module boundary (controller/service/DTO entry points) for future generation workflows while explicitly allowing placeholder behavior in MVP foundation phase.

#### Scenario: Client invokes AI boundary endpoint
- **WHEN** a client calls a documented AI generation boundary endpoint in foundation phase
- **THEN** the backend returns a placeholder or not-implemented response that conforms to shared response contract shape

### Requirement: Backend and frontend MUST share AI request/response contract definitions
The backend API boundary and frontend request layer MUST reference shared contract types from `packages/shared` for AI generation payloads and status objects.

#### Scenario: Contract update in shared package
- **WHEN** shared AI contract types are updated
- **THEN** both frontend and backend type checks surface compatibility issues during development workflow
