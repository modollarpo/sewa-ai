import React from 'react';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const C = {
  bg1:'#08160F', brand:'#408D7B', textHi:'#D0ECE6', textMd:'#6FA898',
};

export function ClinicalEvidencePage({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <div className="bg-[#05100D] text-[#D0ECE6] min-h-screen font-sans overflow-x-hidden pt-24">
      <PublicNav activePage="clinical-evidence" onNavigate={onNavigate} />
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-4xl md:text-5xl font-black mb-8 text-[#408D7B]">Clinical Evidence</h1>
        <p className="text-lg text-[#6FA898] mb-12">
          SEWA XAI is built on robust, peer-reviewed engineering. Our models undergo extensive retrospective testing and we are actively engaging in clinical safety reviews under the DCB0129 standard.
        </p>
        <div className="bg-[#0C1D17] border border-[#1B3028] rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">Engineering Validation (TRL 5)</h2>
          <p className="text-[#6FA898]">
            Our AI models (Triage, Uncertainty, and Metacognition) have been validated in simulated clinical environments using diverse datasets. We achieve an AUC &gt; 0.95 in detecting critical findings in engineering benchmarks.
          </p>
        </div>
        <div className="bg-[#0C1D17] border border-[#1B3028] rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">NHS Innovation Service</h2>
          <p className="text-[#6FA898]">
            SEWA XAI is actively supported by the NHS Innovation Service (INN-2604-0064-2) and we are progressing through the required regulatory pathways to ensure safety, efficacy, and trust before full commercial deployment.
          </p>
        </div>
      </div>
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
