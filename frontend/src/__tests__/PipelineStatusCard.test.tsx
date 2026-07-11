import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PipelineStatusCard } from '../design-system/components';

describe('PipelineStatusCard', () => {
  it('renders stage label when stage is set', () => {
    render(
      <PipelineStatusCard
        stage="triage_uncertainty"
        elapsedMs={850}
        stageTimings={{}}
        qualityFlags={[]}
      />
    );
    expect(screen.getByText('AI Pipeline')).toBeInTheDocument();
    expect(screen.getByText(/^\d+\.\ds$/)).toBeInTheDocument();
  });

  it('renders compact mode', () => {
    render(
      <PipelineStatusCard
        stage="vlm"
        elapsedMs={320}
        compact
      />
    );
    expect(screen.getByText('VLM Report')).toBeInTheDocument();
  });

  it('renders quality flags', () => {
    render(
      <PipelineStatusCard
        stage="preprocessing"
        elapsedMs={100}
        qualityFlags={['MOTION_ARTIFACT', 'NOISE']}
      />
    );
    expect(screen.getByText(/MOTION_ARTIFACT/)).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(
      <PipelineStatusCard
        stage="failed"
        elapsedMs={500}
        errorMessage="AI service timeout"
      />
    );
    expect(screen.getByText('AI service timeout')).toBeInTheDocument();
  });

  it('renders null stage as Queued', () => {
    render(
      <PipelineStatusCard
        stage={null}
        elapsedMs={0}
        compact
      />
    );
    expect(screen.getByText('Queued')).toBeInTheDocument();
  });

  it('shows stage timings', () => {
    render(
      <PipelineStatusCard
        stage="complete"
        elapsedMs={1200}
        stageTimings={{ triage: 320, vlm: 28, metacog: 15 }}
      />
    );
    expect(screen.getByText(/triage: 320ms/)).toBeInTheDocument();
    expect(screen.getByText(/vlm: 28ms/)).toBeInTheDocument();
    expect(screen.getByText(/metacog: 15ms/)).toBeInTheDocument();
  });
});
