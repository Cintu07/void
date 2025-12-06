/**
 * AI Web Worker
 * 
 * Runs LLM via WebGPU in a separate thread
 * to avoid blocking the UI or Python Kernel.
 * 
 * Model: Llama-3-8B-Instruct-q4f32_1-MLC (4GB)
 * Engine: WebLLM (MLC-LLM)
 * 
 * Version: 3.0.0 (Dec 6, 2025 - GPU mode)
 */

import * as webllm from '@mlc-ai/web-llm';

let engine: webllm.MLCEngine | null = null;
let isBooting = false;

console.log('[AI Worker] VOID AI Worker v3.0.0 - GPU mode initialized');

// Message types
interface AICommand {
  type: 'BOOT_AI' | 'GENERATE';
  payload?: any;
}

interface AIResponse {
  type: 'RESPONSE' | 'PROGRESS' | 'AI_OUTPUT' | 'ERROR';
  payload: any;
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
        
        console.log('[AI Worker] BOOT_AI command received, starting download...');

        // Send initial progress
        self.postMessage({
          type: 'PROGRESS',
          payload: { text: 'Initializing WebGPU...', progress: 0.01 }
        });

        try {
          // Initialize WebLLM engine with progress callback
          const selectedModel = 'Llama-3-8B-Instruct-q4f32_1-MLC';
          
          const initProgressCallback = (report: webllm.InitProgressReport) => {
            console.log('[AI Worker] Progress:', report);
            
            let progressPercent = report.progress;
            let progressText = report.text;
            
            // Send progress updates to UI
            self.postMessage({
              type: 'PROGRESS',
              payload: {
                text: progressText,
                progress: progressPercent,
              },
            });
          };

          engine = await webllm.CreateMLCEngine(selectedModel, {
            initProgressCallback: initProgressCallback,
          });

          console.log('[AI Worker] Engine initialized successfully');
        } catch (error) {
          console.error('[AI Worker] Engine initialization error:', error);
          isBooting = false;
          throw error;
        }

        isBooting = false;

        // Send completion
        self.postMessage({
          type: 'PROGRESS',
          payload: { text: 'Model loaded!', progress: 1 }
        });

        const response: AIResponse = {
          type: 'RESPONSE',
          payload: 'AI Brain activated! Llama-3 ready (GPU mode).',
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
  }
};

// Log when worker is ready
console.log('[AI Worker] Ready to receive commands');
