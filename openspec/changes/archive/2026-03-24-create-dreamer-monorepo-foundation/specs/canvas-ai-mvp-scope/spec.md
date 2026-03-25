## ADDED Requirements

### Requirement: Canvas MVP MUST support image and text nodes only
The first release of the canvas domain model MUST support exactly two editable node kinds: `image` and `text`.

#### Scenario: User inserts supported node types
- **WHEN** a user creates new content on the canvas during MVP phase
- **THEN** the system allows creation of `image` and `text` nodes

#### Scenario: Unsupported node type is requested
- **WHEN** a feature flow attempts to create non-MVP node kinds such as `shape` or `group`
- **THEN** the system rejects or ignores the request according to the documented MVP boundary

### Requirement: Frontend MUST provide infinite canvas interaction baseline
The frontend MUST provide baseline infinite-canvas interactions including viewport pan and zoom for placed nodes.

#### Scenario: User navigates large canvas area
- **WHEN** the user drags or zooms the viewport
- **THEN** the canvas viewport updates and previously placed `image` and `text` nodes remain spatially consistent

### Requirement: Frontend MUST provide AI chat entry integrated with editor
The frontend MUST include an AI chat entry surface using Tiptap-based input so users can submit generation prompts from within the app.

#### Scenario: User submits prompt from chat input
- **WHEN** the user enters a prompt in the AI chat surface and submits
- **THEN** the frontend emits a generation request payload compatible with shared AI request contract

### Requirement: Generated image result MUST be insertable into canvas flow
The product flow MUST support taking an AI-generated image result and creating a corresponding `image` node on the canvas.

#### Scenario: Generation result returned to frontend
- **WHEN** an AI generation response returns an image reference
- **THEN** the frontend can create an `image` node using that reference and place it on canvas
