// SEWA XAI — backend/src/services/clinicalMode.ts
// ─────────────────────────────────────────────────────────────────
// Fail-closed guard for clinical (real-patient) operation.
//
// When CLINICAL_MODE is enabled the platform must never emit an
// inference that was produced by demo/synthetic weights — that would be
// presenting invented output as if it were a validated model. Every stage
// that can run on placeholder weights reports its provenance; this module is
// the single place that decides whether that provenance is acceptable.
//
// The check is a pure function so it is unit-testable without a database or
// any running service, and so the policy lives in exactly one place.

/** A stage's model provenance as reported by its service response. */
export interface StageProvenance {
  /** Human-readable stage name, e.g. "triage", "uncertainty". */
  stage: string;
  /** True when the stage produced its output from demo/random/synthetic weights. */
  demoMode: boolean;
  /** Optional backend label (e.g. "demo", "onnx-int8-cpu") for the message. */
  backend?: string;
}

export class DemoWeightsInClinicalModeError extends Error {
  readonly stages: string[];

  constructor(stages: string[]) {
    super(
      `[clinical-mode] Refusing to produce clinical output: stage(s) ran with demo/synthetic ` +
      `weights — ${stages.join(', ')}. Supply validated model weights or run with ` +
      `CLINICAL_MODE=false.`,
    );
    this.name = 'DemoWeightsInClinicalModeError';
    this.stages = stages;
  }
}

/**
 * Return the names of stages that ran on demo/synthetic weights.
 * Pure — no side effects, no env access.
 */
export function detectDemoStages(stages: readonly StageProvenance[]): string[] {
  return stages
    .filter(s => s.demoMode)
    .map(s => (s.backend ? `${s.stage} (${s.backend})` : s.stage));
}

/**
 * Fail-closed gate. When clinicalMode is true and any stage reports demo
 * weights, throws DemoWeightsInClinicalModeError. When clinicalMode is false
 * this is a no-op (demo/research mode is allowed).
 */
export function assertClinicalModeSafe(
  clinicalMode: boolean,
  stages: readonly StageProvenance[],
): void {
  const demoStages = detectDemoStages(stages);
  if (clinicalMode && demoStages.length > 0) {
    throw new DemoWeightsInClinicalModeError(demoStages);
  }
}
