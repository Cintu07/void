'use client';

import { useEffect, useState, useRef } from 'react';
import { useKernel } from '../src/hooks/useKernel';
import { useAI } from '../src/hooks/useAI';
import { Terminal, TerminalHandle } from '../src/ui/Terminal';
import CodeEditor from '../src/ui/Editor';

export default function Home() {
  const [status, setStatus] = useState<string>('BOOTING...');
  const [pythonCode, setPythonCode] = useState<string>('# Loading...');
  const [pythonLoaded, setPythonLoaded] = useState(false);
  const [lastOutputIndex, setLastOutputIndex] = useState(0);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const kernel = useKernel();
  // const ai = useAI(); // DISABLED: AI feature unstable, will re-enable in future version
  const ai = { isReady: false, loadingProgress: { progress: 0, text: '' }, bootAI: async () => {}, askAI: async () => {}, clearOutput: () => {} }; // Dummy AI object
  const terminalRef = useRef<TerminalHandle>(null);
  const editorValueRef = useRef<string>('');

  useEffect(() => {
    async function boot() {
      try {
        // Boot the kernel (initializes file system in worker)
        const bootMsg = await kernel.boot();
        setStatus(bootMsg);

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
      terminalRef.current?.write(latestChunk);
    }
  }, [ai.aiOutput]);

  const handleEditorChange = (code: string) => {
    editorValueRef.current = code;
    setPythonCode(code); // Keep state in sync for persistence
  };

  const handleSaveFile = async () => {
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

  const handleActivateBrain = async () => {
    try {
      setStatus('Activating AI Brain...');
      terminalRef.current?.write(`\r\n Checking GPU compatibility...\r\n`);
      
      const result = await ai.bootAI();
      
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

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">VOID IDE</h1>
        <p className="text-sm text-gray-500">{status}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 h-[calc(100vh-140px)]">
        {/* Left: Monaco Editor (50%) */}
        <div className="border border-green-700 rounded overflow-hidden">
          <CodeEditor 
            initialCode={pythonCode} 
            onChange={handleEditorChange}
          />
        </div>

        {/* Right: Terminal (50%) */}
        <div className="border border-green-700 rounded overflow-hidden flex flex-col">
          <Terminal ref={terminalRef} />
        </div>
      </div>

      {/* Control buttons */}
      <div className="mt-4 flex gap-4">
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
      </div>

      <div className="mt-4 text-xs text-gray-600">
        <div className="mb-2 text-gray-500 font-bold">VOID: The Zero-Trust Browser IDE</div>
        <div>• Write Python code in Monaco Editor → Execute with RUN → Save to IndexedDB</div>
        <div>• Your code and files stay on YOUR device - never sent to any servers</div>
        <div>• Fully offline-capable • Zero installation • Open source</div>
        <div className="mt-2 text-gray-700">Powered by: Pyodide (Python), Monaco Editor, XTerm.js, IndexedDB</div>
      </div>
    </div>
  );
}

