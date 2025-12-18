/**
 * AI Web Worker
 * 
 * Runs LLM in a separate thread (GPU or CPU mode)
 * to avoid blocking the UI or Python Kernel.
 * 
 * GPU Mode: Llama-3-8B (4GB, WebGPU required)
 * CPU Mode: Qwen2-0.5B (300MB, works on any device)
 * 
 * Version: 3.3.0 (Dec 12, 2025 - Dual mode: GPU + CPU)
 */

import * as webllm from '@mlc-ai/web-llm';

let engine: webllm.MLCEngine | null = null;
let isBooting = false;
let cacheMode: 'persistent' | 'ram-only' = 'persistent';
let currentMode: 'gpu' | 'cpu' = 'gpu'; // Default to GPU, fallback to CPU
let loadedModelName: string | null = null; // Track which model is currently loaded

console.log('[AI Worker] VOID AI Worker v3.3.0 - Dual mode (GPU/CPU) initialized');

// Message types
interface AICommand {
  type: 'BOOT_AI' | 'GENERATE';
  payload?: any;
  mode?: 'gpu' | 'cpu'; // User-selected mode
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
    // Check for WebGPU support
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gpu = (navigator as any).gpu;
    if (!gpu) {
      return {
        supported: false,
        error: 'WebGPU not available in this browser. Please use Chrome 113+ or Edge 113+.',
      };
    }

    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      return {
        supported: false,
        error: 'No compatible GPU found. Your GPU may not support WebGPU, or drivers need updating.',
      };
    }

    console.log('[AI Worker] WebGPU adapter found');
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
        // Disable IndexedDB cache for RAM-only mode
        // @ts-expect-error - webllm types may not include this option
        appConfig: {
          useIndexedDBCache: false,
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
  const { type, payload, mode } = event.data;
  
  console.log('[AI Worker] Received command:', type, 'Mode:', mode);

  try {
    switch (type) {
      case 'BOOT_AI': {
        // Get requested mode from event data (default to GPU if not specified)
        const requestedMode = mode || 'gpu';
        
        // Select model based on mode
        const selectedModel = requestedMode === 'gpu' 
          ? 'Llama-3-8B-Instruct-q4f32_1-MLC'  // 4GB GPU model
          : 'Qwen2-0.5B-Instruct-q4f16_1-MLC';   // 300MB CPU model
        
        console.log(`[AI Worker] Requested mode: ${requestedMode}, Selected model: ${selectedModel}, Currently loaded: ${loadedModelName || 'none'}`);
        
        // Check if we need to switch models
        if (engine && loadedModelName === selectedModel) {
          const response: AIResponse = {
            type: 'RESPONSE',
            payload: `AI already loaded (${requestedMode.toUpperCase()} mode)`,
          };
          self.postMessage(response);
          break;
        }
        
        // If different model is requested, unload current engine
        if (engine && loadedModelName !== selectedModel) {
          console.log(`[AI Worker] Switching from ${loadedModelName} to ${selectedModel}`);
          self.postMessage({
            type: 'PROGRESS',
            payload: { text: 'Unloading previous model...', progress: 0.01 }
          });
          
          try {
            await engine.unload();
            console.log('[AI Worker] Previous model unloaded successfully');
            engine = null;
            loadedModelName = null;
          } catch (err) {
            console.error('[AI Worker] Error unloading engine:', err instanceof Error ? err.message : err);
            // Force cleanup even on error
            engine = null;
            loadedModelName = null;
          }
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
        currentMode = requestedMode;
        
        console.log(`[AI Worker] BOOT_AI command received, mode: ${currentMode}, model: ${selectedModel}`);

        // Step 1: Check WebGPU support first (only for GPU mode)
        if (currentMode === 'gpu') {
          self.postMessage({
            type: 'PROGRESS',
            payload: { text: 'Checking GPU compatibility...', progress: 0.01 }
          });

          const gpuCheck = await checkWebGPUSupport();
          if (!gpuCheck.supported) {
            isBooting = false;
            
            // Suggest CPU mode instead
            const errorMsg = 
              `GPU NOT AVAILABLE\n\n` +
              `${gpuCheck.error}\n\n` +
              `SUGGESTION: Try CPU mode instead!\n` +
              `CPU mode uses a smaller model (300MB) that works on any device.\n` +
              `It's slower but doesn't require a GPU.\n\n` +
              `Click the toggle to switch to CPU mode and try again.`;
            
            throw new Error(errorMsg);
          }
        }

        console.log('[AI Worker] Starting model download...');

        // Step 2: Initialize with selected mode
        self.postMessage({
          type: 'PROGRESS',
          payload: { 
            text: currentMode === 'gpu' ? 'Initializing GPU...' : 'Initializing CPU mode...', 
            progress: 0.02 
          }
        });

        try {
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

          // Use graceful fallback boot with the selectedModel from above
          engine = await bootEngine(selectedModel, initProgressCallback);

          console.log('[AI Worker] Engine initialized successfully');
          
          // Track which model was loaded
          loadedModelName = selectedModel;
          
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

        // Send completion with cache mode info and correct model name
        const cacheInfo = cacheMode === 'persistent' 
          ? '(Model cached for future use)' 
          : '(RAM-only: Will re-download on refresh)';
        
        self.postMessage({
          type: 'PROGRESS',
          payload: { text: `Model loaded! ${cacheInfo}`, progress: 1 }
        });

        const modelDisplayName = currentMode === 'gpu' ? 'Llama-3 (4GB)' : 'Qwen2 (300MB)';
        const response: AIResponse = {
          type: 'RESPONSE',
          payload: `AI Brain activated! ${modelDisplayName} ready (${currentMode.toUpperCase()} mode, ${cacheMode}).`,
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
          // System prompt - simple and direct
          const systemPrompt = `You are a concise Python coding assistant. Answer directly without repeating the question. Do not prefix your response with labels like "AI:" or "Assistant:".`;

          // Format messages differently based on model
          const messages: webllm.ChatCompletionMessageParam[] = currentMode === 'gpu'
            ? [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt },
              ]
            : [
                // Qwen - single user message with instructions
                { role: 'user', content: `${systemPrompt}\n\nQuestion: ${prompt}\n\nAnswer:` },
              ];

          // Generate response with streaming and proper parameters
          const chunks = await engine.chat.completions.create({
            messages,
            temperature: 0.5,  // Lower temp for more focused output
            max_tokens: 200,   // Shorter responses
            top_p: 0.9,
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
