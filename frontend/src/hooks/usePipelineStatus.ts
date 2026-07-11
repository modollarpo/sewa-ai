import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../services/socketService';

export type PipelineStage =
  | 'preprocessing'
  | 'triage_uncertainty'
  | 'vlm'
  | 'metacognition'
  | 'human_review'
  | 'complete'
  | 'failed'
  | null;

export interface PipelineStatus {
  scanId: string;
  stage: PipelineStage;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  elapsedMs: number;
  stageTimings: Record<string, number>;
  qualityFlags: string[];
  qualityScore: number | null;
  errorMessage: string | null;
  requiresHumanReview: boolean;
  humanReviewReason: string | null;
}

export const STAGE_ORDER: PipelineStage[] = [
  'preprocessing',
  'triage_uncertainty',
  'vlm',
  'metacognition',
];

const STAGE_LABELS: Record<string, string> = {
  preprocessing: 'Preprocessing',
  triage_uncertainty: 'Triage & Uncertainty',
  vlm: 'Report Generation',
  metacognition: 'Metacognition',
  human_review: 'Human Review',
  complete: 'Complete',
  failed: 'Failed',
};

export function stageLabel(stage: string | null): string {
  return stage ? STAGE_LABELS[stage] ?? stage : 'Queued';
}

export function usePipelineStatus(scanId: string | null) {
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/pipeline/${id}/status`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPipeline(data);
      }
    } catch {
      // silent — Socket.IO will update
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!scanId) { setPipeline(null); return; }

    fetchStatus(scanId);

    const handler = (data: { scanId: string; stage: PipelineStage; timestamp: string }) => {
      if (data.scanId === scanId) {
        setPipeline(prev => prev
          ? { ...prev, stage: data.stage, status: data.stage === 'complete' ? 'ai_complete' : data.stage === 'failed' ? 'failed' : 'processing' }
          : { scanId: data.scanId, stage: data.stage, status: 'processing', startedAt: data.timestamp, completedAt: null, elapsedMs: 0, stageTimings: {}, qualityFlags: [], qualityScore: null, errorMessage: null, requiresHumanReview: false, humanReviewReason: null }
        );
      }
    };

    socketService.on('pipeline:stage', handler);
    return () => { socketService.off('pipeline:stage'); };
  }, [scanId, fetchStatus]);

  const currentStageIdx = pipeline?.stage ? STAGE_ORDER.indexOf(pipeline.stage as PipelineStage) : -1;
  const isTerminal = pipeline?.stage === 'complete' || pipeline?.stage === 'failed' || pipeline?.stage === 'human_review';

  return {
    pipeline,
    loading,
    currentStageIdx,
    isTerminal,
    refetch: scanId ? () => fetchStatus(scanId) : undefined,
  };
}
