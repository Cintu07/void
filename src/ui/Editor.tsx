/**
 * Code Editor Component
 * 
 * Monaco Editor (VS Code engine) for Python code editing
 * 
 * Features:
 * - VS Code-like interface
 * - Syntax highlighting
 * - IntelliSense
 */

'use client';

import React, { useRef, useEffect } from 'react';
import Editor, { OnMount, loader } from '@monaco-editor/react';

// 1. FORCE CDN LOAD (Fixes IntelliSense blocking)
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs',
  },
});

interface CodeEditorProps {
  initialCode: string;
  onChange: (value: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ initialCode, onChange }) => {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // 2. FORCE DIAGNOSTICS (Red underlines for errors)
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [],
    });
  };

  useEffect(() => {
    if (editorRef.current && initialCode && initialCode !== "# Loading...") {
      const currentVal = editorRef.current.getValue();
      if (currentVal !== initialCode) {
        editorRef.current.setValue(initialCode);
      }
    }
  }, [initialCode]);

  return (
    <div className="h-full w-full border-r border-green-900">
      <Editor
        height="100%"
        defaultLanguage="python"
        theme="vs-dark"
        value={initialCode}
        onChange={(value) => onChange(value || '')}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'monospace',
          // 3. FORCE SUGGESTIONS
          quickSuggestions: { other: true, comments: true, strings: true },
          parameterHints: { enabled: true },
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: "on",
          tabCompletion: "on",
          wordBasedSuggestions: "allDocuments",
        }}
      />
    </div>
  );
};

export default CodeEditor;

// Export a function to get editor value from outside
export function useEditorValue(editorRef: React.MutableRefObject<any>) {
  return useCallback(() => {
    return editorRef.current?.getValue() || '';
  }, [editorRef]);
}
