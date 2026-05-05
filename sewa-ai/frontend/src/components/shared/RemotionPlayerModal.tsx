import React from 'react';
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
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in p-4 md:p-10"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-6xl aspect-video bg-[#050F0C] rounded-[2rem] border border-[#1B3028] shadow-[0_0_100px_rgba(64,141,123,0.2)] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1B3028] bg-[#08160F]/50">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-[#408D7B] animate-pulse" />
            <h3 className="text-sm font-black text-[#D0ECE6] uppercase tracking-widest">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[#111F1A] border border-[#1B3028] text-[#3A6055] hover:text-[#D0ECE6] transition-all hover:scale-110"
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
            style={{
              width: '100%',
              height: '100%',
            }}
            className="remotion-player"
          />
        </div>

        {/* Footer info */}
        <div className="p-4 bg-[#08160F]/80 border-t border-[#1B3028] flex justify-between items-center px-8">
          <span className="text-[10px] font-bold text-[#3A6055] uppercase tracking-[0.2em]">Programmatic Clinical Video Generation — SEWA Render-Node v4.0</span>
          <div className="flex gap-4">
            <span className="text-[10px] font-mono text-[#1DBF73]">24.8 FPS Rendering</span>
            <span className="text-[10px] font-mono text-[#408D7B]">H.264 / NVENC</span>
          </div>
        </div>
      </div>
    </div>
  );
}
