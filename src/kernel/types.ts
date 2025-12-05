/**
 * Kernel Message Types
 * 
 * Defines the protocol for communicating between the UI thread
 * and the Kernel Web Worker.
 */

// Command Types
export type KernelCommand = 
  | { type: 'BOOT' }
  | { type: 'BOOT_PYTHON' }
  | { type: 'EXEC'; payload: { cmd: string } }
  | { type: 'READ_FILE'; payload: { path: string } }
  | { type: 'WRITE_FILE'; payload: { path: string; content: Uint8Array } };

// Response Types
export type KernelResponse = 
  | { type: 'RESPONSE'; payload: any }
  | { type: 'TERMINAL_OUTPUT'; payload: string }
  | { type: 'ERROR'; payload: { message: string; stack?: string } };

// Combined message type for type safety
export type KernelMessage = KernelCommand | KernelResponse;
