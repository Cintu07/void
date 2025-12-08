# VOID IDE

A serverless, browser-native IDE where the entire operating system runs client-side using WebAssembly, Web Workers, and IndexedDB. Write Python code, execute it instantly, and get AI assistance—all without any backend servers.

## Features

- **Python Runtime**: Execute Python code via Pyodide (WebAssembly)
- **Monaco Editor**: VSCode-like code editor with syntax highlighting
- **XTerm Terminal**: Full terminal emulation for output display
- **AI Brain**: Local LLM (Llama-3-8B) running in browser via WebGPU
- **Virtual File System**: IndexedDB-backed persistent storage
- **Web Worker Architecture**: Multi-threaded execution without UI blocking

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Cintu07/VOID.git
cd VOID

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage Guide

### 1. Write Python Code

- Type your Python code in the Monaco Editor (left panel)
- Syntax highlighting and autocomplete enabled

### 2. Execute Code

- Click **RUN (F5)** to execute your Python code
- Output appears in the terminal (right panel)
- Errors are displayed with stack traces

### 3. Save Your Work

- Click **SAVE (Ctrl+S)** to persist code to `/main.py`
- Files are saved to IndexedDB (survives page refresh)

### 4. Activate AI Brain

- Click **ACTIVATE BRAIN** to download Llama-3-8B model (~4GB, one-time)
- Progress bar shows download status
- **Requires GPU**: WebGPU-compatible graphics card needed
- Ask AI questions: "Write a function to...", "Explain this code", etc.

### 5. Test File System

- Click **TEST FS** to verify virtual file system is working
- Creates test files and reads them back

## System Requirements

### For Basic Python IDE (No AI)

- Modern browser (Chrome 90+, Firefox 89+, Edge 90+)
- 4GB RAM minimum
- No GPU required

### For AI Features

- **GPU Required**: WebGPU-compatible graphics card
- 8GB RAM minimum
- 4GB+ free disk space (for model cache)
- Browsers: Chrome 113+, Edge 113+ (WebGPU support)

## Architecture

VOID IDE implements a four-layer architecture that mimics a traditional operating system, but runs entirely in the browser:

### Layer 1: File System (`/src/fs`)

- **VirtualDisk**: In-memory file system backed by IndexedDB
- **Strategy**: Sync-memory, async-flush for WASM compatibility
- **Operations**: `readFileSync()`, `writeFileSync()`, `existsSync()`, `unlinkSync()`
- **Persistence**: Background flush to IndexedDB every 2 seconds

### Layer 2: Kernel (`/src/kernel`)

- **Worker**: Web Worker running off main thread
- **Commands**: `BOOT`, `BOOT_PYTHON`, `EXEC`, `READ_FILE`, `WRITE_FILE`
- **Communication**: Type-safe message protocol via `KernelCommand`/`KernelResponse`
- **Isolation**: File operations and code execution run in separate thread

### Layer 2.5: AI Brain (`/src/kernel/ai.worker.ts`)

- **Model**: Llama-3-8B-Instruct-q4f32_1-MLC (4GB)
- **Engine**: WebLLM (MLC-LLM) with WebGPU acceleration
- **Worker**: Separate AI worker for non-blocking inference
- **Features**: Streaming responses, progress tracking, model caching
- **Graceful Fallback**: Auto-detects restricted environments (Incognito mode, privacy browsers)
  - Try 1: Persistent cache via IndexedDB
  - Try 2: RAM-only mode if IDBFS mount fails
- **Commands**: `BOOT_AI`, `GENERATE`
- **Hook**: `useAI()` for AI lifecycle management

### Layer 3: Runtime (`/src/kernel/worker.ts`)

- **Python**: Pyodide loaded via CDN (no npm install)
- **Version**: 0.23.4
- **Execution**: `runPythonAsync()` with stdout redirection
- **Loading**: Lazy-loaded on first execution

### Layer 4: UI (`/app`)

- **Framework**: Next.js with React
- **Styling**: Tailwind CSS
- **Hooks**: `useKernel()`, `useAI()` for worker lifecycle
- **Editor**: Monaco Editor with Python syntax
- **Terminal**: XTerm.js with fit addon
- **Features**: Code editor, terminal output, AI chat, progress bars

## Critical Constraints

### 1. No Cloud Dependencies

All logic runs client-side. No server-side execution.

### 2. Memory Safety

When interfacing JavaScript with WASM:

```javascript
const ptr = Module._malloc(bytes);
try {
  // operations
} finally {
  Module._free(ptr);
}
```

### 3. Async-Sync Bridge

- File System: Memory-first (synchronous)
- IndexedDB: Background flush (asynchronous)
- Rule: Never `await` inside synchronous WASM calls

### 4. Isolation

- User code execution: Web Worker only
- Communication: `postMessage()` with `SharedArrayBuffer` support

## Security Headers

Required for `SharedArrayBuffer` support in `next.config.ts`:

```typescript
headers: [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
];
```

## Tech Stack

