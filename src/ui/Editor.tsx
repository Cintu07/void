/**
 * Code Editor Component
 * 
 * Monaco Editor (VS Code engine) for Python code editing
 * 
 * Features:
 * - VS Code-like interface
 * - Syntax highlighting
 * - IntelliSense with Python completions
 */

'use client';

import React, { useRef, useEffect } from 'react';
import Editor, { OnMount, loader } from '@monaco-editor/react';

// FORCE CDN LOAD (Fixes IntelliSense blocking)
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs',
  },
});

// Python built-in completions
const pythonBuiltins = [
  // Keywords
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break',
  'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally',
  'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal',
  'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
  // Built-in functions
  'print', 'input', 'len', 'range', 'str', 'int', 'float', 'list', 'dict',
  'set', 'tuple', 'bool', 'type', 'isinstance', 'issubclass', 'open', 'file',
  'abs', 'all', 'any', 'bin', 'chr', 'dir', 'divmod', 'enumerate', 'eval',
  'exec', 'filter', 'format', 'getattr', 'globals', 'hasattr', 'hash', 'help',
  'hex', 'id', 'iter', 'locals', 'map', 'max', 'min', 'next', 'oct', 'ord',
  'pow', 'repr', 'reversed', 'round', 'setattr', 'slice', 'sorted', 'sum',
  'super', 'vars', 'zip', '__import__',
  // Common modules
  'os', 'sys', 'math', 'random', 'json', 'time', 'datetime', 're', 'collections',
];

// Python snippets
const pythonSnippets = [
  { label: 'def', insertText: 'def ${1:function_name}(${2:params}):\n\t${3:pass}', doc: 'Define a function' },
  { label: 'class', insertText: 'class ${1:ClassName}:\n\tdef __init__(self${2:, params}):\n\t\t${3:pass}', doc: 'Define a class' },
  { label: 'if', insertText: 'if ${1:condition}:\n\t${2:pass}', doc: 'If statement' },
  { label: 'ifelse', insertText: 'if ${1:condition}:\n\t${2:pass}\nelse:\n\t${3:pass}', doc: 'If-else statement' },
  { label: 'for', insertText: 'for ${1:item} in ${2:iterable}:\n\t${3:pass}', doc: 'For loop' },
  { label: 'while', insertText: 'while ${1:condition}:\n\t${2:pass}', doc: 'While loop' },
  { label: 'try', insertText: 'try:\n\t${1:pass}\nexcept ${2:Exception} as e:\n\t${3:pass}', doc: 'Try-except block' },
  { label: 'with', insertText: 'with ${1:expression} as ${2:var}:\n\t${3:pass}', doc: 'With statement' },
  { label: 'lambda', insertText: 'lambda ${1:x}: ${2:x}', doc: 'Lambda function' },
  { label: 'list_comp', insertText: '[${1:x} for ${2:x} in ${3:iterable}]', doc: 'List comprehension' },
  { label: 'dict_comp', insertText: '{${1:k}: ${2:v} for ${3:k}, ${4:v} in ${5:iterable}}', doc: 'Dict comprehension' },
  { label: 'main', insertText: 'if __name__ == "__main__":\n\t${1:main()}', doc: 'Main entry point' },
  { label: 'print', insertText: 'print(${1:value})', doc: 'Print to console' },
];

// C built-in completions
const cBuiltins = [
  // Keywords
  'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
  'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if',
  'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static',
  'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while',
  // Standard library functions
  'printf', 'scanf', 'malloc', 'free', 'calloc', 'realloc', 'sizeof',
  'strlen', 'strcpy', 'strcat', 'strcmp', 'strncpy', 'strncat', 'strncmp',
  'memcpy', 'memset', 'memmove', 'memcmp',
  'fopen', 'fclose', 'fread', 'fwrite', 'fprintf', 'fscanf', 'fgets', 'fputs',
  'getchar', 'putchar', 'gets', 'puts',
  'atoi', 'atof', 'atol', 'strtol', 'strtod',
  'abs', 'labs', 'rand', 'srand', 'exit', 'system',
  // Common headers
  'stdio.h', 'stdlib.h', 'string.h', 'math.h', 'time.h', 'ctype.h', 'stdbool.h',
  // Types
  'NULL', 'EOF', 'true', 'false', 'bool', 'size_t',
];

