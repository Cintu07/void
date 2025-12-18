/**
 * File System Store
 * 
 * Manages the virtual file system state for VOID IDE
 * Supports multiple files, directories, and language detection
 * Persists files to localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  content?: string;
  language?: 'python' | 'c' | 'cpp' | 'text';
  children?: FileNode[];
  isOpen?: boolean;
  isExpanded?: boolean;
}

interface FileSystemState {
  // File tree
  files: FileNode[];
  currentFile: FileNode | null;
  openFiles: FileNode[];
  
  // Actions
  setFiles: (files: FileNode[]) => void;
  createFile: (parentPath: string, name: string, language?: string) => void;
  createFolder: (parentPath: string, name: string) => void;
  deleteFile: (path: string) => void;
  renameFile: (path: string, newName: string) => void;
  updateFileContent: (path: string, content: string) => void;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  setCurrentFile: (path: string) => void;
  toggleFolder: (path: string) => void;
  
  // Helpers
  findFileByPath: (path: string) => FileNode | null;
  getLanguageFromFilename: (filename: string) => 'python' | 'c' | 'cpp' | 'text';
}

export const useFileSystem = create<FileSystemState>()(
  persist(
    (set, get) => ({
  files: [
    {
      id: '1',
      name: 'main.py',
      type: 'file',
      path: '/main.py',
      content: '# Welcome to VOID IDE\nprint("Hello, World!")',
      language: 'python',
      isOpen: true,
    },
  ],
  currentFile: null,
  openFiles: [],
  
  setFiles: (files) => set({ files }),
  
  createFile: (parentPath, name, language) => {
    // Check for duplicate names
    const state = get();
    const newPath = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`;
    const existingFile = state.findFileByPath(newPath);
    if (existingFile) {
      console.error(`File "${name}" already exists at ${parentPath}`);
      return;
    }
    
    const newFile: FileNode = {
      id: crypto.randomUUID(),
      name,
      type: 'file',
      path: newPath,
      content: '',
      language: language as FileNode['language'] || get().getLanguageFromFilename(name),
      isOpen: false,
    };
    
    set((state) => {
      if (parentPath === '/') {
        return { files: [...state.files, newFile] };
      }
      
      const updateTree = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.path === parentPath && node.type === 'folder') {
            return {
              ...node,
              children: [...(node.children || []), newFile],
            };
          }
          if (node.children) {
            return { ...node, children: updateTree(node.children) };
          }
          return node;
        });
      };
      
      return { files: updateTree(state.files) };
    });
  },
  
  createFolder: (parentPath, name) => {
    // Check for duplicate names
    const state = get();
    const newPath = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`;
    const existingFolder = state.findFileByPath(newPath);
    if (existingFolder) {
      console.error(`Folder "${name}" already exists at ${parentPath}`);
      return;
    }
    
    const newFolder: FileNode = {
      id: crypto.randomUUID(),
      name,
      type: 'folder',
      path: newPath,
      children: [],
      isExpanded: false,
    };
    
    set((state) => {
      if (parentPath === '/') {
        return { files: [...state.files, newFolder] };
      }
      
      const updateTree = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.path === parentPath && node.type === 'folder') {
            return {
              ...node,
              children: [...(node.children || []), newFolder],
            };
          }
          if (node.children) {
            return { ...node, children: updateTree(node.children) };
          }
          return node;
        });
      };
      
      return { files: updateTree(state.files) };
    });
  },
  
  deleteFile: (path) => {
    set((state) => {
      const removeFromTree = (nodes: FileNode[]): FileNode[] => {
        return nodes
          .filter(node => node.path !== path)
          .map(node => {
            if (node.children) {
              return { ...node, children: removeFromTree(node.children) };
            }
            return node;
          });
      };
      
      const newFiles = removeFromTree(state.files);
      
      return {
        files: newFiles,
        openFiles: state.openFiles.filter(f => f.path !== path && !f.path.startsWith(path + '/')),
        currentFile: state.currentFile?.path === path || state.currentFile?.path.startsWith(path + '/') ? null : state.currentFile,
      };
    });
  },
  
  renameFile: (path, newName) => {
    set((state) => {
      const renameInTree = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.path === path) {
            const pathParts = path.split('/');
            pathParts[pathParts.length - 1] = newName;
            const newPath = pathParts.join('/');
            
            // Recursively update children paths for folders
            const updateChildrenPaths = (children: FileNode[] | undefined, oldBasePath: string, newBasePath: string): FileNode[] | undefined => {
              if (!children) return undefined;
              return children.map(child => ({
                ...child,
                path: child.path.replace(oldBasePath, newBasePath),
                children: updateChildrenPaths(child.children, oldBasePath, newBasePath),
              }));
            };
            
            return {
              ...node,
              name: newName,
              path: newPath,
              children: node.type === 'folder' ? updateChildrenPaths(node.children, path, newPath) : undefined,
            };
          }
          if (node.children) {
            return { ...node, children: renameInTree(node.children) };
          }
          return node;
        });
      };
      
      return { files: renameInTree(state.files) };
    });
  },
  
  updateFileContent: (path, content) => {
    set((state) => {
      const updateInTree = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.path === path) {
            return { ...node, content };
          }
          if (node.children) {
            return { ...node, children: updateInTree(node.children) };
          }
          return node;
        });
      };
      
      const newFiles = updateInTree(state.files);
      
      // Also update openFiles to keep refs in sync
      const newOpenFiles = state.openFiles.map(f => 
        f.path === path ? { ...f, content } : f
      );
      
      // Update currentFile if it's the one being edited
      const newCurrentFile = state.currentFile?.path === path 
        ? { ...state.currentFile, content } 
        : state.currentFile;
      
      return { 
        files: newFiles,
        openFiles: newOpenFiles,
        currentFile: newCurrentFile,
      };
    });
  },
  
  openFile: (path) => {
    const file = get().findFileByPath(path);
    if (!file || file.type !== 'file') return;
    
    set((state) => ({
      currentFile: file,
      openFiles: state.openFiles.some(f => f.path === path)
        ? state.openFiles
        : [...state.openFiles, file],
    }));
  },
  
  closeFile: (path) => {
    set((state) => ({
      openFiles: state.openFiles.filter(f => f.path !== path),
      currentFile: state.currentFile?.path === path ? null : state.currentFile,
    }));
  },
  
  setCurrentFile: (path) => {
    const file = get().findFileByPath(path);
    if (file && file.type === 'file') {
      set({ currentFile: file });
    }
  },
  
  toggleFolder: (path) => {
    set((state) => {
      const toggleInTree = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.path === path && node.type === 'folder') {
            return { ...node, isExpanded: !node.isExpanded };
          }
          if (node.children) {
            return { ...node, children: toggleInTree(node.children) };
          }
          return node;
        });
      };
      
      return { files: toggleInTree(state.files) };
    });
  },
  
  findFileByPath: (path) => {
    const searchTree = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.path === path) return node;
        if (node.children) {
          const found = searchTree(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    return searchTree(get().files);
  },
  
  getLanguageFromFilename: (filename) => {
    if (filename.endsWith('.py')) return 'python';
    if (filename.endsWith('.c')) return 'c';
    if (filename.endsWith('.cpp') || filename.endsWith('.cc') || filename.endsWith('.cxx')) return 'cpp';
    return 'text';
  },
}),
    {
      name: 'void-filesystem',
      partialize: (state) => ({ 
        files: state.files,
        currentFile: state.currentFile,
        openFiles: state.openFiles,
      }),
    }
  )
);
