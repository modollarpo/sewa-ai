import React from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';

interface Scan {
  id: string;
  urgency: 'CRITICAL' | 'URGENT' | 'NORMAL' | 'ROUTINE';
  patient: {
    firstName: string;
    lastName: string;
  };
  aiResult: {
    primaryFinding: string;
    confidence: number;
  };
}

interface TriageListProps {
  scans: Scan[];
}

export default function TriageList({ scans }: TriageListProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/50 backdrop-blur-xl text-white shadow-2xl">
      <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
          Priority AI Worklist
        </h2>
        <span className="text-xs text-slate-400 font-mono">LIVE TELEMETRY</span>
      </div>
      <table className="min-w-full divide-y divide-slate-800">
        <thead className="bg-slate-900/80">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Priority</th>
            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Patient</th>
            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">AI Finding</th>
            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Confidence</th>
            <th className="px-6 py-4"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {scans.map((scan) => (
            <tr 
              key={scan.id} 
              className={`group transition-all hover:bg-slate-900/50 ${
                scan.urgency === 'CRITICAL' ? 'bg-red-950/10' : ''
              }`}
            >
              <td className="px-6 py-5 whitespace-nowrap">
                {scan.urgency === 'CRITICAL' ? (
                  <span className="flex items-center text-red-500 font-bold animate-pulse">
                    <AlertTriangle className="mr-2 h-4 w-4" /> EMERGENCY
                  </span>
                ) : (
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    scan.urgency === 'URGENT' ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {scan.urgency}
                  </span>
                )}
              </td>
              <td className="px-6 py-5 whitespace-nowrap font-medium">
                {scan.patient.firstName} {scan.patient.lastName}
              </td>
              <td className="px-6 py-5 whitespace-nowrap font-mono text-sm">
                <span className={scan.urgency === 'CRITICAL' ? 'text-red-400' : 'text-blue-400'}>
                  {scan.aiResult.primaryFinding}
                </span>
              </td>
              <td className="px-6 py-5 whitespace-nowrap w-48">
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        scan.aiResult.confidence > 0.9 ? 'bg-green-500' : 
                        scan.aiResult.confidence > 0.7 ? 'bg-blue-500' : 'bg-amber-500'
                      }`} 
                      style={{ width: `${scan.aiResult.confidence * 100}%` }} 
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {(scan.aiResult.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </td>
              <td className="px-6 py-5 text-right">
                <button className="p-1 rounded-full hover:bg-slate-800 text-slate-500 hover:text-white transition-colors">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