// C snippets
const cSnippets = [
  { label: 'main', insertText: 'int main(int argc, char *argv[]) {\n\t${1:// code}\n\treturn 0;\n}', doc: 'Main function' },
  { label: 'func', insertText: '${1:void} ${2:function_name}(${3:params}) {\n\t${4:// code}\n}', doc: 'Function definition' },
  { label: 'if', insertText: 'if (${1:condition}) {\n\t${2:// code}\n}', doc: 'If statement' },
  { label: 'ifelse', insertText: 'if (${1:condition}) {\n\t${2:// code}\n} else {\n\t${3:// code}\n}', doc: 'If-else statement' },
  { label: 'for', insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3:// code}\n}', doc: 'For loop' },
  { label: 'while', insertText: 'while (${1:condition}) {\n\t${2:// code}\n}', doc: 'While loop' },
  { label: 'dowhile', insertText: 'do {\n\t${1:// code}\n} while (${2:condition});', doc: 'Do-while loop' },
  { label: 'switch', insertText: 'switch (${1:expr}) {\n\tcase ${2:val}:\n\t\t${3:// code}\n\t\tbreak;\n\tdefault:\n\t\t${4:// code}\n}', doc: 'Switch statement' },
  { label: 'struct', insertText: 'struct ${1:name} {\n\t${2:int member};\n};', doc: 'Struct definition' },
  { label: 'typedef', insertText: 'typedef struct {\n\t${1:int member};\n} ${2:TypeName};', doc: 'Typedef struct' },
  { label: 'include', insertText: '#include <${1:stdio.h}>', doc: 'Include header' },
  { label: 'define', insertText: '#define ${1:NAME} ${2:value}', doc: 'Define macro' },
  { label: 'printf', insertText: 'printf("${1:%s}\\n", ${2:value});', doc: 'Print formatted' },
  { label: 'scanf', insertText: 'scanf("${1:%d}", &${2:var});', doc: 'Read input' },
  { label: 'malloc', insertText: '${1:int} *${2:ptr} = (${1:int} *)malloc(${3:n} * sizeof(${1:int}));', doc: 'Allocate memory' },
];

// C++ built-in completions (includes C + C++ specific)
const cppBuiltins = [
  ...cBuiltins,
  // C++ keywords
  'alignas', 'alignof', 'and', 'and_eq', 'asm', 'bitand', 'bitor', 'bool',
  'catch', 'class', 'compl', 'concept', 'consteval', 'constexpr', 'constinit',
  'const_cast', 'co_await', 'co_return', 'co_yield', 'decltype', 'delete',
  'dynamic_cast', 'explicit', 'export', 'false', 'friend', 'inline', 'mutable',
  'namespace', 'new', 'noexcept', 'not', 'not_eq', 'nullptr', 'operator',
  'or', 'or_eq', 'private', 'protected', 'public', 'reinterpret_cast',
  'requires', 'static_assert', 'static_cast', 'template', 'this', 'thread_local',
  'throw', 'true', 'try', 'typeid', 'typename', 'using', 'virtual', 'wchar_t', 'xor', 'xor_eq',
  // STL containers
  'vector', 'string', 'map', 'unordered_map', 'set', 'unordered_set',
  'list', 'deque', 'queue', 'stack', 'priority_queue', 'array', 'pair',
  // STL functions
  'sort', 'find', 'count', 'reverse', 'min', 'max', 'swap', 'push_back',
  'pop_back', 'begin', 'end', 'size', 'empty', 'clear', 'insert', 'erase',
  // IO
  'cout', 'cin', 'endl', 'cerr', 'getline',
  // Smart pointers
  'unique_ptr', 'shared_ptr', 'weak_ptr', 'make_unique', 'make_shared',
  // Headers
  'iostream', 'vector', 'string', 'algorithm', 'map', 'set', 'queue', 'stack',
];

// C++ snippets
const cppSnippets = [
  ...cSnippets,
  { label: 'class', insertText: 'class ${1:ClassName} {\npublic:\n\t${1:ClassName}() {}\n\t~${1:ClassName}() {}\nprivate:\n\t${2:// members}\n};', doc: 'Class definition' },
  { label: 'cout', insertText: 'std::cout << ${1:value} << std::endl;', doc: 'Print to console' },
  { label: 'cin', insertText: 'std::cin >> ${1:var};', doc: 'Read input' },
  { label: 'vector', insertText: 'std::vector<${1:int}> ${2:vec};', doc: 'Vector declaration' },
  { label: 'map', insertText: 'std::map<${1:string}, ${2:int}> ${3:map};', doc: 'Map declaration' },
  { label: 'forauto', insertText: 'for (auto& ${1:item} : ${2:container}) {\n\t${3:// code}\n}', doc: 'Range-based for loop' },
  { label: 'lambda', insertText: 'auto ${1:func} = [${2:&}](${3:params}) {\n\t${4:// code}\n};', doc: 'Lambda function' },
  { label: 'template', insertText: 'template <typename ${1:T}>\n${2:T} ${3:func}(${4:params}) {\n\t${5:// code}\n}', doc: 'Template function' },
  { label: 'namespace', insertText: 'namespace ${1:name} {\n\t${2:// code}\n}', doc: 'Namespace' },
  { label: 'try', insertText: 'try {\n\t${1:// code}\n} catch (const std::exception& e) {\n\t${2:// handle}\n}', doc: 'Try-catch block' },
  { label: 'unique', insertText: 'std::unique_ptr<${1:Type}> ${2:ptr} = std::make_unique<${1:Type}>(${3:args});', doc: 'Unique pointer' },
  { label: 'shared', insertText: 'std::shared_ptr<${1:Type}> ${2:ptr} = std::make_shared<${1:Type}>(${3:args});', doc: 'Shared pointer' },
  { label: 'include', insertText: '#include <${1:iostream}>', doc: 'Include header' },
  { label: 'using', insertText: 'using namespace ${1:std};', doc: 'Using namespace' },
];

interface CodeEditorProps {
  initialCode: string;
  onChange: (value: string) => void;
  language?: 'python' | 'c' | 'cpp' | 'text';
}

const CodeEditor: React.FC<CodeEditorProps> = ({ initialCode, onChange, language = 'python' }) => {
  const editorRef = useRef<any>(null);
  const completionDisposablesRef = useRef<any[]>([]);
  
  // Map our language types to Monaco's language IDs
  const getMonacoLanguage = (lang: string) => {
    switch (lang) {
      case 'python': return 'python';
      case 'c': return 'c';
      case 'cpp': return 'cpp';
      case 'text': return 'plaintext';
      default: return 'python';
    }
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Dispose previous completion providers if exists
    completionDisposablesRef.current.forEach(d => d.dispose());
    completionDisposablesRef.current = [];
    
    // Helper to create completion provider
    const createCompletionProvider = (builtins: string[], snippets: any[]) => ({
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        
        const suggestions: any[] = [];
        
        // Add built-in completions
        builtins.forEach((item) => {
          suggestions.push({
            label: item,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: item,
            range,
          });
        });
        
        // Add snippets
        snippets.forEach((snippet) => {
          suggestions.push({
            label: snippet.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: snippet.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: snippet.doc,
            range,
          });
        });
        
        return { suggestions };
      },
      triggerCharacters: ['.', ' ', ':', '<', '"', "'", '/'],
    });
    
    // Register Python completion provider
    completionDisposablesRef.current.push(
      monaco.languages.registerCompletionItemProvider('python', 
        createCompletionProvider(pythonBuiltins, pythonSnippets)
      )
    );
    
    // Register C completion provider
    completionDisposablesRef.current.push(
      monaco.languages.registerCompletionItemProvider('c', 
        createCompletionProvider(cBuiltins, cSnippets)
      )
    );
    
    // Register C++ completion provider
    completionDisposablesRef.current.push(
      monaco.languages.registerCompletionItemProvider('cpp', 
        createCompletionProvider(cppBuiltins, cppSnippets)
      )
    );
    
    // Focus editor
    editor.focus();
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
        defaultLanguage={getMonacoLanguage(language)}
        language={getMonacoLanguage(language)}
        theme="vs-dark"
        value={initialCode}
        onChange={(value) => onChange(value || '')}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          // IntelliSense settings
          quickSuggestions: { other: true, comments: true, strings: true },
          parameterHints: { enabled: true },
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: "on",
          tabCompletion: "on",
          wordBasedSuggestions: "allDocuments",
          // Additional IntelliSense options
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showFunctions: true,
            showVariables: true,
            showClasses: true,
            showModules: true,
            insertMode: 'insert',
            filterGraceful: true,
            snippetsPreventQuickSuggestions: false,
          },
          // Better editing experience
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          autoIndent: 'full',
          formatOnPaste: true,
          formatOnType: true,
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
        }}
      />
    </div>
  );
};

export default CodeEditor;
