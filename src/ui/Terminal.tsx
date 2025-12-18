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
      import('@xterm/xterm').then(({ Terminal: XTerm }) => {
        import('@xterm/addon-fit').then(({ FitAddon }) => {
          // Initialize terminal with green theme
          const term = new XTerm({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: {
              background: '#0a0e0a',
              foreground: '#00ff00',
              cursor: '#00ff00',
              cursorAccent: '#000000',
              selectionBackground: '#00ff0040',
              black: '#000000',
              red: '#ff0000',
              green: '#00ff00',
              yellow: '#ffff00',
              blue: '#0000ff',
              magenta: '#ff00ff',
              cyan: '#00ffff',
              white: '#ffffff',
              brightBlack: '#555555',
              brightRed: '#ff5555',
              brightGreen: '#55ff55',
              brightYellow: '#ffff55',
              brightBlue: '#5555ff',
              brightMagenta: '#ff55ff',
              brightCyan: '#55ffff',
              brightWhite: '#ffffff',
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

          // Welcome message - use cols for dynamic width
          const cols = term.cols || 40;
          const boxWidth = Math.min(cols - 2, 42);
          const innerWidth = boxWidth - 2; // Account for border chars
          const titleText = 'VOID Terminal v1.0 - Ready';
          const leftPad = Math.floor((innerWidth - titleText.length) / 2);
          const rightPad = innerWidth - titleText.length - leftPad;
          term.writeln(`\x1b[1;32m╔${'═'.repeat(innerWidth)}╗\x1b[0m`);
          term.writeln(`\x1b[1;32m║${' '.repeat(leftPad)}${titleText}${' '.repeat(rightPad)}║\x1b[0m`);
          term.writeln(`\x1b[1;32m╚${'═'.repeat(innerWidth)}╝\x1b[0m`);
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
        className="w-full h-full bg-black"
        style={{ minHeight: '250px' }}
      />
    );
  }
);

Terminal.displayName = 'Terminal';
