/**
 * Kernel Web Worker
 * 
 * This is the "CPU" of VOID IDE. It runs in a separate thread
 * to keep the UI responsive while executing user code and file operations.
 * 
 * CRITICAL: This worker has access to the VirtualDisk (file system).
 * All file operations happen here, not on the main thread.
 */

// TypeScript declaration for worker global scope
declare const self: WorkerGlobalScope & {
  pyodide?: any;
  loadPyodide?: any;
};

import { getDisk } from '../fs/VirtualDisk';
import type { KernelCommand, KernelResponse } from './types';

const fs = getDisk();
let pyodideReady = false;

// Worker message handler
self.onmessage = async (event: MessageEvent<KernelCommand>) => {
  const { type, payload } = event.data;

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

        // Initialize Pyodide with stdout redirection
        self.pyodide = await self.loadPyodide({
          stdout: (text: string) => {
            self.postMessage({
              type: 'TERMINAL_OUTPUT',
              payload: text,
            });
          },
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
