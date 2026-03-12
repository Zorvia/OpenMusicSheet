# OpenSheetMusic

A cross-platform, WYSIWYG sheet-music editor that composes, edits, plays back, and exports professional sheet music.

Built with TypeScript, React, VexFlow, and Tauri.

## Features

- **WYSIWYG Staff Editor**: Drag-and-drop note entry, selection, copy/paste, multi-measure edit, undo/redo
- **Multi-Staff Support**: Piano grand staff, orchestral, choir templates
- **Full Notation**: Clefs, key/time signatures, tuplets, ties, slurs, beams, rests, articulations, dynamics, grace notes, chord symbols, lyrics, repeats, volta endings
- **Playback**: MIDI event scheduling, tempo automation, metronome, per-staff mute/solo
- **Import/Export**: MusicXML (round-trip), MIDI, native project file (`.osmproj`), PDF (print quality), WAV audio
- **Accessibility**: Keyboard navigation, screen-reader labels, high-contrast mode
- **Cross-Platform**: macOS `.app`/`.dmg`, Windows `.exe`/`.msi`, Linux `.deb`/`.AppImage`

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- Platform-specific dependencies for Tauri: see [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites)

### Install & Run

```bash
npm ci
npm run dev
```

### Build Desktop App

```bash
npm run build
npm run tauri:build
```

### Run Tests

```bash
npm test
```

### Check for Comments

```bash
npm run check:comments
```

## Project Structure

```
OpenSheetMusic/
├── src/
│   ├── core/                  # Document model, mutations, I/O, playback
│   │   ├── document-model.ts  # Immutable score data types and constructors
│   │   ├── undo-manager.ts    # Snapshot-based undo/redo
│   │   ├── musicxml-io.ts     # MusicXML parser and serializer
│   │   ├── midi-converter.ts  # MIDI conversion
│   │   ├── playback-engine.ts # WebAudio playback
│   │   ├── pdf-exporter.ts    # PDF generation
│   │   ├── wav-exporter.ts    # WAV audio export
│   │   ├── project-file.ts    # Native .osmproj format
│   │   ├── score-mutations.ts # Immutable score operations
│   │   └── index.ts
│   ├── ui/                    # React UI components
│   │   ├── App.tsx            # Main application component
│   │   ├── ScoreRenderer.tsx  # VexFlow-based notation renderer
│   │   ├── Toolbar.tsx        # Editing toolbar
│   │   ├── StaffPanel.tsx     # Staff mixer panel
│   │   └── StatusBar.tsx      # Status bar
│   ├── main.tsx               # Entry point
│   └── styles.css             # Application styles
├── src-tauri/                 # Rust/Tauri backend
│   ├── src/
│   │   ├── main.rs            # Tauri application entry
│   │   └── midi_bridge.rs     # Native MIDI file handling
│   ├── Cargo.toml
│   └── tauri.conf.json
├── tests/                     # Unit tests
├── tools/                     # Build and CI tools
│   ├── check-no-comments.mjs  # Comment-free enforcement script
│   └── pre-commit             # Git pre-commit hook
├── .github/workflows/
│   └── release.yml            # CI/CD pipeline
├── package.json
├── tsconfig.json
├── vite.config.ts
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
└── LICENSE (MIT)
```

## Architecture

### Document Model
The score is represented as an immutable data structure. All mutations return new score objects, enabling simple snapshot-based undo/redo with the `UndoManager`.

### Notation Rendering
VexFlow renders musical notation directly in SVG within the browser/Tauri webview. Only visible measures are rendered for performance with large scores.

### Playback Engine
Uses the WebAudio API for synthesis. MIDI events are scheduled with deterministic timestamps for accurate playback. The Rust backend provides native MIDI file parsing and writing via the `midly` crate.

### I/O Layer
- **MusicXML**: Bidirectional conversion targeting lossless round-trip fidelity
- **MIDI**: Score-to-MIDI and MIDI-to-Score conversion
- **Project File**: JSON-based `.osmproj` format preserving full score state
- **PDF**: Print-quality export via jsPDF
- **WAV**: Direct audio synthesis export

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| C-B | Add note (C through B at octave 4) |
| R | Add rest |
| 1-6 | Select duration (whole through 32nd) |
| Delete/Backspace | Delete selected element |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z / Ctrl+Y | Redo |
| Ctrl+S | Save project |
| Ctrl+N | New score |
| Space | Play/Pause |
| Escape | Stop playback |
| Arrow Keys | Navigate staves and measures |

## CI/CD

The GitHub Actions pipeline (`.github/workflows/release.yml`):

1. Checks for comments in source files
2. Runs unit tests
3. Builds web assets
4. Builds Tauri desktop apps for macOS, Windows, and Linux
5. Creates a GitHub Release with downloadable artifacts (on tag push)

### Code Signing

To enable code signing for releases, add these secrets to your GitHub repository:

**macOS:**
- `APPLE_CERTIFICATE`: Base64-encoded `.p12` certificate
- `APPLE_CERTIFICATE_PASSWORD`: Certificate password
- `APPLE_SIGNING_IDENTITY`: Signing identity string
- `APPLE_ID`: Apple ID for notarization
- `APPLE_PASSWORD`: App-specific password

**Windows:**
- `WINDOWS_CERTIFICATE`: Base64-encoded `.pfx` certificate
- `WINDOWS_CERTIFICATE_PASSWORD`: Certificate password

The build will succeed without signing credentials but produce unsigned binaries.

## Zero Comments Policy

All source files must contain zero comments. This is enforced by:

1. A CI job that scans all tracked source files
2. A pre-commit hook (`tools/pre-commit`)
3. The `npm run check:comments` script

To install the pre-commit hook:

```bash
cp tools/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Dependencies

All dependencies are open-source:

| Dependency | License | Purpose |
|-----------|---------|---------|
| React | MIT | UI framework |
| VexFlow | MIT | Music notation rendering |
| Tauri | MIT/Apache-2.0 | Desktop app shell |
| jsPDF | MIT | PDF generation |
| uuid | MIT | ID generation |
| midly (Rust) | MIT | MIDI file parsing |
| Vite | MIT | Build tool |
| Vitest | MIT | Test framework |

## License

MIT License - see [LICENSE](LICENSE) for details.

Copyright (c) 2026 Zorvia
