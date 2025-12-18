# VOID IDE

A privacy-first, browser-based code editor with local AI assistance. Your code never leaves your machine.

<!-- Build fix: Dependencies updated for Vercel deployment -->

## What is VOID?

VOID is a lightweight IDE that runs entirely in your browser. It features:

- Code editor with syntax highlighting and autocomplete
- Python execution via WebAssembly (no server needed)
- Local AI assistant that runs on your device
- File system that persists in browser storage

No accounts. No cloud. No data collection.

## Quick Start

```bash
git clone https://github.com/Cintu07/VOID.git
cd VOID
npm install
npm run dev
```

Open http://localhost:3000

## Features

### Editor

- Monaco Editor (same engine as VS Code)
- Support for Python, C, and C++
- IntelliSense autocomplete for all languages
- Keyboard shortcuts: F5 (run), Ctrl+S (save), Ctrl+Space (autocomplete)

### File System

- Create files and folders
- Nested folder structure
- Rename and delete with right-click context menu
- All files persist in browser localStorage

### Terminal

- Integrated terminal output
- Python code execution via Pyodide
- Real-time output streaming

### AI Assistant

- Runs locally using WebLLM
- Two modes available:
  - GPU Mode: Llama-3 (4GB download, faster)
  - CPU Mode: Qwen2 (300MB download, works on any device)
- No API keys required
- Your prompts stay on your device

## Usage

1. **Write Code**: Select or create a file in the sidebar, write your code
2. **Run**: Press F5 or click RUN to execute Python code
3. **Save**: Press Ctrl+S or click SAVE (auto-saves to browser storage)
4. **AI Help**: Click ACTIVATE BRAIN, wait for model download, then ask questions

## System Requirements

### Minimum (CPU Mode)

- Modern browser (Chrome, Edge, Firefox)
- 4GB RAM
- 500MB storage for AI model

### Recommended (GPU Mode)

- Chrome or Edge browser
- WebGPU-compatible GPU
- 8GB+ RAM
- 5GB storage for AI model

Check WebGPU support: chrome://gpu

## Tech Stack

- Next.js 14
- Monaco Editor
- XTerm.js
- Pyodide (Python in WebAssembly)
- WebLLM (local AI inference)
- Zustand (state management)
- Tailwind CSS

## Privacy

VOID is designed with privacy as a core principle:

- All code stays in your browser's localStorage
- AI models download once and run locally
- No server communication for code or AI
- No analytics or tracking
- Fully open source - audit the code yourself

Note: Clearing browser data will delete your saved files. Export important code as backup.

## Known Limitations

- Python only for code execution (C/C++ are editor-only for now)
- GPU AI mode requires WebGPU support
- Large files may slow down the editor
- No collaborative editing

## Contributing

Contributions welcome. Please open an issue first to discuss changes.

```bash
# Development
npm run dev

# Build
npm run build

# Lint
npm run lint
```

## License

MIT License. See LICENSE file.

## Feedback

Found a bug or have a feature request? Open an issue on GitHub.

---

Built for developers who value privacy.
