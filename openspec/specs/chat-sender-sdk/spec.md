# Chat sender SDK

## Purpose

Provide a reusable workspace package for chat sender UI with imperative editor control and submit payloads that combine structured `Part[]` with prompt-compatible text for existing pipelines.

## Requirements

### Requirement: SDK MUST provide a reusable chat sender component package
The system SHALL provide a workspace package for chat sender capabilities that can be installed and consumed by other modules without importing `apps/web` private implementation details.

#### Scenario: Consumer imports SDK component
- **WHEN** a frontend module declares a dependency on the chat sender SDK package
- **THEN** it MUST be able to import and mount the chat sender component without referencing `apps/web/src/components/AiChatBox.vue`

### Requirement: SDK MUST expose imperative control APIs
The SDK component SHALL expose imperative APIs for host applications to control the input state, including at least `focus`, `blur`, `setParts`, `getParts`, `insertText`, `insertPart`, and `clear`.

#### Scenario: Host programmatically controls editor
- **WHEN** the host calls an exposed imperative API on the mounted SDK instance
- **THEN** the SDK MUST apply the corresponding editor state change and keep `Part[]` state synchronized

### Requirement: SDK MUST emit submit payload with structured and text-compatible forms
The SDK SHALL emit submit events that include structured `Part[]` content and a deterministic text-compatible representation for existing prompt-based pipelines.

#### Scenario: Host listens for submit event
- **WHEN** the user triggers submit in the SDK editor
- **THEN** the host MUST receive both structured parts and a text-compatible prompt output derived from the same editor state
