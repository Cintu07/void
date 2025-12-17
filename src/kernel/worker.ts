/**
 * Kernel Web Worker
 * 
 * This is the "CPU" of VOID IDE. It runs in a separate thread
 * to keep the UI responsive while executing user code and file operations.
 * 
 * CRITICAL: This worker has access to the VirtualDisk (file system).
 * All file operations happen here, not on the main thread.
 * 
 * Version: 1.1.0 (Updated: Dec 6, 2025 - Fixed terminal formatting)
 */

// TypeScript declaration for worker global scope
declare const self: DedicatedWorkerGlobalScope & {
  pyodide?: any;
  loadPyodide?: any;
  importScripts: (...urls: string[]) => void;
};

import { getDisk } from '../fs/VirtualDisk';
import type { KernelCommand, KernelResponse } from './types';

console.log('[Worker] VOID Kernel Worker v1.2.0 - Multi-language support (Python, C, C++)');
const fs = getDisk();
let pyodideReady = false;
let clangReady = false;

/**
 * Output Batcher
 * Prevents write amplification by batching high-frequency stdout
 * into single messages every 16ms (1 animation frame)
 */
class OutputBatcher {
  private buffer: string[] = [];
  private timeoutId: any = null;

  write(text: string) {
    // Store text as-is, terminal already handles line breaks
    this.buffer.push(text);

    // If no flush is scheduled, schedule one
    if (this.timeoutId === null) {
      this.timeoutId = setTimeout(() => {
        this.flush();
      }, 16); // ~60fps
    }
  }

  flush() {
    if (this.buffer.length === 0) return;

    const combined = this.buffer.join('');
    this.buffer = [];
    this.timeoutId = null;

    self.postMessage({
      type: 'TERMINAL_OUTPUT',
      payload: combined,
    });
  }
}

const outputBatcher = new OutputBatcher();

