-- Migration: Add Correction, TrainingRun, FeatureDriftSnapshot for CL
-- Generated: 2026-07-14

-- ── Corrections: radiologist feedback on AI predictions ─────────
CREATE TABLE "corrections" (
    "id"              TEXT      NOT NULL PRIMARY KEY,
    "scan_id"         TEXT      NOT NULL,
    "tenant_id"       TEXT      NOT NULL,
    "radiologist_id"  TEXT      NOT NULL,
    "ai_finding"      TEXT      NOT NULL,
    "ai_urgency"      TEXT      NOT NULL,
    "ai_confidence"   REAL      NOT NULL,
    "human_finding"   TEXT      NOT NULL,
    "human_urgency"   TEXT      NOT NULL,
    "correction_type" TEXT      NOT NULL,
    "modality"        TEXT      NOT NULL,
    "body_part"       TEXT      NOT NULL,
    "ground_truth_label" INTEGER,
    "notes"           TEXT,
    "is_critical_miss" BOOLEAN  NOT NULL DEFAULT FALSE,
    "model_version"   TEXT,
    "training_used"   BOOLEAN  NOT NULL DEFAULT FALSE,
    "created_at"      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "corrections_tenant_created_idx"   ON "corrections"("tenant_id", "created_at");
CREATE INDEX "corrections_scan_id_idx"          ON "corrections"("scan_id");
CREATE INDEX "corrections_type_idx"             ON "corrections"("correction_type");
CREATE INDEX "corrections_training_used_idx"    ON "corrections"("training_used");

-- ── Training runs: record of each fine-tuning execution ─────────
CREATE TABLE "training_runs" (
    "id"                   TEXT      NOT NULL PRIMARY KEY,
    "model_type"           TEXT      NOT NULL,
    "base_version"         TEXT      NOT NULL,
    "target_version"       TEXT      NOT NULL,
    "status"               TEXT      NOT NULL DEFAULT 'pending',
    "training_samples"     INTEGER   NOT NULL DEFAULT 0,
    "epochs"               INTEGER   NOT NULL DEFAULT 10,
    "batch_size"           INTEGER   NOT NULL DEFAULT 32,
    "learning_rate"        REAL      NOT NULL DEFAULT 0.0001,
    "finding_distribution" JSON,
    "correction_types"     JSON,
    "tenant_ids"           TEXT[]    NOT NULL DEFAULT '{}',
    "accuracy"             REAL,
    "precision"            REAL,
    "recall"               REAL,
    "f1_score"             REAL,
    "loss"                 REAL,
    "model_path"           TEXT,
    "triggered_by"         TEXT      NOT NULL DEFAULT 'auto_threshold',
    "drift_snapshot"       JSON,
    "error_message"        TEXT,
    "started_at"           TIMESTAMP,
    "completed_at"         TIMESTAMP,
    "rollback_at"          TIMESTAMP,
    "rollback_reason"      TEXT,
    "created_at"           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "training_runs_model_status_idx"   ON "training_runs"("model_type", "status");
CREATE INDEX "training_runs_status_idx"         ON "training_runs"("status");
CREATE INDEX "training_runs_created_idx"        ON "training_runs"("created_at");

-- ── Feature drift snapshots: periodic distribution comparisons ──
CREATE TABLE "feature_drift_snapshots" (
    "id"               TEXT      NOT NULL PRIMARY KEY,
    "model_type"       TEXT      NOT NULL,
    "model_version"    TEXT      NOT NULL,
    "baseline_window"  TIMESTAMP NOT NULL,
    "current_window"   TIMESTAMP NOT NULL,
    "psi"              REAL      NOT NULL DEFAULT 0.0,
    "kappa"            REAL      NOT NULL DEFAULT 1.0,
    "feature_dists"    JSON,
    "modality_shift"   JSON,
    "body_part_shift"  JSON,
    "severity_shift"   JSON,
    "drift_detected"   BOOLEAN   NOT NULL DEFAULT FALSE,
    "severity"         TEXT      NOT NULL DEFAULT 'none',
    "created_at"       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "drift_model_version_idx" ON "feature_drift_snapshots"("model_type", "model_version", "drift_detected");
CREATE INDEX "drift_created_idx"       ON "feature_drift_snapshots"("created_at");

-- ── Training run corrections: data versioning (which corrections used) ──
CREATE TABLE "training_run_corrections" (
    "run_id"        TEXT NOT NULL REFERENCES "training_runs"("id") ON DELETE CASCADE,
    "correction_id" TEXT NOT NULL REFERENCES "corrections"("id") ON DELETE CASCADE,
    PRIMARY KEY ("run_id", "correction_id")
);

CREATE INDEX "trc_run_id_idx"        ON "training_run_corrections"("run_id");
CREATE INDEX "trc_correction_id_idx" ON "training_run_corrections"("correction_id");
