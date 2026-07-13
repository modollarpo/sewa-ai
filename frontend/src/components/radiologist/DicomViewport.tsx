import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RenderingEngine, Enums } from '@cornerstonejs/core';
import { ToolGroupManager, WindowLevelTool, PanTool, ZoomTool, LengthTool } from '@cornerstonejs/tools';
import { initCornerstone } from '../../lib/cornerstoneConfig';
import { apiClient } from '../../services/apiClient';

type DicomViewportProps = {
  scanId?: string;
  storageUrl?: string | null;
  modality?: string;
  showGradcam?: boolean;
  findings?: { x: number; y: number; width: number; height: number; label: string }[];
};

export function DicomViewport({ scanId, storageUrl, modality, showGradcam, findings }: DicomViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<'wl' | 'pan' | 'zoom' | 'measure'>('wl');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const toolbarTools = [
    { id: 'wl', label: 'W/L', icon: '\u2600' },
    { id: 'pan', label: 'Pan', icon: '\u270B' },
    { id: 'zoom', label: 'Zoom', icon: '\uD83D\uDD0D' },
    { id: 'measure', label: 'Measure', icon: '\uD83D\uDCCF' },
  ] as const;

  const activateTool = useCallback((toolId: string) => {
    setTool(toolId as typeof tool);
    const tg = ToolGroupManager.getToolGroup('sewa-viewport');
    if (!tg) return;
    const tools = [WindowLevelTool.toolName, PanTool.toolName, ZoomTool.toolName, LengthTool.toolName];
    tools.forEach(t => tg.setToolDisabled(t));
    const activeMap: Record<string, string> = {
      wl: WindowLevelTool.toolName,
      pan: PanTool.toolName,
      zoom: ZoomTool.toolName,
      measure: LengthTool.toolName,
    };
    tg.setToolActive(activeMap[toolId] || WindowLevelTool.toolName, { bindings: [{ mouseButton: 1 }] });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    (async () => {
      try {
        await initCornerstone();
        if (destroyed || !containerRef.current) return;

        const engine = new RenderingEngine('sewa-dicom-engine');
        const viewportInput: any = {
          viewportId: 'sewa-viewport',
          type: Enums.ViewportType.STACK,
          element: containerRef.current,
          defaultOptions: { background: [0, 0, 0] } as any,
        };
        engine.enableElement(viewportInput);
        const viewport = engine.getStackViewport('sewa-viewport');

        // Resolve DICOM URL through authenticated proxy (avoids public blob access)
        let dicomUrl = storageUrl;
        if (scanId) {
          try {
            const { data } = await apiClient.get(`/scans/${scanId}/image-url`);
            if (data?.url) dicomUrl = data.url;
          } catch {
            // fall back to raw storageUrl if SAS endpoint fails
          }
        }

        if (dicomUrl) {
          const imageIds = [`wadouri:${dicomUrl}`];
          await viewport.setStack(imageIds);
          viewport.render();
        }

        const tg = ToolGroupManager.createToolGroup('sewa-viewport');
        if (tg) {
          tg.addTool(WindowLevelTool.toolName);
          tg.addTool(PanTool.toolName);
          tg.addTool(ZoomTool.toolName);
          tg.addTool(LengthTool.toolName);
          tg.addViewport('sewa-viewport', 'sewa-dicom-engine');
        }
        activateTool('wl');
        setLoading(false);
      } catch (err: any) {
        if (!destroyed) {
          setError(err?.message || 'Failed to initialize DICOM viewer');
          setLoading(false);
        }
      }
    })();

    return () => {
      destroyed = true;
      const engine = new RenderingEngine('sewa-dicom-engine');
      engine.destroy();
    };
  }, [storageUrl, activateTool]);

  return (
    <div className="relative flex-1 bg-black overflow-hidden" style={{ minHeight: 400 }}>
      <div className="absolute top-3 left-3 z-20 flex gap-1">
        {toolbarTools.map(t => (
          <button
            key={t.id}
            onClick={() => activateTool(t.id)}
            className={`px-2 py-1 text-xs rounded font-mono font-semibold transition-all ${
              tool === t.id
                ? 'bg-[#52B09A] text-black shadow-[0_0_8px_#52B09A80]'
                : 'bg-[#1A2A26] text-[#6FA898] hover:bg-[#243A34]'
            }`}
            title={t.label}
          >
            <span className="mr-1">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div ref={containerRef} className="w-full h-full" style={{ touchAction: 'none' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ color: '#52B09A', fontFamily: "'IBM Plex Mono',monospace" }}>
            <div className="text-center">
              <div className="text-3xl mb-4 animate-pulse">{'\u27F3'}</div>
              <div className="text-sm font-semibold mb-1">
                {storageUrl ? 'Loading DICOM via WADO...' : 'No study selected'}
              </div>
              {storageUrl && <div className="text-xs opacity-60">Decoding with Cornerstone3D</div>}
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center p-6 rounded bg-[#1A0A0A] border border-[#E0353530]">
              <div className="text-red-400 text-lg mb-2">{'\u26A0'}</div>
              <div className="text-red-300 text-sm font-mono">{error}</div>
            </div>
          </div>
        )}
      </div>

      {showGradcam && findings?.map((f, i) => (
        <div
          key={i}
          className="absolute border-2 border-dashed border-red-500 bg-red-500/10"
          style={{
            top: `${f.y}%`, left: `${f.x}%`,
            width: `${f.width}%`, height: `${f.height}%`,
          }}
        >
          <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-bl font-mono font-bold">
            AI: {f.label}
          </span>
        </div>
      ))}

      <div className="absolute bottom-3 right-3 z-20 text-[10px] font-mono text-[#3A6055] bg-black/50 px-2 py-1 rounded">
        {modality || '?'}
      </div>
    </div>
  );
}
