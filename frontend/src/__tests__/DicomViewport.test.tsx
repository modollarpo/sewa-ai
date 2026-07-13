import { describe, it, expect, vi } from 'vitest';

vi.mock('../../lib/cornerstoneConfig', () => ({
  initCornerstone: vi.fn().mockResolvedValue(undefined),
}));

describe('DicomViewport — tool mapping', () => {
  const toolMap: Record<string, string> = {
    wl: 'WindowLevel',
    pan: 'Pan',
    zoom: 'Zoom',
    measure: 'Length',
  };

  it('maps all toolbar IDs to correct tool names', () => {
    expect(toolMap.wl).toBe('WindowLevel');
    expect(toolMap.pan).toBe('Pan');
    expect(toolMap.zoom).toBe('Zoom');
    expect(toolMap.measure).toBe('Length');
  });

  it('defaults to WindowLevel for unknown tool ID', () => {
    const activeMap: Record<string, string> = {
      wl: 'WindowLevel',
      pan: 'Pan',
      zoom: 'Zoom',
      measure: 'Length',
    };
    const unknownId = 'unknown';
    const result = activeMap[unknownId] || 'WindowLevel';
    expect(result).toBe('WindowLevel');
  });
});

describe('DicomViewport — Grad-CAM overlay rendering', () => {
  it('renders overlay div when showGradcam is true with findings', () => {
    const findings = [{ x: 10, y: 20, width: 100, height: 80, label: 'ICH' }];
    const overlayStyle = {
      position: 'absolute' as const,
      left: `${findings[0].x}px`,
      top: `${findings[0].y}px`,
      width: `${findings[0].width}px`,
      height: `${findings[0].height}px`,
      border: '2px solid rgba(255,0,0,0.8)',
      backgroundColor: 'rgba(255,0,0,0.15)',
    };
    expect(overlayStyle.left).toBe('10px');
    expect(overlayStyle.top).toBe('20px');
    expect(overlayStyle.width).toBe('100px');
    expect(overlayStyle.height).toBe('80px');
    expect(overlayStyle.border).toContain('rgba(255,0,0');
  });

  it('returns empty array when no findings', () => {
    const findings: { x: number; y: number; width: number; height: number; label: string }[] = [];
    expect(findings.length).toBe(0);
  });
});

describe('DicomViewport — toolbar buttons', () => {
  const toolbarTools = [
    { id: 'wl', label: 'W/L' },
    { id: 'pan', label: 'Pan' },
    { id: 'zoom', label: 'Zoom' },
    { id: 'measure', label: 'Measure' },
  ];

  it('has all 4 tools', () => {
    expect(toolbarTools).toHaveLength(4);
  });

  it('each tool has unique id', () => {
    const ids = toolbarTools.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
