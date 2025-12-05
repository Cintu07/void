# VOID IDE

A serverless, browser-native IDE where the entire operating system runs client-side using WebAssembly, Web Workers, and IndexedDB.

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

### Layer 3: Runtime (`/src/kernel/worker.ts`)

- **Python**: Pyodide loaded via CDN (no npm install)
- **Version**: 0.23.4
- **Execution**: `runPythonAsync()` with stdout redirection
- **Loading**: Lazy-loaded on first execution

### Layer 4: UI (`/app`)

- **Framework**: Next.js with React
- **Styling**: Tailwind CSS
- **Hook**: `useKernel()` for worker lifecycle management
- **Features**: Code editor, output display, file persistence

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

- **Frontend**: Next.js 16.0.7, React, Tailwind CSS
- **Storage**: IndexedDB (via `idb` wrapper)
- **Runtime**: Pyodide 0.23.4 (CDN)
- **Workers**: Web Workers with TypeScript
- **Build**: Turbopack

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

### In Progress

- Phase 4: Terminal UI (xterm.js)
- Phase 5: Code editor (Monaco)
- Phase 6: File explorer
- Phase 7: Additional language runtimes

## Known Issues

1. **Window vs GlobalThis**: Workers don't have `window` object. Use `globalThis` for cross-environment compatibility.
2. **Hot Reload**: React Fast Refresh may require full page reload when worker code changes.
3. **Source Maps**: Next.js may show source map warnings for worker files.

## License

MIT

---

**Note**: This project is actively under development. APIs and architecture may change.
