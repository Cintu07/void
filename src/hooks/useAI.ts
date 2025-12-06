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

  useEffect(() => {
    // Create AI worker
    const worker = new Worker(new URL('../kernel/ai.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event: MessageEvent<AIResponse>) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'PROGRESS':
          console.log('[useAI] Progress update:', payload);
          setLoadingProgress(payload);
          break;

        case 'AI_OUTPUT':
          // Streaming output from LLM
          setAiOutput((prev) => [...prev, payload]);
          break;

        case 'RESPONSE':
          // Command completed successfully
          console.log('[useAI] Response:', payload);
          
          // If this is the AI ready message, update state
          if (payload.includes('AI Brain activated')) {
            setIsReady(true);
          }
          
          // Resolve any pending command
          const pendingCommand = commandQueueRef.current.get(commandIdRef.current);
          if (pendingCommand) {
            pendingCommand.resolve(payload);
            commandQueueRef.current.delete(commandIdRef.current);
          }
          break;

        case 'ERROR':
          console.error('[useAI] Error:', payload);
          
          // Reject any pending command
          const errorCommand = commandQueueRef.current.get(commandIdRef.current);
          if (errorCommand) {
            errorCommand.reject(new Error(payload));
            commandQueueRef.current.delete(commandIdRef.current);
          }
          break;
      }
    };

    worker.onerror = (error) => {
      console.error('[useAI] Worker error:', error);
    };

    workerRef.current = worker;

    // Cleanup
    return () => {
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

  const bootAI = async (): Promise<string> => {
    setLoadingProgress({ text: 'Initializing AI...', progress: 0 });
    return sendCommand({ type: 'BOOT_AI' });
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

  return {
    isReady,
    loadingProgress,
    aiOutput,
    bootAI,
    askAI,
    clearOutput,
  };
}
