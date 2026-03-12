# Contributing to OpenSheetMusic

Thank you for considering contributing to OpenSheetMusic! This document explains how to contribute effectively.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm ci`
4. Start the dev server: `npm run dev`

## Development Setup

### Prerequisites

- Node.js 20+
- Rust toolchain (stable)
- Tauri CLI: included in devDependencies

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build web assets |
| `npm run tauri:dev` | Launch Tauri development window |
| `npm run tauri:build` | Build production desktop app |
| `npm test` | Run unit tests |
| `npm run check:comments` | Verify no comments in source |

## Code Standards

### No Comments Policy

This project enforces a strict **zero comments** policy in all source files. This includes:

- Single-line comments (`//`, `#`)
- Multi-line comments (`/* */`)
- Docstrings

A pre-commit hook and CI check enforce this. If your PR contains comments, it will be rejected.

Write self-documenting code with clear variable and function names instead of comments.

### Code Style

- TypeScript strict mode
- Immutable data patterns for the document model
- React functional components with hooks
- Rust idiomatic patterns

## Architecture

- **Document Model** (`src/core/document-model.ts`): Immutable, snapshottable score representation
- **Score Mutations** (`src/core/score-mutations.ts`): Pure functions that return new score states
- **Undo Manager** (`src/core/undo-manager.ts`): Snapshot-based undo/redo
- **MusicXML I/O** (`src/core/musicxml-io.ts`): Bidirectional MusicXML conversion
- **MIDI Converter** (`src/core/midi-converter.ts`): Score to/from MIDI
- **Playback Engine** (`src/core/playback-engine.ts`): WebAudio-based playback
- **UI Layer** (`src/ui/`): React components

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes following the code standards
3. Ensure all tests pass: `npm test`
4. Ensure comment-free check passes: `npm run check:comments`
5. Submit a PR with a clear description

## Testing

- Unit tests go in `tests/`
- Use Vitest for testing
- Test document mutations, I/O converters, and core logic
- Rendering and E2E tests use Playwright

## Reporting Issues

Use GitHub Issues with a clear description, steps to reproduce, and expected behavior.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
