/**
 * Terminal Component
 * 
 * Xterm.js-based terminal for displaying Python output
 * and future shell interaction.
 * 
 * Features:
 * - Auto-fit to container
 * - Batched output rendering
 * - Ref-based write API for parent components
 */

'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

export interface TerminalHandle {
  write: (data: string) => void;
  clear: () => void;
}

interface TerminalProps {
  onData?: (data: string) => void;
}

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(
  ({ onData }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<any>(null);
    const fitAddonRef = useRef<any>(null);

    useEffect(() => {
      if (!containerRef.current) return;

      // Import xterm.js only on client side
      import('xterm').then(({ Terminal: XTerm }) => {
        import('@xterm/addon-fit').then(({ FitAddon }) => {
          // Initialize terminal
          const term = new XTerm({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: {
              background: '#000000',
              foreground: '#00ff00',
              cursor: '#00ff00',
            },
            cols: 80,
            rows: 24,
          });

          // Initialize fit addon
          const fitAddon = new FitAddon();
          term.loadAddon(fitAddon);

          // Mount terminal
          if (containerRef.current) {
            term.open(containerRef.current);
            fitAddon.fit();
          }

          // Handle terminal input
          if (onData) {
            term.onData((data) => {
              onData(data);
            });
          }

          // Handle resize
          const handleResize = () => {
            fitAddon.fit();
          };
          window.addEventListener('resize', handleResize);

          terminalRef.current = term;
          fitAddonRef.current = fitAddon;

          // Welcome message
          term.writeln('VOID Terminal initialized');
          term.writeln('Type Python code and press RUN PYTHON');
          term.writeln('');

          // Cleanup
          return () => {
            window.removeEventListener('resize', handleResize);
            term.dispose();
          };
        });
      });
    }, [onData]);

    // Expose write and clear methods via ref
    useImperativeHandle(ref, () => ({
      write: (data: string) => {
        terminalRef.current?.write(data);
      },
      clear: () => {
        terminalRef.current?.clear();
      },
    }));

    return (
      <div
        ref={containerRef}
        className="w-full h-full bg-black rounded border border-green-400"
        style={{ minHeight: '400px' }}
      />
    );
  }
);

Terminal.displayName = 'Terminal';
