import React from 'react';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

export function PublicationsPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <div className="bg-[#05100D] text-[#D0ECE6] min-h-screen font-sans overflow-x-hidden pt-24">
      <PublicNav activePage="publications" onNavigate={onNavigate} />
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-4xl md:text-5xl font-black mb-8 text-[#408D7B]">Research & Publications</h1>
        <p className="text-lg text-[#6FA898] mb-12">
          SEWA XAI's core algorithms are rooted in academic research and transparent engineering practices. 
          While our clinical trials are currently in the planning phase, our technical methodologies are actively being prepared for peer-review.
        </p>
        <div className="bg-[#0C1D17] border border-[#1B3028] rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-[#D0ECE6]">Forthcoming Publications</h2>
          <ul className="list-disc pl-6 text-[#6FA898] space-y-4">
            <li>
              <strong>Uncertainty Quantification in Triage AI</strong>
              <p className="mt-1">A comprehensive evaluation of Monte Carlo dropout applied to emergency radiology triage algorithms across diverse, multi-ethnic datasets.</p>
            </li>
            <li>
              <strong>Federated Learning for Cross-Border Diagnostic AI</strong>
              <p className="mt-1">Engineering architecture and privacy-preserving methodologies for continuous model improvement without data centralization.</p>
            </li>
            <li>
              <strong>Metacognitive Defenses in Vision-Language Models</strong>
              <p className="mt-1">Addressing hallucination rates in automated radiology report generation using multi-agent self-reflection pipelines.</p>
            </li>
          </ul>
        </div>
      </div>
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
