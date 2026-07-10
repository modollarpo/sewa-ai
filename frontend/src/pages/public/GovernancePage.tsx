import React from 'react';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

export function GovernancePage({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <div className="bg-[#05100D] text-[#D0ECE6] min-h-screen font-sans overflow-x-hidden pt-24">
      <PublicNav activePage="governance" onNavigate={onNavigate} />
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-4xl md:text-5xl font-black mb-8 text-[#408D7B]">Clinical Governance & Oversight</h1>
        <p className="text-lg text-[#6FA898] mb-12">
          At SEWA XAI, clinical governance is not an afterthought; it is embedded in the platform's architecture. 
          Our clinical safety and governance procedures align with the highest international standards.
        </p>
        <div className="bg-[#0C1D17] border border-[#1B3028] rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-[#D0ECE6]">Clinical Safety Standards (DCB0129)</h2>
          <p className="text-[#6FA898]">
            We are actively implementing the DCB0129 standard (Clinical Risk Management: its Application in the Manufacture of Health IT Systems). This ensures that hazard logs, clinical safety cases, and rigorous risk assessments are maintained throughout the product lifecycle.
          </p>
        </div>
        <div className="bg-[#0C1D17] border border-[#1B3028] rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-[#D0ECE6]">Quality Management System (QMS)</h2>
          <p className="text-[#6FA898]">
            Our QMS is designed around ISO 13485 requirements, laying the groundwork for future UKCA and CE marking as a Class IIb Medical Device under the UK MDR 2002 and EU MDR 2017/745.
          </p>
        </div>
        <div className="bg-[#0C1D17] border border-[#1B3028] rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-[#D0ECE6]">Data Security & Privacy</h2>
          <p className="text-[#6FA898]">
            SEWA XAI supports end-to-end encryption, Zero-Knowledge proofs for consent, and federated learning architectures to maintain strict compliance with GDPR, HIPAA, and NHS DSPT standards.
          </p>
        </div>
      </div>
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
