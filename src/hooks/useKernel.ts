/**
 * useKernel Hook
 * 
 * Manages the Kernel Web Worker lifecycle and provides a clean API
 * for communicating with it from React components.
 * 
 * ARCHITECTURE:
 * - Worker persists across renders (useRef)
 * - Automatic cleanup on unmount
 * - Promise-based API for async operations
 */

'use client';

import { useRef, useEffect, useState } from 'react';
import type { KernelCommand, KernelResponse } from '../kernel/types';

export function useKernel() {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const pendingCallbacksRef = useRef<Map<number, (response: KernelResponse) => void>>(new Map());
  const messageIdRef = useRef(0);

  useEffect(() => {
    // Initialize the worker
    const worker = new Worker(new URL('../kernel/worker.ts', import.meta.url));
    workerRef.current = worker;

    // Handle messages from the worker
    worker.onmessage = (event: MessageEvent<KernelResponse>) => {
      const response = event.data;
      console.log('[useKernel] Received from worker:', response);

      // Handle terminal output separately
      if (response.type === 'TERMINAL_OUTPUT') {
        setTerminalOutput(prev => [...prev, response.payload]);
        return;
      }

      // Find and execute the pending callback
      const callbacks = Array.from(pendingCallbacksRef.current.values());
      if (callbacks.length > 0) {
        const callback = callbacks[0];
        pendingCallbacksRef.current.clear();
        callback(response);
      }
    };

    worker.onerror = (error) => {
      console.error('[useKernel] Worker error:', error);
    };

    console.log('[useKernel] Worker initialized');

    // Cleanup on unmount
    return () => {
      console.log('[useKernel] Terminating worker');
      worker.terminate();
      workerRef.current = null;
      setIsReady(false);
    };
  }, []);

  /**
   * Send a command to the kernel and wait for a response
   */
  const sendCommand = (command: KernelCommand): Promise<KernelResponse> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const messageId = messageIdRef.current++;
      
      console.log('[useKernel] Sending command:', command);

      // Store the callback
      pendingCallbacksRef.current.set(messageId, (response: KernelResponse) => {
        if (response.type === 'ERROR') {
          reject(new Error(response.payload.message));
        } else {
          resolve(response);
        }
      });

      // Send the command
      workerRef.current.postMessage(command);
    });
  };

  /**
   * Boot the kernel (initialize file system)
   */
  const boot = async (): Promise<string> => {
    const response = await sendCommand({ type: 'BOOT' });
    setIsReady(true);
    return response.payload;
  };

  /**
   * Boot Python runtime
   */
  const bootPython = async (): Promise<string> => {
    const response = await sendCommand({ type: 'BOOT_PYTHON' });
    return response.payload;
  };

  /**
   * Execute Python code
   */
  const runPython = async (code: string): Promise<string> => {
    setTerminalOutput([]); // Clear previous output
    const response = await sendCommand({ 
      type: 'EXEC', 
      payload: { cmd: code } 
    });
    return response.payload;
  };

  /**
   * Execute a command in the kernel (legacy)
   */
  const exec = async (cmd: string): Promise<string> => {
    const response = await sendCommand({ 
      type: 'EXEC', 
      payload: { cmd } 
    });
    return response.payload;
  };

  /**
   * Read a file through the kernel
   */
  const readFile = async (path: string): Promise<Uint8Array | null> => {
    const response = await sendCommand({ 
      type: 'READ_FILE', 
      payload: { path } 
    });
    return response.payload;
  };

  /**
   * Write a file through the kernel
   */
  const writeFile = async (path: string, content: Uint8Array): Promise<string> => {
    const response = await sendCommand({ 
      type: 'WRITE_FILE', 
      payload: { path, content } 
    });
    return response.payload;
  };

  return {
    boot,
    bootPython,
    runPython,
    exec,
    readFile,
    writeFile,
    isReady,
    terminalOutput,
  };
}
