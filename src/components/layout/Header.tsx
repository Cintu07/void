/**
 * Header Component
 * 
 * Top navigation bar with gradient and status indicators
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Save, Settings, Brain, TestTube, FolderOpen } from 'lucide-react';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { SettingsDialog } from '../ui/SettingsDialog';

interface HeaderProps {
  status: string;
  onRun: () => void;
  onSave: () => void;
  onActivateAI: () => void;
  kernelReady: boolean;
  aiReady: boolean;
  aiLoading?: boolean;
  aiProgress?: { progress: number; text: string };
}

export const Header: React.FC<HeaderProps> = ({
  status,
  onRun,
  onSave,
  onActivateAI,
  kernelReady,
  aiReady,
  aiLoading,
  aiProgress,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  return (
    <header className="border-b border-gray-800 bg-black z-20">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Title & Status */}
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-mono text-green-400">
              VOID IDE
            </h1>
            
            {/* Status */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                kernelReady ? 'bg-green-500' : 'bg-yellow-500'
              }`} />
              <span className="text-sm text-gray-500 font-mono">{status}</span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              onClick={onRun}
              disabled={!kernelReady}
              variant="primary"
              icon={<Play className="w-4 h-4" />}
            >
              Run
              <kbd className="ml-2 px-2 py-0.5 text-xs bg-black/30 rounded">F5</kbd>
            </Button>
            
            <Button
              onClick={onSave}
              disabled={!kernelReady}
              variant="secondary"
              icon={<Save className="w-4 h-4" />}
            >
              Save
              <kbd className="ml-2 px-2 py-0.5 text-xs bg-black/30 rounded">Ctrl+S</kbd>
            </Button>
            
            {!aiReady && (
              <Button
                onClick={onActivateAI}
                variant="primary"
                loading={aiLoading}
                icon={<Brain className="w-4 h-4" />}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {aiLoading ? 'Loading AI...' : 'Activate Brain'}
              </Button>
            )}
            
            {aiReady && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600/20 border border-purple-500/30">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-300 font-medium">AI Active</span>
              </div>
            )}
            
            <IconButton
              icon={<Settings className="w-4 h-4" />}
              tooltip="Settings"
              onClick={() => setSettingsOpen(true)}
            />
          </div>
        </div>
        
        {/* AI Loading Progress */}
        {aiLoading && aiProgress && aiProgress.progress > 0 && (
          <motion.div
            className="mt-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="text-xs text-gray-400 mb-2">{aiProgress.text}</div>
            <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-purple"
                initial={{ width: 0 }}
                animate={{ width: `${aiProgress.progress * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {Math.round(aiProgress.progress * 100)}% complete
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Settings Dialog */}
      <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
};