export type ServiceName = 'triage' | 'uncertainty' | 'vlm' | 'metacognition';

export interface Boundary {
  name: ServiceName;
  baseEnv: string;
  defaultBase: string;
  health: string;
  predict: string;
}

export const BOUNDARIES: Record<ServiceName, Boundary> = {
  triage: { name: 'triage', baseEnv: 'TRIAGE_URL', defaultBase: 'http://localhost:8000', health: '/health', predict: '/triage/predict' },
  uncertainty: { name: 'uncertainty', baseEnv: 'UNCERTAINTY_URL', defaultBase: 'http://localhost:8002', health: '/health', predict: '/uncertainty/explain' },
  vlm: { name: 'vlm', baseEnv: 'VLM_URL', defaultBase: 'http://localhost:8001', health: '/health', predict: '/vlm/report' },
  metacognition: { name: 'metacognition', baseEnv: 'METACOGNITION_URL', defaultBase: 'http://localhost:8003', health: '/health', predict: '/metacognition/evaluate' }
} as const;
