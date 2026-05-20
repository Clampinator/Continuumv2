# Continuum VTT Refactor: Technology Stack

## Core Platform
- **Foundry VTT v13**: The primary game engine and runtime environment for the Continuum system.
- **Foundry API**: System-level integration for actor/item management, socket communication, and UI rendering.

## Languages & Frameworks
- **JavaScript (ES Modules)**: The primary programming language for system logic, modules, and handlers.
- **Handlebars (.hbs, .html)**: The standard Foundry VTT template engine for rendering actor sheets, dialogs, and chat messages.
- **SVG (Scalable Vector Graphics)**: Primary technology for interactive, scalable data visualization (Lifeline Span Graph).

## Styling
- **Modular Vanilla CSS**: Styles are organized into functional modules (e.g., `attributes.css`, `lifeline.css`) for maintainability and clarity.

## Data Persistence
- **template.json**: Defines the standard data schema for Actor (Character, Organization, Location) and Item types.
- **actor.system.***: Dynamic data storage for complex lifeline structures, span pools, and relationship graphs.

## Testing & Automation
- **Playwright (playwright-cli)**: Used for browser automation, visual regression testing, and diagnostic snapshots within the Foundry VTT environment.
- **Vitest**: ESM-native unit testing framework for validating complex mathematical and logical services.

## Architectural Patterns
- **Segment-Based Temporal Engine**: Treats the character lifeline as a hierarchy of isolated chronological segments (Epochs), ensuring robust downward propagation of time shifts and non-destructive event insertion.
- **Temporal Translation Layer (TTL)**: Acts as an authoritative, bidirectional "air gap" between human-readable UI strings (e.g., "10y 5d") and pure mathematical integers (seconds/ms), preventing data corruption from round-tripping string formats.
    - **Age Converter**: Authoritative logic for subjective time (seconds).
    - **Coordinate Converter**: Location-aware logic for objective time (ms), strictly enforcing character-local chronology over UTC/System clocks.
    - **Location Resolver**: Establishes chronological context by performing a historical reverse-walk to map locations to IANA timezones.

## AI & External Services
- **Gemini / OpenRouter**: Integrated via `npc-generator` for lore-accurate, automated character and lifeline generation.
- **Python**: Used for automated template fixes and in-place code modifications.
