// SEWA XAI — backend/src/__tests__/clinicalMode.test.ts
import {
  assertClinicalModeSafe,
  detectDemoStages,
  DemoWeightsInClinicalModeError,
  type StageProvenance,
} from '../services/clinicalMode';

const clean: StageProvenance[] = [
  { stage: 'triage', demoMode: false, backend: 'onnx-int8-cpu' },
  { stage: 'uncertainty', demoMode: false, backend: 'onnx-fp32-cpu' },
];

const demo: StageProvenance[] = [
  { stage: 'triage', demoMode: true, backend: 'demo' },
  { stage: 'uncertainty', demoMode: true, backend: 'demo' },
];

describe('detectDemoStages', () => {
  it('returns nothing when all stages use validated weights', () => {
    expect(detectDemoStages(clean)).toEqual([]);
  });

  it('names the demo stage and its backend', () => {
    expect(detectDemoStages(demo)).toEqual(['triage (demo)', 'uncertainty (demo)']);
  });

  it('omits the backend suffix when none is reported', () => {
    expect(detectDemoStages([{ stage: 'vlm', demoMode: true }])).toEqual(['vlm']);
  });
});

describe('assertClinicalModeSafe', () => {
  it('allows demo weights when clinical mode is off (research/demo)', () => {
    expect(() => assertClinicalModeSafe(false, demo)).not.toThrow();
  });

  it('allows validated weights in clinical mode', () => {
    expect(() => assertClinicalModeSafe(true, clean)).not.toThrow();
  });

  it('fails closed when demo weights reach clinical mode', () => {
    expect(() => assertClinicalModeSafe(true, demo)).toThrow(DemoWeightsInClinicalModeError);
  });

  it('reports which stages violated the gate', () => {
    try {
      assertClinicalModeSafe(true, [demo[0], clean[1]]);
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(DemoWeightsInClinicalModeError);
      expect((err as DemoWeightsInClinicalModeError).stages).toEqual(['triage (demo)']);
    }
  });
});
