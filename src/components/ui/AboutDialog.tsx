'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Shield, Cpu, Code, Zap, Lock, Globe, Terminal, FileCode, Brain } from 'lucide-react';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutDialog = ({ isOpen, onClose }: AboutDialogProps) => {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'about' | 'features' | 'privacy' | 'usage'>('about');

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center z-[1000]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-dialog-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Dialog */}
      <div className="relative bg-gray-950 border border-green-700 rounded-lg w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl shadow-green-900/20">
        {/* Header with Logo */}
        <div className="flex items-center justify-between p-4 border-b border-green-900 bg-black">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="VOID Logo" className="w-10 h-10" />
            <div>
              <h2 id="about-dialog-title" className="text-xl font-bold text-green-400 font-mono">VOID IDE</h2>
              <p className="text-xs text-gray-500">Privacy-First Browser IDE</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-green-900 bg-gray-900/50">
          {[
            { id: 'about', label: 'About', icon: Brain },
            { id: 'features', label: 'Features', icon: Zap },
            { id: 'privacy', label: 'Privacy', icon: Shield },
            { id: 'usage', label: 'Use Cases', icon: Code },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-green-400 border-b-2 border-green-400 bg-green-900/20'
                  : 'text-gray-400 hover:text-green-300 hover:bg-gray-800/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'about' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-green-400 mb-2">Why I Built VOID</h3>
                <p className="text-gray-400">A developer&apos;s frustration turned into a solution</p>
              </div>
              
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <h4 className="text-green-400 font-semibold mb-3 flex items-center gap-2">
                  <Terminal className="w-5 h-5" /> The Pain Point
                </h4>
                <p className="text-gray-300 leading-relaxed">
                  Every time I wanted to quickly test some code, I had to either open a heavy IDE, 
                  wait for it to load, or use online editors that send my code to their servers. 
                  I wanted something <span className="text-green-400">instant</span>, something 
                  <span className="text-green-400"> private</span>, and something with 
                  <span className="text-green-400"> AI assistance</span> that doesn&apos;t compromise my data.
                </p>
              </div>

              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <h4 className="text-green-400 font-semibold mb-3 flex items-center gap-2">
                  <Brain className="w-5 h-5" /> The Vision
                </h4>
                <p className="text-gray-300 leading-relaxed">
                  VOID is a <span className="text-green-400">zero-compromise</span> browser-based IDE. 
                  Your code stays in your browser. The AI runs locally on YOUR machine using WebLLM. 
                  No servers. No tracking. No data harvesting. Just you and your code in the void.
                </p>
              </div>

              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <h4 className="text-green-400 font-semibold mb-3 flex items-center gap-2">
                  <Globe className="w-5 h-5" /> Open Source & Free
                </h4>
                <p className="text-gray-300 leading-relaxed">
                  VOID is completely open source. No premium tiers, no feature gates, no &quot;sign up to continue&quot;. 
                  Fork it, modify it, make it yours. The hacker community deserves tools that respect them.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-green-400 mb-4">Features</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: Cpu, title: 'Local AI (GPU/CPU)', desc: 'AI runs entirely in your browser using WebLLM. Choose GPU mode (faster, 4GB) or CPU mode (slower, 300MB).' },
                  { icon: FileCode, title: 'Multi-Language', desc: 'Support for Python, C, and C++ with syntax highlighting and IntelliSense autocomplete.' },
                  { icon: Terminal, title: 'Integrated Terminal', desc: 'Built-in terminal with Python/Pyodide execution. Run code instantly without setup.' },
                  { icon: Lock, title: 'Local Storage', desc: 'All your files persist in browser localStorage. No cloud sync, no account needed.' },
                  { icon: Code, title: 'Monaco Editor', desc: 'The same editor that powers VS Code. Full featured with keyboard shortcuts.' },
                  { icon: Zap, title: 'Instant Load', desc: 'No installation, no setup. Just open the URL and start coding immediately.' },
                ].map((feature) => (
                  <div key={feature.title} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 hover:border-green-700 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-green-900/30 rounded-lg">
                        <feature.icon className="w-5 h-5 text-green-400" />
                      </div>
                      <h4 className="text-green-400 font-semibold">{feature.title}</h4>
                    </div>
                    <p className="text-gray-400 text-sm">{feature.desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                <h4 className="text-green-400 font-semibold mb-2">Keyboard Shortcuts</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-300"><kbd className="bg-gray-800 px-2 py-1 rounded">F5</kbd> Run Code</div>
                  <div className="text-gray-300"><kbd className="bg-gray-800 px-2 py-1 rounded">Ctrl+S</kbd> Save File</div>
                  <div className="text-gray-300"><kbd className="bg-gray-800 px-2 py-1 rounded">Ctrl+Space</kbd> IntelliSense</div>
                  <div className="text-gray-300"><kbd className="bg-gray-800 px-2 py-1 rounded">Ctrl+/</kbd> Toggle Comment</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Shield className="w-16 h-16 text-green-400 mx-auto mb-3" />
                <h3 className="text-2xl font-bold text-green-400">100% Private by Design</h3>
                <p className="text-gray-400">Your code never leaves your machine</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
                  <div className="p-2 bg-green-900/30 rounded-lg mt-1">
                    <Lock className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-green-400 font-semibold mb-1">No Server Communication</h4>
                    <p className="text-gray-400 text-sm">Your code is stored in browser localStorage. We don&apos;t have servers to receive your data even if we wanted to.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
                  <div className="p-2 bg-green-900/30 rounded-lg mt-1">
                    <Cpu className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-green-400 font-semibold mb-1">Local AI Processing</h4>
                    <p className="text-gray-400 text-sm">The AI model downloads once and runs entirely in your browser using WebGPU/WebAssembly. No API calls, no cloud processing.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
                  <div className="p-2 bg-green-900/30 rounded-lg mt-1">
                    <Globe className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-green-400 font-semibold mb-1">No Accounts Required</h4>
                    <p className="text-gray-400 text-sm">No sign-up, no email, no tracking cookies. Open the page and start coding. That&apos;s it.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
                  <div className="p-2 bg-green-900/30 rounded-lg mt-1">
                    <Code className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-green-400 font-semibold mb-1">Fully Open Source</h4>
                    <p className="text-gray-400 text-sm">Every line of code is on GitHub. Audit it yourself. We have nothing to hide.</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                <p className="text-yellow-300 text-sm">
                  <strong>Note:</strong> If you clear your browser data, your saved files will be lost. 
                  Consider downloading important code as backup.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-green-400 mb-4">Use Cases</h3>
              
              <div className="space-y-4">
                {[
                  {
                    title: '🎓 Learning & Practice',
                    desc: 'Perfect for students learning Python, C, or C++. Write code, run it instantly, ask the AI to explain concepts.',
                    example: 'Ask AI: "Explain how recursion works and write a factorial function"'
                  },
                  {
                    title: '⚡ Quick Prototyping',
                    desc: 'Test ideas quickly without setting up a development environment. Great for algorithm practice or code interviews.',
                    example: 'Quickly test a sorting algorithm or data structure implementation'
                  },
                  {
                    title: '🔒 Sensitive Code',
                    desc: 'Working on proprietary code? Use VOID with confidence knowing your code never leaves your machine.',
                    example: 'Test business logic or algorithms you don\'t want on external servers'
                  },
                  {
                    title: '🌐 Offline Coding',
                    desc: 'Once the AI model is downloaded, you can code offline. Perfect for flights, commutes, or spotty internet.',
                    example: 'Download CPU model once (300MB), code anywhere without internet'
                  },
                  {
                    title: '🤖 AI-Assisted Development',
                    desc: 'Get code suggestions, explanations, and debugging help from the local AI without privacy concerns.',
                    example: 'Select code + ask "Why isn\'t this working?" or "Optimize this function"'
                  },
                  {
                    title: '📝 Code Snippets Library',
                    desc: 'Save frequently used code snippets in different files. They persist in your browser.',
                    example: 'Keep a collection of utility functions, templates, or boilerplate code'
                  },
                ].map((useCase) => (
                  <div key={useCase.title} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 hover:border-green-700 transition-colors">
                    <h4 className="text-green-400 font-semibold mb-2">{useCase.title}</h4>
                    <p className="text-gray-300 text-sm mb-2">{useCase.desc}</p>
                    <p className="text-gray-500 text-xs italic">💡 {useCase.example}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gray-900/50 border border-green-700 rounded-lg">
                <h4 className="text-green-400 font-semibold mb-3">Quick Start</h4>
                <ol className="text-gray-300 text-sm space-y-2 list-decimal list-inside">
                  <li>Click <span className="text-green-400">AI</span> button and wait for model to load</li>
                  <li>Create a new file in the sidebar (supports .py, .c, .cpp)</li>
                  <li>Write your code or ask AI for help</li>
                  <li>Press <kbd className="bg-gray-800 px-2 py-0.5 rounded text-xs">F5</kbd> to run (Python only)</li>
                  <li>Your code auto-saves to browser storage</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-green-900 bg-black flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Made with 💚 by Pawan
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="https://github.com/Cintu07/VOID" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-green-400 hover:text-green-300 transition-colors"
            >
              ⭐ Star on GitHub
            </a>
            <span className="text-xs text-gray-600">v1.0.0-beta</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
