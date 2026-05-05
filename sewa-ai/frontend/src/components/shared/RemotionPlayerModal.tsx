import React from 'react';
import '../../remotion-env.d.ts';

import { Player } from '@remotion/player';
import * as Compositions from '../../remotion/compositions';

interface RemotionPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  composition: keyof typeof Compositions;
  inputProps?: any;
  title: string;
}

export function RemotionPlayerModal({ isOpen, onClose, composition, inputProps, title }: RemotionPlayerModalProps) {
  if (!isOpen) return null;

  // Get composition config (fps, duration) or use defaults
  const configs: Record<string, { fps: number; duration: number; width: number; height: number }> = {
    AIResultExplainer:     { fps: 30, duration: 150, width: 1920, height: 1080 },
    ClinicalReportSummary: { fps: 30, duration: 210, width: 1920, height: 1080 },
    PlatformIntro:         { fps: 30, duration: 300, width: 1920, height: 1080 },
    OnboardingWalkthrough: { fps: 30, duration: 180, width: 1920, height: 1080 },
  };

  const config = configs[composition] || { fps: 30, duration: 150, width: 1920, height: 1080 };
  const Component = Compositions[composition] as React.FC<any>;

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-fade-in p-2 md:p-10"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-6xl aspect-video bg-[#050F0C] rounded-2xl md:rounded-[2rem] border border-[#1B3028] shadow-[0_0_100px_rgba(64,141,123,0.3)] overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-[#1B3028] bg-[#08160F]/80 backdrop-blur-md">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-2 h-2 rounded-full bg-[#408D7B] animate-pulse" />
            <h3 className="text-[10px] md:text-sm font-black text-[#D0ECE6] uppercase tracking-[0.2em]">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-[#111F1A] border border-[#1B3028] text-[#3A6055] hover:text-[#D0ECE6] transition-all hover:scale-110 active:scale-95"
          >
            ✕
          </button>
        </div>

        {/* Player Container */}
        <div className="flex-1 bg-black relative">
          <Player
            component={Component}
            durationInFrames={config.duration}
            compositionWidth={config.width}
            compositionHeight={config.height}
            fps={config.fps}
            inputProps={inputProps}
            controls
            autoPlay
            loop
            clickToPlay
            doubleClickToFullscreen
            style={{
              width: '100%',
              height: '100%',
            }}
            className="remotion-player"
          />
        </div>

        {/* Footer info */}
        <div className="hidden md:flex p-4 bg-[#08160F]/90 border-t border-[#1B3028] justify-between items-center px-8">
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-bold text-[#3A6055] uppercase tracking-[0.2em]">Programmatic Video v4.0</span>
            <span className="text-[10px] text-[#408D7B] font-mono">SEWA_AI_NODE_ALPHA_2026</span>
          </div>
          <div className="flex gap-4">
            <span className="text-[10px] font-mono text-[#1DBF73]/50">LATENCY: 12ms</span>
            <span className="text-[10px] font-mono text-[#408D7B]">H.264 / NVENC / {config.width}x{config.height}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
