/**
 * Sidebar Component
 * 
 * File explorer sidebar with real file system operations
 */

'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { 
  FileCode, 
  Folder, 
  ChevronRight, 
  ChevronDown,
  Plus,
  FileText,
  FilePlus,
  FolderPlus,
  Trash2,
  Menu,
  X,
  MoreVertical,
  Edit2
} from 'lucide-react';
import { useFileSystem, type FileNode } from '../../store/fileSystem';

interface ContextMenu {
  x: number;
  y: number;
  item: FileNode;
}

interface SidebarProps {
  onFileSelect?: (file: FileNode) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onFileSelect }) => {
  const { 
    files, 
    currentFile,
    toggleFolder, 
    createFile, 
    createFolder,
    deleteFile,
    renameFile,
    openFile 
  } = useFileSystem();
  
  const [isOpen, setIsOpen] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(null);
  const [creatingInPath, setCreatingInPath] = useState('/');
  const [mounted, setMounted] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  // For portal - need to wait until client-side mount
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    
    const handleClick = () => setContextMenu(null);
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu]);
  
  const handleCreateItem = () => {
    if (!newItemName.trim()) {
      toast.error('Please enter a name');
      return;
    }
    
    // Validate filename - escape special chars properly
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(newItemName)) {
      toast.error('Name contains invalid characters');
      return;
    }
    
    // Check for duplicates before creating
    const newPath = creatingInPath === '/' ? `/${newItemName}` : `${creatingInPath}/${newItemName}`;
    const { findFileByPath } = useFileSystem.getState();
    
    if (findFileByPath(newPath)) {
      toast.error(`${creatingType === 'file' ? 'File' : 'Folder'} "${newItemName}" already exists!`);
      return;
    }
    
    if (creatingType === 'file') {
      createFile(creatingInPath, newItemName);
      toast.success(`Created file: ${newItemName}`);
    } else if (creatingType === 'folder') {
      createFolder(creatingInPath, newItemName);
      toast.success(`Created folder: ${newItemName}`);
    }
    
    setNewItemName('');
    setCreatingType(null);
    setCreatingInPath('/');
  };
  
  const handleDelete = (item: FileNode) => {
    const itemType = item.type === 'folder' ? 'folder' : 'file';
    const hasChildren = item.type === 'folder' && item.children && item.children.length > 0;
    
    const message = hasChildren 
      ? `Delete folder "${item.name}" and all its contents?`
      : `Delete ${itemType} "${item.name}"?`;
    
    if (confirm(message)) {
      deleteFile(item.path);
      toast.success(`Deleted ${itemType}: ${item.name}`);
    }
    setContextMenu(null);
  };
  
  const handleRename = (item: FileNode) => {
    setRenamingPath(item.path);
    setRenameValue(item.name);
    setContextMenu(null);
  };
  
  const submitRename = (oldPath: string) => {
    if (!renameValue.trim()) {
      toast.error('Please enter a name');
      return;
    }
    
    // Validate filename - escape special chars properly
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(renameValue)) {
      toast.error('Name contains invalid characters');
      return;
    }
    
    // Check if name changed
    const oldName = oldPath.split('/').pop();
    if (oldName === renameValue) {
      setRenamingPath(null);
      return;
    }
    
    // Check for duplicates
    const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/')) || '/';
    const newPath = parentPath === '/' ? `/${renameValue}` : `${parentPath}/${renameValue}`;
    const { findFileByPath } = useFileSystem.getState();
    
    if (findFileByPath(newPath)) {
      toast.error(`"${renameValue}" already exists!`);
      return;
    }
    
    renameFile(oldPath, renameValue);
    toast.success(`Renamed to: ${renameValue}`);
    setRenamingPath(null);
  };
  
  const handleContextMenu = (e: React.MouseEvent, item: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };
  
  const handleFileClick = (file: FileNode) => {
    if (file.type === 'file') {
      openFile(file.path);
      onFileSelect?.(file);
    } else {
      toggleFolder(file.path);
    }
  };
  
  const getFileIcon = (file: FileNode) => {
    if (file.type === 'folder') {
      return <Folder className="w-5 h-5 text-purple-400" />;
    }
    
    // Python icon
    if (file.name.endsWith('.py')) {
      return (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C11 2 10 2.3 9.2 2.9C8.4 3.5 8 4.4 8 5.5V7H12V8H7C5.9 8 5 8.9 5 10V14C5 15.1 5.9 16 7 16H9V14.5C9 13.4 9.9 12.5 11 12.5H13C14.1 12.5 15 11.6 15 10.5V5.5C15 4.4 14.6 3.5 13.8 2.9C13 2.3 12 2 12 2Z" fill="#3776AB"/>
          <path d="M12 22C13 22 14 21.7 14.8 21.1C15.6 20.5 16 19.6 16 18.5V17H12V16H17C18.1 16 19 15.1 19 14V10C19 8.9 18.1 8 17 8H15V9.5C15 10.6 14.1 11.5 13 11.5H11C9.9 11.5 9 12.4 9 13.5V18.5C9 19.6 9.4 20.5 10.2 21.1C11 21.7 12 22 12 22Z" fill="#FFD43B"/>
          <circle cx="10.5" cy="5.5" r="0.8" fill="white"/>
          <circle cx="13.5" cy="18.5" r="0.8" fill="#3776AB"/>
        </svg>
      );
    }
    
    // C icon (blue hexagon style)
    if (file.name.endsWith('.c')) {
      return (
        <svg className="w-5 h-5" viewBox="0 0 128 128">
          <path fill="#659AD3" d="M115.4 30.7L67.1 2.9c-.8-.5-1.9-.7-3.1-.7-1.2 0-2.3.3-3.1.7l-48 27.9c-1.7 1-2.9 3.5-2.9 5.4v55.7c0 1.1.2 2.4 1 3.5l106.8-62c-.6-1.2-1.5-2.1-2.4-2.7z"/>
          <path fill="#03599C" d="M10.7 95.3c.5.8 1.2 1.5 1.9 1.9l48.2 27.9c.8.5 1.9.7 3.1.7 1.2 0 2.3-.3 3.1-.7l48-27.9c1.7-1 2.9-3.5 2.9-5.4V36.1c0-.9-.1-1.9-.6-2.8l-106.6 62z"/>
          <path fill="#fff" d="M85.3 76.1C81.1 83.5 73.1 88.5 64 88.5c-13.5 0-24.5-11-24.5-24.5s11-24.5 24.5-24.5c9.1 0 17.1 5 21.3 12.5l13-7.5c-6.8-11.9-19.6-20-34.3-20-21.8 0-39.5 17.7-39.5 39.5s17.7 39.5 39.5 39.5c14.6 0 27.4-8 34.2-19.8l-12.9-7.6z"/>
        </svg>
      );
    }
    
    // C++ icon (blue hexagon with ++)
    if (file.name.endsWith('.cpp') || file.name.endsWith('.cc') || file.name.endsWith('.cxx') || file.name.endsWith('.h') || file.name.endsWith('.hpp')) {
      return (
        <svg className="w-5 h-5" viewBox="0 0 128 128">
          <path fill="#9C033A" d="M115.4 30.7L67.1 2.9c-.8-.5-1.9-.7-3.1-.7-1.2 0-2.3.3-3.1.7l-48 27.9c-1.7 1-2.9 3.5-2.9 5.4v55.7c0 1.1.2 2.4 1 3.5l106.8-62c-.6-1.2-1.5-2.1-2.4-2.7z"/>
          <path fill="#004482" d="M10.7 95.3c.5.8 1.2 1.5 1.9 1.9l48.2 27.9c.8.5 1.9.7 3.1.7 1.2 0 2.3-.3 3.1-.7l48-27.9c1.7-1 2.9-3.5 2.9-5.4V36.1c0-.9-.1-1.9-.6-2.8l-106.6 62z"/>
          <path fill="#fff" d="M85.3 76.1C81.1 83.5 73.1 88.5 64 88.5c-13.5 0-24.5-11-24.5-24.5s11-24.5 24.5-24.5c9.1 0 17.1 5 21.3 12.5l13-7.5c-6.8-11.9-19.6-20-34.3-20-21.8 0-39.5 17.7-39.5 39.5s17.7 39.5 39.5 39.5c14.6 0 27.4-8 34.2-19.8l-12.9-7.6z"/>
          <path fill="#fff" d="M100.3 65.5h-5.6v-5.6h-4.8v5.6H84v4.8h5.9v5.6h4.8v-5.6h5.6z"/>
          <path fill="#fff" d="M119.3 65.5h-5.6v-5.6h-4.8v5.6h-5.9v4.8h5.9v5.6h4.8v-5.6h5.6z"/>
        </svg>
      );
    }
    
    return <FileText className="w-5 h-5 text-gray-400" />;
  };
  
  const renderFileTree = (items: FileNode[], depth = 0) => {
    return items.map((item) => {
      const isExpanded = item.isExpanded || false;
      const isActive = currentFile?.path === item.path;
      const paddingLeft = `${(depth + 1) * 1}rem`;
      const isRenaming = renamingPath === item.path;
      
      return (
        <div key={item.id} className="group">
          <div
            className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-800 cursor-pointer transition-colors ${
              isActive ? 'bg-green-900/30 border-l-2 border-green-500' : ''
            }`}
            style={{ paddingLeft }}
            onClick={() => !isRenaming && handleFileClick(item)}
            onContextMenu={(e) => handleContextMenu(e, item)}
          >
            {item.type === 'folder' && (
              <span className="text-gray-400">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </span>
            )}
            
            {getFileIcon(item)}
            
            {isRenaming ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitRename(item.path);
                  if (e.key === 'Escape') setRenamingPath(null);
                }}
                onBlur={() => submitRename(item.path)}
                className="flex-1 bg-gray-800 text-green-400 px-1 py-0.5 rounded border border-green-600 focus:outline-none text-sm"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 text-sm text-gray-300 truncate">{item.name}</span>
            )}
            
            {/* Action buttons - visible on hover */}
            {!isRenaming && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.type === 'folder' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreatingType('file');
                        setCreatingInPath(item.path);
                        // Auto-expand folder
                        if (!isExpanded) toggleFolder(item.path);
                      }}
                      className="p-1 hover:bg-gray-700 rounded"
                      title="New File in Folder"
                    >
                      <FilePlus className="w-3 h-3 text-green-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreatingType('folder');
                        setCreatingInPath(item.path);
                        // Auto-expand folder
                        if (!isExpanded) toggleFolder(item.path);
                      }}
                      className="p-1 hover:bg-gray-700 rounded"
                      title="New Subfolder"
                    >
                      <FolderPlus className="w-3 h-3 text-purple-400" />
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRename(item);
                  }}
                  className="p-1 hover:bg-gray-700 rounded"
                  title="Rename"
                >
                  <Edit2 className="w-3 h-3 text-blue-400" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item);
                  }}
                  className="p-1 hover:bg-gray-700 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              </div>
            )}
          </div>
          
          {/* Show create input under expanded folder */}
          {item.type === 'folder' && isExpanded && creatingType && creatingInPath === item.path && (
            <div className="ml-4 p-2 bg-gray-900 border-l-2 border-green-600">
              <div className="text-xs text-gray-400 mb-1">
                New {creatingType}
              </div>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateItem();
                  if (e.key === 'Escape') {
                    setCreatingType(null);
                    setNewItemName('');
                  }
                }}
                placeholder={creatingType === 'file' ? 'filename.ext' : 'foldername'}
                className="w-full bg-black text-green-400 px-2 py-1 rounded border border-green-700 focus:border-green-500 focus:outline-none text-xs"
                autoFocus
              />
            </div>
          )}
          
          {item.type === 'folder' && isExpanded && item.children && (
            <div>{renderFileTree(item.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <>
      {/* Toggle Trigger - Thin vertical line on left edge */}
      {mounted && !isOpen && createPortal(
        <div
          id="void-sidebar-trigger"
          onClick={() => setIsOpen(true)}
          title="Open Sidebar"
        >
          <span className="arrow-icon">&gt;</span>
        </div>,
        document.body
      )}

      {/* Backdrop - click to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-animate"
          style={{ zIndex: 50 }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      {isOpen && (
        <aside className="fixed left-0 top-0 w-64 h-screen bg-black border-r border-green-700 overflow-y-auto sidebar-animate" style={{ zIndex: 100 }}>
          <div className="p-4">
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-2 right-2 p-1 hover:bg-gray-800 rounded transition-colors"
              title="Close Sidebar"
            >
              <X className="w-4 h-4 text-green-400" />
            </button>
            
            <div className="flex items-center justify-between mb-4 mt-4">
              <h2 className="text-sm font-bold text-green-400 font-mono">FILES</h2>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setCreatingType('file');
                    setCreatingInPath('/');
                  }}
                  className="p-1 hover:bg-gray-800 rounded"
                  title="New File"
                >
                  <FilePlus className="w-4 h-4 text-green-400" />
                </button>
                <button
                  onClick={() => {
                    setCreatingType('folder');
                    setCreatingInPath('/');
                  }}
                  className="p-1 hover:bg-gray-800 rounded"
                  title="New Folder"
                >
                  <FolderPlus className="w-4 h-4 text-purple-400" />
                </button>
              </div>
            </div>
            
            {/* Create new item input */}
            {creatingType && (
              <div className="mb-4 p-2 bg-gray-900 border border-green-700 rounded">
                <div className="text-xs text-gray-400 mb-2">
                  New {creatingType} in {creatingInPath}
                </div>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateItem();
                    if (e.key === 'Escape') setCreatingType(null);
                  }}
                  placeholder={`${creatingType === 'file' ? 'filename.ext' : 'foldername'}`}
                  className="w-full bg-black text-green-400 px-2 py-1 rounded border border-green-700 focus:border-green-500 focus:outline-none text-sm"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleCreateItem}
                    className="flex-1 bg-green-700 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setCreatingType(null)}
                    className="flex-1 bg-gray-700 text-white px-2 py-1 rounded text-xs hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {/* File tree */}
            <div className="space-y-1">
              {renderFileTree(files)}
            </div>
          </div>
        </aside>
      )}
    </>
  );
};