- **Frontend**: Next.js 16.0.7, React 19.2.0, Tailwind CSS 4
- **Editor**: Monaco Editor 4.7.0 (VSCode engine)
- **Terminal**: XTerm.js 5.3.0 with fit addon
- **Storage**: IndexedDB (via `idb` wrapper)
- **Python Runtime**: Pyodide 0.23.4 (CDN-loaded)
- **AI Runtime**: WebLLM 0.2.80 (Llama-3-8B via WebGPU)
- **Workers**: Web Workers with TypeScript
- **Build**: Turbopack

## Project Structure

```
void-ide/
├── app/
│   ├── page.tsx           # Main UI (Editor + Terminal + AI)
│   ├── layout.tsx         # Root layout with headers
│   └── globals.css        # Tailwind styles
├── src/
│   ├── fs/
│   │   └── VirtualDisk.ts # IndexedDB file system
│   ├── kernel/
│   │   ├── worker.ts      # Python kernel worker
│   │   └── ai.worker.ts   # AI inference worker
│   ├── hooks/
│   │   ├── useKernel.ts   # Python kernel hook
│   │   └── useAI.ts       # AI brain hook
│   └── ui/
│       ├── Editor.tsx     # Monaco editor component
│       └── Terminal.tsx   # XTerm terminal component
├── public/                # Static assets
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
└── next.config.ts         # Next.js config (CORS headers)
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Verification

1. **Console**: Check for worker initialization logs
2. **IndexedDB**: DevTools → Application → IndexedDB → `void-fs`
3. **Persistence**: Write file, refresh page, verify content remains

## Current Status

### Completed

- ✓ Phase 1: IndexedDB file system with sync/async bridge
- ✓ Phase 2: Multi-threaded kernel with Web Worker
- ✓ Phase 3: Python runtime via Pyodide CDN
- ✓ Phase 4: Terminal UI (XTerm.js integration)
- ✓ Phase 5: Monaco Editor with Python syntax highlighting
- ✓ Phase 6: AI Brain (Llama-3-8B with WebGPU, progress tracking)

### Next Up

- Phase 7: File explorer UI
- Phase 8: Multi-file support
- Phase 9: Package manager (pip integration)
- Phase 10: Additional language runtimes (JavaScript, Rust)

## Troubleshooting

### AI Won't Load (GPU Error)

**Problem**: "Unable to find a compatible GPU"

**Solution**: AI requires WebGPU. Check compatibility:

1. Visit: https://webgpureport.org/
2. If not supported, AI features won't work (Python IDE still works)
3. Use a GPU-enabled laptop or desktop
4. Update browser: Chrome 113+ or Edge 113+

### Cache Issues

**Problem**: Changes not appearing after code updates

**Solution**:

```bash
# Clear Next.js cache
Remove-Item -Path ".next" -Recurse -Force
npm run dev
```

### Model Download Stuck

**Problem**: Progress bar not moving during AI activation

**Solution**:

1. Open DevTools (F12) → Console tab
2. Check for error messages
3. Check Network tab → Filter by "huggingface.co"
4. If stuck, refresh page and try again
5. Ensure stable internet (4GB download)

### "Unable to add filesystem" Error (Incognito Mode)

**Problem**: `Unable to add filesystem: <illegal path>` appears in console during AI boot

**Cause**: Browser is in Incognito/Private mode or has strict storage policies blocking IndexedDB

**Solution**: This is handled automatically!
- The AI worker detects the error and falls back to **RAM-only mode**
- Model still downloads and works normally
- Trade-off: Model is NOT cached (will re-download on page refresh)
- Look for `[RAM-only]` prefix in progress messages

**To enable persistent cache:**
1. Exit Incognito/Private mode
2. Use regular browser window
3. Check browser storage settings allow IndexedDB

## Known Issues

1. **Window vs GlobalThis**: Workers don't have `window` object. Use `globalThis` for cross-environment compatibility.
2. **Hot Reload**: React Fast Refresh may require full page reload when worker code changes.
3. **Source Maps**: Next.js may show source map warnings for worker files.
4. **GPU Requirement**: AI features require WebGPU-compatible GPU (not available on all systems).
5. **Model Size**: First-time AI activation downloads 4GB (cached for subsequent use, unless in RAM-only mode).
6. **Incognito Mode**: AI works but switches to RAM-only mode (no persistent cache, re-downloads on refresh).

## Performance Notes

### Python Execution

- **Startup**: 2-3 seconds (Pyodide loads from CDN)
- **Execution**: Near-native speed (WebAssembly)
- **Memory**: ~150MB overhead for Pyodide

### AI Inference (GPU)

- **Model Load**: 30-60 seconds (4GB download + initialization)
- **Token Speed**: 10-50 tokens/sec (GPU-dependent)
- **Memory**: ~4.5GB VRAM required
- **Cache Modes**:
  - **Persistent**: Model cached in IndexedDB, instant load on subsequent visits
  - **RAM-only**: Model discarded on page close, re-downloads every time (Incognito mode)

## Contributing

Pull requests welcome! Focus areas:

- Additional language runtimes
- File explorer UI
- Package manager integration
- Performance optimizations
- Mobile browser support

## License

MIT

---

**Built by**: Cintu07  
**Repository**: [github.com/Cintu07/VOID](https://github.com/Cintu07/VOID)  
**Status**: Active Development (Phase 6 Complete)

**Note**: This project is a work in progress. APIs and architecture may change between phases.
