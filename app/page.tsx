'use client';

import { useEffect, useState } from 'react';
import { useKernel } from '../src/hooks/useKernel';

export default function Home() {
  const [status, setStatus] = useState<string>('BOOTING...');
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [pythonCode, setPythonCode] = useState<string>('print(2 + 2)');
  const [pythonResult, setPythonResult] = useState<string>('');
  const [pythonLoaded, setPythonLoaded] = useState(false);
  const kernel = useKernel();

  useEffect(() => {
    async function boot() {
      try {
        // Boot the kernel (initializes file system in worker)
        const bootMsg = await kernel.boot();
        setStatus(bootMsg);

        // Try to load existing file
        const data = await kernel.readFile('/hello.txt');
        if (data) {
          const text = new TextDecoder().decode(data);
          setFileContent(text);
        }
      } catch (error) {
        setStatus(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleWriteFile = async () => {
    try {
      const timestamp = new Date().toISOString();
      const content = `Hello from VOID IDE! Written at ${timestamp}`;
      const data = new TextEncoder().encode(content);
      
      // Write file through kernel worker
      const result = await kernel.writeFile('/hello.txt', data);
      setFileContent(content);
      setStatus(result);
    } catch (error) {
      setStatus(`WRITE ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRunPython = async () => {
    try {
      // Load Python if not already loaded
      if (!pythonLoaded) {
        setStatus('Loading Python runtime...');
        await kernel.bootPython();
        setPythonLoaded(true);
        setStatus('Python runtime loaded');
      }

      setStatus('Executing Python...');
      const result = await kernel.runPython(pythonCode);
      setPythonResult(result);
      setStatus('Python executed');
    } catch (error) {
      setStatus(`PYTHON ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl mb-8 border-b border-green-400 pb-2">
          VOID IDE - PHASE 3: PYTHON RUNTIME
        </h1>

        <div className="mb-6">
          <div className="text-sm opacity-70">STATUS:</div>
          <div className="text-xl">{status}</div>
        </div>

        {/* Python Code Editor */}
        <div className="mb-8 p-4 border border-green-400 rounded">
          <div className="text-sm opacity-70 mb-2">PYTHON CODE:</div>
          <textarea
            value={pythonCode}
            onChange={(e) => setPythonCode(e.target.value)}
            className="w-full h-32 bg-black text-green-400 border border-green-700 rounded p-2 font-mono resize-none focus:outline-none focus:border-green-400"
            placeholder="Type Python code here..."
          />
        </div>

        {/* Python Output */}
        <div className="mb-8 p-4 border border-green-400 rounded">
          <div className="text-sm opacity-70 mb-2">OUTPUT:</div>
          <div className="min-h-[60px]">
            {kernel.terminalOutput.length > 0 && (
              <div className="text-cyan-400 mb-2">
                {kernel.terminalOutput.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}
            {pythonResult && (
              <div className="text-green-300">
                Result: {pythonResult}
              </div>
            )}
            {!pythonResult && kernel.terminalOutput.length === 0 && (
              <div className="text-yellow-400">No output yet</div>
            )}
          </div>
        </div>

        {/* File Section */}
        <div className="mb-8 p-4 border border-green-400 rounded">
          <div className="text-sm opacity-70 mb-2">FILE: /hello.txt</div>
          {fileContent ? (
            <div className="text-green-300">
              {fileContent}
            </div>
          ) : (
            <div className="text-yellow-400">No file written yet</div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={handleRunPython}
            disabled={!kernel.isReady}
            className="bg-cyan-400 text-black px-6 py-3 rounded font-bold hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            RUN PYTHON
          </button>

          <button
            onClick={handleWriteFile}
            disabled={!kernel.isReady}
            className="bg-green-400 text-black px-6 py-3 rounded font-bold hover:bg-green-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            WRITE FILE
          </button>
        </div>

        <div className="mt-8 text-xs opacity-50">
          <div>→ Type Python code (e.g., print(2 + 2))</div>
          <div>→ Click RUN PYTHON to execute (loads runtime on first click)</div>
          <div>→ stdout appears in cyan, result in green</div>
          <div>→ No npm install - pure CDN (Pyodide 0.23.4)</div>
        </div>
      </div>
    </div>
  );
}
