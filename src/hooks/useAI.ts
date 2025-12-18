/**
 * useAI Hook
 * 
 * Manages the AI Web Worker lifecycle and provides
 * a React-friendly API for LLM interactions.
 * 
 * Similar to useKernel but for AI operations.
 */

'use client';

import { useRef, useState, useEffect } from 'react';

interface ProgressUpdate {
  text: string;
  progress: number;
}

interface AIResponse {
  type: 'RESPONSE' | 'PROGRESS' | 'AI_OUTPUT' | 'ERROR';
  payload: any;
}

interface AICommand {
  type: 'BOOT_AI' | 'GENERATE';
  payload?: any;
  mode?: 'gpu' | 'cpu';
}

export function useAI() {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<ProgressUpdate>({
    text: 'Not started',
    progress: 0,
  });
  const [aiOutput, setAiOutput] = useState<string[]>([]);
  const commandQueueRef = useRef<Map<number, { resolve: Function; reject: Function }>>(new Map());
  const commandIdRef = useRef(0);

  // Shared message handler factory
  const createMessageHandler = () => (event: MessageEvent<AIResponse>) => {
    const { type, payload } = event.data;

    switch (type) {
      case 'PROGRESS':
        console.log('[useAI] Progress update:', payload);
        setLoadingProgress(payload);
        break;

      case 'AI_OUTPUT':
        setAiOutput((prev) => [...prev, payload]);
        break;

      case 'RESPONSE':
        console.log('[useAI] Response:', payload);
        if (payload.includes('AI Brain activated')) {
          setIsReady(true);
        }
        // AI worker processes commands sequentially (in-order responses guaranteed)
        // Use commandIdRef to match response to the command that initiated it
        {
          const pendingCommand = commandQueueRef.current.get(commandIdRef.current);
          if (pendingCommand) {
            pendingCommand.resolve(payload);
            commandQueueRef.current.delete(commandIdRef.current);
          }
        }
        break;

      case 'ERROR':
        console.error('[useAI] Error:', payload);
        // Match error to current command using commandIdRef
        {
          const errorCommand = commandQueueRef.current.get(commandIdRef.current);
          if (errorCommand) {
            errorCommand.reject(new Error(payload));
            commandQueueRef.current.delete(commandIdRef.current);
          }
        }
        break;
    }
  };

  useEffect(() => {
    // Create AI worker
    const worker = new Worker(new URL('../kernel/ai.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = createMessageHandler();

    worker.onerror = (error) => {
      console.error('[useAI] Worker error:', error);
    };

    workerRef.current = worker;

    // Cleanup
    return () => {
      // Clear pending commands on cleanup
      commandQueueRef.current.forEach(({ reject }) => {
        reject(new Error('Worker terminated'));
      });
      commandQueueRef.current.clear();
      worker.terminate();
    };
  }, []);

  const sendCommand = (command: AICommand): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      commandIdRef.current++;
      commandQueueRef.current.set(commandIdRef.current, { resolve, reject });

      workerRef.current.postMessage(command);
    });
  };

  const bootAI = async (mode: 'gpu' | 'cpu' = 'gpu'): Promise<string> => {
    setLoadingProgress({ text: `Initializing AI (${mode.toUpperCase()} mode)...`, progress: 0 });
    return sendCommand({ type: 'BOOT_AI', mode });
  };

  const askAI = async (prompt: string): Promise<string> => {
    // Clear previous output
    setAiOutput([]);
    
    return sendCommand({
      type: 'GENERATE',
      payload: { prompt },
    });
  };

  const clearOutput = () => {
    setAiOutput([]);
  };

  const resetAI = () => {
    // Reset state so user can activate again
    setIsReady(false);
    setLoadingProgress({ text: 'Not started', progress: 0 });
    setAiOutput([]);
  };

  const terminateAI = () => {
    // Clear pending commands
    commandQueueRef.current.forEach(({ reject }) => {
      reject(new Error('AI terminated'));
    });
    commandQueueRef.current.clear();
    
    // Terminate worker and recreate
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsReady(false);
    setLoadingProgress({ text: 'Not started', progress: 0 });
    setAiOutput([]);
    
    // Create new worker with shared handler
    const worker = new Worker(new URL('../kernel/ai.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = createMessageHandler();
    workerRef.current = worker;
  };

  return {
    isReady,
    loadingProgress,
    aiOutput,
    bootAI,
    askAI,
    clearOutput,
    resetAI,
    terminateAI,
  };
}
