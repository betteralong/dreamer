## MODIFIED Requirements

### Requirement: Backend and frontend MUST share AI request/response contract definitions
The backend API boundary and frontend request layer MUST reference shared contract types from `packages/shared` for AI generation payloads and status objects. The shared contract MUST allow frontend callers to submit prompt-compatible text while preserving compatibility with future structured chat payload evolution.

#### Scenario: Frontend submits prompt-compatible request to current backend boundary
- **WHEN** the frontend sends a request generated from structured chat input to the existing AI boundary endpoint
- **THEN** the request MUST remain valid for the current prompt-based backend contract without requiring backend-side structural parsing support

#### Scenario: Shared contract evolves toward structured chat payloads
- **WHEN** shared AI contract types introduce optional structured chat fields
- **THEN** frontend and backend type checks MUST continue to enforce compatibility while allowing current prompt-based behavior to remain functional
