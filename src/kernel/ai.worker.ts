/**
 * AI Web Worker
 * 
 * Runs LLM via WebGPU in a separate thread
 * to avoid blocking the UI or Python Kernel.
 * 
 * Model: Llama-3-8B-Instruct-q4f32_1-MLC (4GB)
 * Engine: WebLLM (MLC-LLM)
 * 
 * Version: 3.2.0 (Dec 11, 2025 - GPU detection + cache fallback)
 */

import * as webllm from '@mlc-ai/web-llm';

let engine: webllm.MLCEngine | null = null;
let isBooting = false;
let cacheMode: 'persistent' | 'ram-only' = 'persistent';

console.log('[AI Worker] VOID AI Worker v3.2.0 - GPU mode initialized');

// Message types
interface AICommand {
  type: 'BOOT_AI' | 'GENERATE';
  payload?: any;
}

interface AIResponse {
  type: 'RESPONSE' | 'PROGRESS' | 'AI_OUTPUT' | 'ERROR';
  payload: any;
}

/**
 * Check WebGPU availability before attempting to load model
 */
async function checkWebGPUSupport(): Promise<{ supported: boolean; error?: string }> {
  try {
    if (!navigator.gpu) {
      return {
        supported: false,
        error: 'WebGPU not available in this browser. Please use Chrome 113+ or Edge 113+.',
      };
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return {
        supported: false,
        error: 'No compatible GPU found. Your GPU may not support WebGPU, or drivers need updating.',
      };
    }

    console.log('[AI Worker] WebGPU adapter found:', adapter.name);
    return { supported: true };
    
  } catch (error) {
    return {
      supported: false,
      error: `WebGPU check failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Boot engine with graceful fallback for restricted environments
 * Try 1: Persistent cache (IndexedDB)
 * Try 2: RAM-only mode (if IDBFS mount fails)
 */
async function bootEngine(
  selectedModel: string,
  progressCallback: (report: webllm.InitProgressReport) => void
): Promise<webllm.MLCEngine> {
  
  // Try 1: Standard mode with persistent cache
  try {
    console.log('[AI Worker] Attempting boot with persistent cache...');
    
    const engine = await webllm.CreateMLCEngine(selectedModel, {
      initProgressCallback: (report) => {
        // Prefix with cache mode indicator
        const modifiedReport = {
          ...report,
          text: `[Cached] ${report.text}`,
        };
        progressCallback(modifiedReport);
      },
    });
    
    cacheMode = 'persistent';
    console.log('[AI Worker] Boot successful with persistent cache');
    return engine;
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn('[AI Worker] Persistent cache failed:', errorMsg);
    
    // Check if error is IDBFS-related
    const isStorageError = 
      errorMsg.includes('filesystem') ||
      errorMsg.includes('mount') ||
      errorMsg.includes('IDBFS') ||
      errorMsg.includes('IndexedDB') ||
      errorMsg.includes('illegal path');
    
    if (!isStorageError) {
      // Not a storage issue, rethrow
      throw error;
    }
    
    // Try 2: Fallback to RAM-only mode
    console.log('[AI Worker] Falling back to RAM-only mode (Incognito/Privacy mode detected)');
    
    // Send warning to UI
    self.postMessage({
      type: 'PROGRESS',
      payload: {
        text: '[Warning] Persistent cache unavailable. Using RAM-only mode...',
        progress: 0.05,
      },
    });
    
    try {
      const engine = await webllm.CreateMLCEngine(selectedModel, {
        initProgressCallback: (report) => {
          // Prefix with RAM-only indicator
          const modifiedReport = {
            ...report,
            text: `[RAM-only] ${report.text}`,
          };
          progressCallback(modifiedReport);
        },
        appConfig: {
          useIndexedDBCache: false, // Disable IndexedDB
        },
      });
      
      cacheMode = 'ram-only';
      console.log('[AI Worker] Boot successful in RAM-only mode');
      
      // Warn user about implications
      self.postMessage({
        type: 'PROGRESS',
        payload: {
          text: '[Info] RAM-only mode: Model will re-download on page refresh',
          progress: 0.1,
        },
      });
      
      return engine;
      
    } catch (ramError) {
      console.error('[AI Worker] RAM-only mode also failed:', ramError);
      throw new Error(
        `Failed to initialize AI in both persistent and RAM-only modes. ` +
        `Original error: ${errorMsg}. ` +
        `Fallback error: ${ramError instanceof Error ? ramError.message : String(ramError)}`
      );
    }
  }
}

// Worker message handler
self.onmessage = async (event: MessageEvent<AICommand>) => {
  const { type, payload } = event.data;
  
  console.log('[AI Worker] Received command:', type);

  try {
    switch (type) {
      case 'BOOT_AI': {
        if (engine) {
          const response: AIResponse = {
            type: 'RESPONSE',
            payload: 'AI already loaded',
          };
          self.postMessage(response);
          break;
        }

        if (isBooting) {
          const response: AIResponse = {
            type: 'RESPONSE',
            payload: 'AI is currently loading...',
          };
          self.postMessage(response);
          break;
        }

        isBooting = true;
        
        console.log('[AI Worker] BOOT_AI command received, checking WebGPU support...');

        // Step 1: Check WebGPU support first
        self.postMessage({
          type: 'PROGRESS',
          payload: { text: 'Checking GPU compatibility...', progress: 0.01 }
        });

        const gpuCheck = await checkWebGPUSupport();
        if (!gpuCheck.supported) {
          isBooting = false;
          
          // Send detailed error to UI
          const errorMsg = 
            `GPU NOT SUPPORTED\n\n` +
            `${gpuCheck.error}\n\n` +
            `Solutions:\n` +
            `1. Update your browser to Chrome 113+ or Edge 113+\n` +
            `2. Update GPU drivers from manufacturer website\n` +
            `3. Check if your GPU supports WebGPU: https://webgpureport.org\n` +
            `4. Use a different computer with a compatible GPU\n\n` +
            `Note: The Python IDE will still work without AI features.`;
          
          throw new Error(errorMsg);
        }

        console.log('[AI Worker] WebGPU supported, proceeding with model download...');

        // Step 2: Initialize WebGPU
        self.postMessage({
          type: 'PROGRESS',
          payload: { text: 'Initializing WebGPU...', progress: 0.02 }
        });

        try {
          const selectedModel = 'Llama-3-8B-Instruct-q4f32_1-MLC';
          
          const initProgressCallback = (report: webllm.InitProgressReport) => {
            console.log('[AI Worker] Progress:', report);
            
            // Send progress updates to UI (already prefixed by bootEngine)
            self.postMessage({
              type: 'PROGRESS',
              payload: {
                text: report.text,
                progress: report.progress,
              },
            });
          };

          // Use graceful fallback boot
          engine = await bootEngine(selectedModel, initProgressCallback);

          console.log('[AI Worker] Engine initialized successfully');
          
          // Verify engine is still valid after initialization
          if (!engine) {
            throw new Error('Engine initialized but became null');
          }
          
        } catch (error) {
          console.error('[AI Worker] Engine initialization error:', error);
          isBooting = false;
          
          // Clean up any partial state
          engine = null;
          
          // Check if it's the WASM instance error
          const errorMsg = error instanceof Error ? error.message : String(error);
          if (errorMsg.includes('external Instance reference') || errorMsg.includes('WASM')) {
            throw new Error(
              `WebGPU/WASM initialization failed. This can happen on systems with limited GPU support.\n\n` +
              `Try:\n` +
              `1. Refresh the page and try again\n` +
              `2. Close other GPU-heavy tabs/apps\n` +
              `3. Restart your browser\n` +
              `4. Update your GPU drivers\n\n` +
              `Original error: ${errorMsg}`
            );
          }
          
          throw error;
        }

        isBooting = false;

        // Send completion with cache mode info
        const cacheInfo = cacheMode === 'persistent' 
          ? '(Model cached for future use)' 
          : '(RAM-only: Will re-download on refresh)';
        
        self.postMessage({
          type: 'PROGRESS',
          payload: { text: `Model loaded! ${cacheInfo}`, progress: 1 }
        });

        const response: AIResponse = {
          type: 'RESPONSE',
          payload: `AI Brain activated! Llama-3 ready (GPU mode, ${cacheMode}).`,
        };
        self.postMessage(response);
        break;
      }

      case 'GENERATE': {
        if (!engine) {
          throw new Error('AI not initialized. Call BOOT_AI first.');
        }

        const { prompt } = payload as { prompt: string };
        
        console.log('[AI Worker] Generating response for:', prompt);
        
        try {
          // Format messages for Llama-3
          const messages: webllm.ChatCompletionMessageParam[] = [
          { role: 'system', content: 'You are a helpful Python coding assistant.' },
          { role: 'user', content: prompt },
        ];

        // Generate response with streaming
        const chunks = await engine.chat.completions.create({
          messages,
          temperature: 0.7,
          max_tokens: 256,
          stream: true,
        });

        let fullResponse = '';
        for await (const chunk of chunks) {
          const delta = chunk.choices[0]?.delta?.content || '';
          if (delta) {
            fullResponse += delta;
            // Stream each chunk back to UI
            self.postMessage({
              type: 'AI_OUTPUT',
              payload: delta,
            });
          }
        }

        console.log('[AI Worker] Generation complete');
        
        // Send final response
        const finalResponse: AIResponse = {
          type: 'RESPONSE',
          payload: fullResponse,
        };
        self.postMessage(finalResponse);
        
        } catch (genError) {
          console.error('[AI Worker] Generation error:', genError);
          
          const errorMsg = genError instanceof Error ? genError.message : String(genError);
          if (errorMsg.includes('external Instance reference') || errorMsg.includes('WASM')) {
            throw new Error(
              `AI engine lost connection. The model may be corrupted or GPU memory exhausted.\n\n` +
              `Please refresh the page and activate the AI brain again.`
            );
          }
          
          throw genError;
        }
        break;
      }

      default:
        throw new Error(`Unknown command: ${type}`);
    }
  } catch (error) {
    console.error('[AI Worker] Error:', error);
    
    const errorResponse: AIResponse = {
      type: 'ERROR',
      payload: error instanceof Error ? error.message : 'Unknown error',
    };
    self.postMessage(errorResponse);
    
    isBooting = false;
    
    // If it's a WASM error, clear the engine to force re-initialization
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('external Instance reference') || errorMsg.includes('WASM')) {
      engine = null;
    }
  }
};

// Log when worker is ready
console.log('[AI Worker] Ready to receive commands');
