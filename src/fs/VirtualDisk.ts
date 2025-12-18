/**
 * VirtualDisk: In-Memory File System with IndexedDB Persistence
 * 
 * ARCHITECTURE:
 * - Sync Layer: All reads/writes happen to a Map (instant)
 * - Async Layer: Background flush to IndexedDB (periodic)
 * - No await inside sync operations (WASM-safe)
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface VoidFSSchema extends DBSchema {
  files: {
    key: string; // file path
    value: {
      path: string;
      data: Uint8Array;
      modified: number;
    };
  };
}

export class VirtualDisk {
  private memory: Map<string, Uint8Array> = new Map();
  private dirty: Set<string> = new Set();
  private db: IDBPDatabase<VoidFSSchema> | null = null;
  private flushInterval: any = null;
  private isReady = false;

  /**
   * Initialize the Virtual Disk
   * Loads all files from IndexedDB into memory
   */
  async init(): Promise<void> {
    // Open IndexedDB
    this.db = await openDB<VoidFSSchema>('void-fs', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'path' });
        }
      },
    });

    // Load all files into memory
    const tx = this.db.transaction('files', 'readonly');
    const store = tx.objectStore('files');
    const allFiles = await store.getAll();

    for (const file of allFiles) {
      this.memory.set(file.path, file.data);
    }

    await tx.done;

    // Start background flush (every 2 seconds)
    // Use globalThis instead of window for worker compatibility
    this.flushInterval = globalThis.setInterval(() => {
      this.flush();
    }, 2000) as any;

    this.isReady = true;
    console.log(`[VirtualDisk] Loaded ${this.memory.size} files from IndexedDB`);
  }

  /**
   * Check if the disk is ready
   */
  ready(): boolean {
    return this.isReady;
  }

  /**
   * Wait for the disk to finish booting
   * Convenience method for UI initialization
   */
  async waitForBoot(): Promise<void> {
    if (this.isReady) return;
    await this.init();
  }

  /**
   * SYNC READ: Get file contents from memory
   * @throws Error if file doesn't exist
   */
  readFileSync(path: string): Uint8Array {
    if (!this.isReady) {
      throw new Error('[VirtualDisk] Disk not initialized. Call init() first.');
    }

    const data = this.memory.get(path);
    if (!data) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }

    // Return a copy to prevent external mutation
    return new Uint8Array(data);
  }

  /**
   * SYNC WRITE: Write file contents to memory
   * Marks file as dirty for background flush
   */
  writeFileSync(path: string, data: Uint8Array): void {
    if (!this.isReady) {
      throw new Error('[VirtualDisk] Disk not initialized. Call init() first.');
    }

    // Store a copy to prevent external mutation
    this.memory.set(path, new Uint8Array(data));
    this.dirty.add(path);
  }

  /**
   * SYNC CHECK: Does file exist?
   */
  existsSync(path: string): boolean {
    return this.memory.has(path);
  }

  /**
   * SYNC DELETE: Remove file from memory
   */
  unlinkSync(path: string): void {
    if (!this.isReady) {
      throw new Error('[VirtualDisk] Disk not initialized. Call init() first.');
    }

    if (!this.memory.has(path)) {
      throw new Error(`ENOENT: no such file or directory, unlink '${path}'`);
    }

    this.memory.delete(path);
    this.dirty.add(path); // Mark for deletion in DB
  }

  /**
   * List all file paths
   */
  listFiles(): string[] {
    return Array.from(this.memory.keys());
  }

  /**
   * SYNC: List directory contents (like fs.readdirSync)
   * Returns array of filenames in the directory
   */
  readdirSync(dirPath: string): string[] {
    // Handle root directory
    if (!dirPath || dirPath === '/') {
      const entries = new Set<string>();
      for (const path of this.memory.keys()) {
        const firstPart = path.split('/').filter(Boolean)[0];
        if (firstPart) entries.add(firstPart);
      }
      return Array.from(entries);
    }
    
    const normalizedDir = dirPath.endsWith('/') ? dirPath.slice(0, -1) : dirPath;
    const entries = new Set<string>();
    
    for (const path of this.memory.keys()) {
      // Check if file is in this directory
      if (path.startsWith(normalizedDir + '/')) {
        const relativePath = path.slice(normalizedDir.length + 1);
        const firstPart = relativePath.split('/')[0];
        if (firstPart) {
          entries.add(firstPart);
        }
      }
    }
    
    return Array.from(entries);
  }

  /**
   * SYNC: Get file/directory stats (like fs.statSync)
   * Returns an object with isDirectory() method
   */
  statSync(path: string): { isDirectory: () => boolean; size: number } {
    // Root directory is always a directory
    if (!path || path === '/') {
      return {
        isDirectory: () => true,
        size: 0,
      };
    }
    
    const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path;
    
    // Check if it's a file
    if (this.memory.has(normalizedPath)) {
      const data = this.memory.get(normalizedPath)!;
      return {
        isDirectory: () => false,
        size: data.byteLength,
      };
    }
    
    // Check if it's a directory (any file starts with this path)
    for (const filePath of this.memory.keys()) {
      if (filePath.startsWith(normalizedPath + '/')) {
        return {
          isDirectory: () => true,
          size: 0,
        };
      }
    }
    
    throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
  }

  /**
   * Get disk statistics
   */
  stats(): { fileCount: number; dirtyCount: number; totalBytes: number } {
    let totalBytes = 0;
    for (const data of this.memory.values()) {
      totalBytes += data.byteLength;
    }

    return {
      fileCount: this.memory.size,
      dirtyCount: this.dirty.size,
      totalBytes,
    };
  }

  /**
   * ASYNC FLUSH: Persist dirty files to IndexedDB
   * Called automatically by background interval
   */
  private async flush(): Promise<void> {
    if (!this.db || this.dirty.size === 0) return;

    const paths = Array.from(this.dirty);
    this.dirty.clear();

    const tx = this.db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');

    for (const path of paths) {
      const data = this.memory.get(path);
      
      if (data) {
        // File exists in memory - update DB
        await store.put({
          path,
          data,
          modified: Date.now(),
        });
      } else {
        // File was deleted - remove from DB
        await store.delete(path);
      }
    }

    await tx.done;
    console.log(`[VirtualDisk] Flushed ${paths.length} files to IndexedDB`);
  }

  /**
   * Force immediate flush of all dirty files
   */
  async forceFlush(): Promise<void> {
    await this.flush();
  }

  /**
   * Shutdown: Stop background flush and persist all changes
   */
  async shutdown(): Promise<void> {
    if (this.flushInterval !== null) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    await this.flush();
    this.db?.close();
    this.isReady = false;
    console.log('[VirtualDisk] Shutdown complete');
  }
}

// Singleton instance
let diskInstance: VirtualDisk | null = null;

/**
 * Get the global VirtualDisk instance
 */
export function getDisk(): VirtualDisk {
  if (!diskInstance) {
    diskInstance = new VirtualDisk();
  }
  return diskInstance;
}
