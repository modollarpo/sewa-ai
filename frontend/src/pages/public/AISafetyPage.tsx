import React from 'react';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

export function AISafetyPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <div className="bg-[#05100D] text-[#D0ECE6] min-h-screen font-sans overflow-x-hidden pt-24">
      <PublicNav activePage="ai-safety" onNavigate={onNavigate} />
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-4xl md:text-5xl font-black mb-8 text-[#408D7B]">AI Safety & Trust</h1>
        <p className="text-lg text-[#6FA898] mb-12">
          Safety is at the core of the SEWA XAI platform. We believe AI in healthcare must be fully transparent, explainable, and capable of knowing its own limitations.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#0C1D17] border border-[#1B3028] rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4 text-[#D0ECE6]">Uncertainty Quantification</h2>
            <p className="text-[#6FA898]">
              Our models don't just provide predictions; they provide confidence intervals. By employing Monte Carlo dropout and ensemble methods, we calculate epistemic and aleatoric uncertainty for every scan, flagging low-confidence results for immediate human review.
            </p>
          </div>
          <div className="bg-[#0C1D17] border border-[#1B3028] rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4 text-[#D0ECE6]">Explainable AI (XAI)</h2>
            <p className="text-[#6FA898]">
              Black-box AI is unacceptable in clinical workflows. We utilize state-of-the-art pixel attribution methods (like Grad-CAM) to highlight exactly which parts of a scan influenced the AI's findings.
            </p>
          </div>
          <div className="bg-[#0C1D17] border border-[#1B3028] rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4 text-[#D0ECE6]">Metacognition & Hallucination Defense</h2>
            <p className="text-[#6FA898]">
              Our VLM reports are evaluated by an independent cross-checking mechanism before they are presented to the clinician. This multi-layer self-evaluation prevents hallucinations and ensures factual accuracy.
            </p>
          </div>
        </div>
      </div>
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
