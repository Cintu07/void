/**
 * Settings Dialog
 * 
 * Modal dialog for AI mode preferences
 */

'use client';

import React, { useState } from 'react';
import { X, Cpu, Zap, Pause, Trash2, Loader2, Check } from 'lucide-react';
import { useSettings } from '../../store/settings';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  aiReady?: boolean;
  onPauseAI?: () => void;
  onDeleteModel?: () => void;
  onModeChange?: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ 
  isOpen, 
  onClose,
  aiReady,
  onPauseAI,
  onDeleteModel,
  onModeChange
}) => {
  const { aiMode, setAIMode } = useSettings();
  const [pauseLoading, setPauseLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pauseSuccess, setPauseSuccess] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  if (!isOpen) return null;

  const handleModeChange = (mode: 'gpu' | 'cpu') => {
    setAIMode(mode);
    onModeChange?.();
  };

  const handlePauseAI = async () => {
    setPauseLoading(true);
    setPauseSuccess(false);
    try {
      await new Promise(r => setTimeout(r, 300)); // Small delay for feedback
      onPauseAI?.();
      setPauseSuccess(true);
      setTimeout(() => setPauseSuccess(false), 2000);
    } finally {
      setPauseLoading(false);
    }
  };

  const handleDeleteModel = async () => {
    setDeleteLoading(true);
    setDeleteSuccess(false);
    try {
      await new Promise(r => setTimeout(r, 500)); // Small delay for feedback
      onDeleteModel?.();
      setDeleteSuccess(true);
      setTimeout(() => setDeleteSuccess(false), 2000);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative bg-gray-900 border border-green-700 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-green-400 font-mono">SETTINGS</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        {/* AI Mode Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-400 mb-3">AI MODE</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleModeChange('gpu')}
              className={`p-4 rounded-lg border-2 transition-all ${
                aiMode === 'gpu'
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              <Zap className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <div className="text-sm font-bold text-gray-300 mb-1">GPU</div>
              <div className="text-xs text-gray-500">Llama-3 (4GB)</div>
              <div className="text-xs text-gray-500">Faster, more VRAM</div>
            </button>
            
            <button
              onClick={() => handleModeChange('cpu')}
              className={`p-4 rounded-lg border-2 transition-all ${
                aiMode === 'cpu'
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              <Cpu className="w-6 h-6 mx-auto mb-2 text-blue-400" />
              <div className="text-sm font-bold text-gray-300 mb-1">CPU</div>
              <div className="text-xs text-gray-500">Qwen2 (300MB)</div>
              <div className="text-xs text-gray-500">Slower, less memory</div>
            </button>
          </div>
        </div>

        {/* AI Controls */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-400 mb-3">AI CONTROLS</h3>
          <div className="space-y-2">
            <button
              onClick={handlePauseAI}
              disabled={!aiReady || pauseLoading}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                pauseSuccess 
                  ? 'border-green-500 bg-green-500/20' 
                  : 'border-gray-700 bg-gray-800 hover:border-yellow-500 hover:bg-yellow-500/10'
              } disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]`}
            >
              {pauseLoading ? (
                <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
              ) : pauseSuccess ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <Pause className="w-5 h-5 text-yellow-400" />
              )}
              <div className="text-left">
                <div className="text-sm font-bold text-gray-300">
                  {pauseLoading ? 'Pausing...' : pauseSuccess ? 'AI Paused!' : 'Pause AI'}
                </div>
                <div className="text-xs text-gray-500">Stop AI to save resources</div>
              </div>
            </button>
            
            <button
              onClick={handleDeleteModel}
              disabled={deleteLoading}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                deleteSuccess 
                  ? 'border-green-500 bg-green-500/20' 
                  : 'border-gray-700 bg-gray-800 hover:border-red-500 hover:bg-red-500/10'
              } disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]`}
            >
              {deleteLoading ? (
                <Loader2 className="w-5 h-5 text-red-400 animate-spin" />
              ) : deleteSuccess ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <Trash2 className="w-5 h-5 text-red-400" />
              )}
              <div className="text-left">
                <div className="text-sm font-bold text-gray-300">
                  {deleteLoading ? 'Deleting...' : deleteSuccess ? 'Model Deleted!' : 'Delete AI Model'}
                </div>
                <div className="text-xs text-gray-500">Remove downloaded model from storage</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
