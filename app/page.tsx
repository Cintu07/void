'use client';

import { useEffect, useState, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import { useKernel } from '../src/hooks/useKernel';
import { useAI } from '../src/hooks/useAI';
import { Terminal, TerminalHandle } from '../src/ui/Terminal';
import CodeEditor from '../src/ui/Editor';
import { Sidebar } from '../src/components/layout/Sidebar';
import { SettingsDialog } from '../src/components/ui/SettingsDialog';
import { AboutDialog } from '../src/components/ui/AboutDialog';
import { useFileSystem } from '../src/store/fileSystem';
import { useSettings } from '../src/store/settings';
import { Settings, HelpCircle } from 'lucide-react';

export default function Home() {
  const [status, setStatus] = useState<string>('BOOTING...');
  const [pythonCode, setPythonCode] = useState<string>('# Loading...');
  const [pythonLoaded, setPythonLoaded] = useState(false);
  const [lastOutputIndex, setLastOutputIndex] = useState(0);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const kernel = useKernel();
  const ai = useAI();
  const terminalRef = useRef<TerminalHandle>(null);
  const editorValueRef = useRef<string>('');
  const { currentFile, updateFileContent } = useFileSystem();
  const { aiMode } = useSettings();
  
  // References to handler functions for keyboard shortcuts
  const handleRunRef = useRef<() => void>(() => {});
  const handleSaveRef = useRef<() => void>(() => {});
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F5 - Run
      if (e.key === 'F5') {
        e.preventDefault();
        e.stopPropagation();
        handleRunRef.current();
      }
      // Ctrl+S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        e.stopPropagation();
        handleSaveRef.current();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  useEffect(() => {
    async function boot() {
      try {
        // Boot the kernel (initializes file system in worker)
        const bootMsg = await kernel.boot();
        setStatus(bootMsg);

        // Pre-load Python runtime in background
        setStatus('Loading Python runtime...');
        try {
          await kernel.bootPython();
          setPythonLoaded(true);
          setStatus('Ready');
        } catch (pyErr) {
          console.warn('Python preload failed, will retry on run:', pyErr);
          setStatus('Ready (Python will load on first run)');
        }

        // Try to load /main.py from file system
        try {
          const data = await kernel.readFile('/main.py');
          if (data && data.length > 0) {
            const code = new TextDecoder().decode(data);
            console.log('Loaded from /main.py:', code);
            setPythonCode(code);
            editorValueRef.current = code;
            return; // Successfully loaded
          }
        } catch (err) {
          console.log('No saved file, using default');
        }
        
        // Default code if file doesn't exist
        const defaultCode = '# Welcome to VOID IDE\n# Write your Python code here\n\nprint("Hello from VOID!")';
        setPythonCode(defaultCode);
        editorValueRef.current = defaultCode;
      } catch (error) {
        console.error('Boot error:', error);
        setStatus(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Set default code even on error
        const defaultCode = '# Welcome to VOID IDE\nprint("Hello, World!")';
        setPythonCode(defaultCode);
        editorValueRef.current = defaultCode;
      }
    }

    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Handle terminal output from kernel
  useEffect(() => {
    // Write only new output since last render
    if (kernel.terminalOutput.length > lastOutputIndex) {
      const newOutput = kernel.terminalOutput.slice(lastOutputIndex);
      newOutput.forEach(line => {
        terminalRef.current?.write(line);
      });
      setLastOutputIndex(kernel.terminalOutput.length);
    }
  }, [kernel.terminalOutput, lastOutputIndex]);

  // Handle AI output streaming to terminal
  useEffect(() => {
    if (ai.aiOutput.length > 0) {
      const latestChunk = ai.aiOutput[ai.aiOutput.length - 1];
      // Convert \n to \r\n for proper terminal newlines
      const formattedChunk = latestChunk.replace(/\n/g, '\r\n');
      terminalRef.current?.write(formattedChunk);
    }
  }, [ai.aiOutput]);

  const handleEditorChange = (code: string) => {
    editorValueRef.current = code;
    setPythonCode(code);
    if (currentFile) {
      updateFileContent(currentFile.path, code);
    }
  };

  const handleSaveFile = async () => {
    if (!kernel.isReady) return;
    try {
      const code = editorValueRef.current || pythonCode;
      const data = new TextEncoder().encode(code);
      
      // Save to /main.py
      await kernel.writeFile('/main.py', data);
      terminalRef.current?.write(`\r\n Saved /main.py (${data.length} bytes)\r\n`);
      setStatus(`File saved: ${data.length} bytes`);
    } catch (error) {
      const errorMsg = `SAVE ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setStatus(errorMsg);
      terminalRef.current?.write(`\r\n ${errorMsg}\r\n`);
    }
  };

  const handleWriteFile = async () => {
    try {
      const timestamp = new Date().toISOString();
      const content = `Hello from VOID IDE! Written at ${timestamp}`;
      const data = new TextEncoder().encode(content);
      
      // Write file through kernel worker
      const result = await kernel.writeFile('/hello.txt', data);
      terminalRef.current?.write(`\r\n${result}\r\n`);
      setStatus(result);
    } catch (error) {
      setStatus(`WRITE ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRunPython = async () => {
    if (!kernel.isReady) return;
    try {
      terminalRef.current?.clear();
      setLastOutputIndex(0); // Reset output tracking
      
      // Get current code from editor
      const code = editorValueRef.current;
      
      // Save to /main.py before running
      const data = new TextEncoder().encode(code);
      await kernel.writeFile('/main.py', data);
      
      // Load Python if not already loaded
      if (!pythonLoaded) {
        setStatus('Loading Python runtime...');
        terminalRef.current?.write('Loading Python runtime from CDN...\r\n');
        await kernel.bootPython();
        setPythonLoaded(true);
        setStatus('Python runtime loaded');
        terminalRef.current?.write('Python loaded!\r\n\r\n');
      }

      setStatus('Executing Python...');
      terminalRef.current?.write(`\r\n▶ Running /main.py...\r\n\r\n`);
      
      const result = await kernel.runPython(code);
      
      if (result) {
        terminalRef.current?.write(`${result}\r\n`);
      }
      
      terminalRef.current?.write(`\r\n Execution complete\r\n`);
      setStatus('Python executed');
    } catch (error) {
      const errorMsg = `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setStatus(errorMsg);
      terminalRef.current?.write(`\r\n${errorMsg}\r\n`);
    }
  };

  // Update refs for keyboard shortcuts
  useEffect(() => {
    handleRunRef.current = handleRunPython;
    handleSaveRef.current = handleSaveFile;
  }, [kernel.isReady, pythonLoaded, currentFile]);

  const handleActivateBrain = async () => {
    try {
      setStatus('Activating AI Brain...');
      const modeText = aiMode === 'gpu' ? 'GPU' : 'CPU';
      terminalRef.current?.write(`\r\n Checking ${modeText} compatibility...\r\n`);
      
      const result = await ai.bootAI(aiMode);
      
      setStatus('AI Brain Ready!');
      terminalRef.current?.write(`\r\n ${result}\r\n`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setStatus('AI Activation Failed');
      
      // Format multi-line error messages properly
      const formattedError = errorMsg.split('\n').map(line => `\r\n${line}`).join('');
      terminalRef.current?.write(`\r\n=== AI ACTIVATION FAILED ===${formattedError}\r\n`);
    }
  };

  const handleAskAI = async () => {
    if (!aiPrompt.trim()) return;
    
    try {
      setStatus('AI thinking...');
      terminalRef.current?.write(`\r\n You: ${aiPrompt}\r\n`);
      terminalRef.current?.write(` AI: `);
      
      ai.clearOutput();
      await ai.askAI(aiPrompt);
      
      setStatus('AI response complete');
      terminalRef.current?.write(`\r\n`);
      setAiPrompt(''); // Clear input
    } catch (error) {
      const errorMsg = `AI ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setStatus(errorMsg);
      terminalRef.current?.write(`\r\n ${errorMsg}\r\n`);
    }
  };

  const handlePauseAI = () => {
    ai.terminateAI();
    setStatus('AI paused - resources freed');
    terminalRef.current?.write('\r\n⏸ AI paused to save resources\r\n');
  };

  const handleDeleteModel = async () => {
    try {
      // Delete from IndexedDB cache
      if (indexedDB.databases) {
        const databases = await indexedDB.databases();
        for (const db of databases) {
          if (db.name?.includes('webllm') || db.name?.includes('mlc')) {
            await new Promise<void>((resolve, reject) => {
              const request = indexedDB.deleteDatabase(db.name!);
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            });
          }
        }
      }
      // Also try to clear cache storage
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          if (key.includes('webllm') || key.includes('transformers')) {
            await caches.delete(key);
          }
        }
      }
      ai.terminateAI();
      setStatus('AI model deleted from storage');
      terminalRef.current?.write('\r\n🗑 AI model deleted from browser storage\r\n');
    } catch (error) {
      console.error('Failed to delete model:', error);
      setStatus('Error deleting model');
      terminalRef.current?.write('\r\n⚠ Error deleting model\r\n');
    }
  };

  const handleModeChange = () => {
    // Reset AI when mode changes so user has to activate again
    if (ai?.resetAI) {
      ai.resetAI();
    }
    setStatus('AI mode changed - click Activate Brain to use new mode');
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      <Toaster position="top-right" />
      
      {/* Sidebar */}
      <Sidebar onFileSelect={(file) => {
        setPythonCode(file.content || '');
        editorValueRef.current = file.content || '';
      }} />
      
      {/* Settings Dialog */}
      <SettingsDialog 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)}
        aiReady={ai.isReady}
        onPauseAI={handlePauseAI}
        onDeleteModel={handleDeleteModel}
        onModeChange={handleModeChange}
      />
      
      {/* About Dialog */}
      <AboutDialog
        isOpen={aboutOpen}
        onClose={() => setAboutOpen(false)}
      />
      
      <div className="p-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold mb-2">VOID IDE</h1>
            <p className="text-sm text-gray-500">{status}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAboutOpen(true)}
              className="p-2 hover:bg-gray-800 rounded transition-colors"
              title="About & Documentation"
            >
              <HelpCircle className="w-5 h-5 text-green-400" />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 hover:bg-gray-800 rounded transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
        
        {/* AI Loading Progress */}
        {!ai.isReady && ai.loadingProgress.progress >= 0 && (
          <div className="mb-4 flex-shrink-0">
            <div className="text-xs text-gray-400 mb-1">{ai.loadingProgress.text}</div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${ai.loadingProgress.progress * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {Math.round(ai.loadingProgress.progress * 100)}% complete
            </div>
          </div>
        )}

        {/* Control buttons - ALWAYS VISIBLE */}
        <div className="mb-4 flex gap-4 flex-wrap flex-shrink-0">
          <button
            onClick={handleRunPython}
            disabled={!kernel.isReady}
            className="bg-cyan-400 text-black px-6 py-3 rounded font-bold hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            RUN (F5)
          </button>
          
          <button
            onClick={handleSaveFile}
            disabled={!kernel.isReady}
            className="bg-blue-400 text-black px-6 py-3 rounded font-bold hover:bg-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            SAVE (Ctrl+S)
          </button>
          
          <button
            onClick={handleWriteFile}
            disabled={!kernel.isReady}
            className="bg-green-400 text-black px-6 py-3 rounded font-bold hover:bg-green-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            TEST FS
          </button>
          
          <button
            onClick={handleActivateBrain}
            disabled={ai.isReady}
            className="bg-purple-500 text-white px-6 py-3 rounded font-bold hover:bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors relative"
          >
            {ai.isReady ? 'BRAIN ACTIVE' : 'ACTIVATE BRAIN'}
            <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-bold bg-yellow-500 text-black rounded">
              BETA
            </span>
          </button>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-2 gap-4" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
          {/* Left: Monaco Editor (50%) */}
          <div className="border border-green-700 rounded overflow-hidden">
            <CodeEditor 
              initialCode={pythonCode} 
              onChange={handleEditorChange}
              language={currentFile?.language || 'python'}
            />
          </div>

          {/* Right: Terminal + AI Chat (50%) */}
          <div className="flex flex-col gap-4">
            <div className="border border-green-700 rounded overflow-hidden flex-1">
              <Terminal ref={terminalRef} />
            </div>
            
            {/* AI Chat Box */}
            {ai.isReady && (
              <div className="border border-purple-500 rounded p-4 bg-gray-900 h-48 overflow-y-auto">
                <div className="text-xs text-purple-400 mb-2">AI ASSISTANT</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAskAI()}
                    placeholder="Ask AI: 'Write a function to...', 'Explain this code', etc."
                    className="flex-1 bg-black text-green-400 px-3 py-2 rounded border border-purple-700 focus:border-purple-500 focus:outline-none text-sm"
                  />
                  <button
                    onClick={handleAskAI}
                    disabled={!aiPrompt.trim()}
                    className="bg-purple-500 text-white px-4 py-2 rounded font-bold hover:bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    SEND
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}