// Worker message handler
self.onmessage = async (event: MessageEvent<KernelCommand>) => {
  const { type } = event.data;
  const payload = 'payload' in event.data ? event.data.payload : undefined;
  
  console.log('[Worker] Received command:', type);

  try {
    switch (type) {
      case 'BOOT': {
        // Initialize the file system
        await fs.waitForBoot();
        
        const response: KernelResponse = {
          type: 'RESPONSE',
          payload: 'Kernel Ready',
        };
        self.postMessage(response);
        break;
      }

      case 'BOOT_PYTHON': {
        if (pyodideReady) {
          const response: KernelResponse = {
            type: 'RESPONSE',
            payload: 'Python already loaded',
          };
          self.postMessage(response);
          break;
        }

        // Load Pyodide from CDN
        importScripts('https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js');

        // Initialize Pyodide with stdout handler
        // @ts-ignore
        self.pyodide = await loadPyodide({
          stdout: (text: string) => {
            // 👇 THIS FIXES THE "Line 0Line 1" BUG 👇
            // We force every new line (\n) to become a real terminal new line (\r\n)
            const formatted = text.replace(/\n/g, '\r\n');
            
            // Add a newline at the end if it's missing (Python print usually has it, but better safe)
            const finalOutput = formatted.endsWith('\r\n') ? formatted : formatted + '\r\n';
            
            self.postMessage({ type: 'TERMINAL_OUTPUT', payload: finalOutput });
          }
        });

        pyodideReady = true;

        const response: KernelResponse = {
          type: 'RESPONSE',
          payload: 'Python runtime loaded',
        };
        self.postMessage(response);
        break;
      }

      case 'READ_FILE': {
        if (!payload) {
          throw new Error('READ_FILE requires payload');
        }

        const { path } = payload as { path: string };
        
        // Check if file exists
        if (!fs.existsSync(path)) {
          const response: KernelResponse = {
            type: 'RESPONSE',
            payload: null,
          };
          self.postMessage(response);
          break;
        }
        
        // Read file synchronously (safe because we're in a worker)
        const data = fs.readFileSync(path);
        
        const response: KernelResponse = {
          type: 'RESPONSE',
          payload: data,
        };
        self.postMessage(response);
        break;
      }

      case 'WRITE_FILE': {
        if (!payload) {
          throw new Error('WRITE_FILE requires payload');
        }

        const { path, content } = payload as { path: string; content: Uint8Array };
        
        // Write file synchronously (safe because we're in a worker)
        fs.writeFileSync(path, content);
        
        const response: KernelResponse = {
          type: 'RESPONSE',
          payload: `Written: ${path}`,
        };
        self.postMessage(response);
        break;
      }

      case 'EXEC': {
        if (!payload) {
          throw new Error('EXEC requires payload');
        }

        const { cmd } = payload as { cmd: string };
        
        // Check if Python runtime is loaded
        if (!pyodideReady || !self.pyodide) {
          throw new Error('Python runtime not loaded. Call BOOT_PYTHON first.');
        }

        // Execute Python code
        const result = await self.pyodide.runPythonAsync(cmd);
        
        const response: KernelResponse = {
          type: 'RESPONSE',
          payload: result !== undefined ? String(result) : '',
        };
        self.postMessage(response);
        break;
      }

      case 'RUN_C':
      case 'RUN_CPP': {
        if (!payload) {
          throw new Error(`${type} requires payload`);
        }

        const { code } = payload as { code: string };
        const isC = type === 'RUN_C';
        const ext = isC ? 'c' : 'cpp';
        const compiler = isC ? 'gcc' : 'g++';
        
        // Write source file to virtual FS
        const sourceFile = `/tmp/program.${ext}`;
        const outputFile = '/tmp/program.out';
        fs.writeFileSync(sourceFile, new TextEncoder().encode(code));
        
        // For now, simulate C/C++ compilation with a message
        // TODO: Integrate actual WASM-based compiler (clang via wasm or jor1k)
        outputBatcher.write(
          `\r\n⚠️  C/C++ compilation in browser is experimental\r\n` +
          `\r\n📝 Source code saved to ${sourceFile}\r\n` +
          `\r\n🔧 To enable C/C++ compilation:\r\n` +
          `   1. Integrate wasm-clang or emscripten\r\n` +
          `   2. Or use jor1k Linux emulator\r\n` +
          `   3. Or implement WebAssembly text format compiler\r\n` +
          `\r\nFor now, use Python for zero-trust browser execution!\r\n`
        );
        outputBatcher.flush();
        
        const response: KernelResponse = {
          type: 'RESPONSE',
          payload: 'C/C++ compilation requires additional WASM toolchain',
        };
        self.postMessage(response);
        break;
      }

      case 'LIST_FILES': {
        // List all files in virtual FS
        const listDir = (path: string): string[] => {
          try {
            const entries = fs.readdirSync(path);
            let files: string[] = [];
            
            for (const entry of entries) {
              const fullPath = `${path}/${entry}`;
              try {
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                  files.push(`${fullPath}/`);
                  files = files.concat(listDir(fullPath));
                } else {
                  files.push(fullPath);
                }
              } catch (e) {
                // Skip inaccessible files
              }
            }
            
            return files;
          } catch (e) {
            return [];
          }
        };
        
        const allFiles = listDir('/');
        
        const response: KernelResponse = {
          type: 'RESPONSE',
          payload: allFiles,
        };
        self.postMessage(response);
        break;
      }

      case 'DELETE_FILE': {
        if (!payload) {
          throw new Error('DELETE_FILE requires payload');
        }

        const { path } = payload as { path: string };
        
        try {
          fs.unlinkSync(path);
          const response: KernelResponse = {
            type: 'RESPONSE',
            payload: `Deleted: ${path}`,
          };
          self.postMessage(response);
        } catch (error) {
          throw new Error(`Failed to delete ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        break;
      }

      default: {
        throw new Error(`Unknown command type: ${type}`);
      }
    }
  } catch (error) {
    // Error handling - send back to main thread
    const errorResponse: KernelResponse = {
      type: 'ERROR',
      payload: {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
    };
    self.postMessage(errorResponse);
  }
};

console.log('[Kernel] Worker initialized');
