## ADDED Requirements

### Requirement: Chat input model MUST support four part kinds in MVP
The structured chat model SHALL support `text`, `media`, `input`, and `select` part kinds in MVP, and each part MUST be represented in `Part[]` with stable identity fields for edit and serialization workflows.

#### Scenario: Host initializes editor with mock parts
- **WHEN** the host passes structured parts that include text/media/input/select entries
- **THEN** the editor MUST render and preserve each part kind without flattening the content to plain text during editing

### Requirement: Input placeholder part MUST be editable inline
The system SHALL render `input` parts as inline editable fields with placeholder labels, and edits MUST update the corresponding part value in `Part[]`.

#### Scenario: User edits inline input placeholder
- **WHEN** the user updates an inline input placeholder value
- **THEN** `getParts()` MUST return the updated value on the same logical part identity

### Requirement: Select placeholder part MUST support controlled option selection
The system SHALL render `select` parts with selectable options from part metadata, and selected values MUST be persisted to `Part[]`.

#### Scenario: User changes inline select option
- **WHEN** the user selects an option from an inline select part
- **THEN** the selected value in the corresponding part MUST be updated and included in submit payload

### Requirement: Media part MUST support display and text fallback serialization
The system SHALL display media parts in the editor and include deterministic placeholder text tokens when serializing to prompt-compatible text output.

#### Scenario: Editor serializes parts containing media
- **WHEN** the host requests text-compatible output from parts containing media
- **THEN** the serializer MUST include configured media fallback tokens rather than dropping media semantics
