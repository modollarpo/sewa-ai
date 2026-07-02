import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';
import { Network, Server, ShieldCheck, Database, RefreshCw, Cpu, Activity, AlertCircle } from 'lucide-react';

const C = {
  bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',bg4:'#162821',
  brand:'#408D7B',brandLt:'#52B09A',
  critical:'#E03535',critBg:'#2A0A0A',
  urgent:'#E08A20',
  normal:'#1DBF73',normalBg:'#0A1F14',
  info:'#2A6EF2',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',
  F:"'IBM Plex Sans',system-ui,sans-serif",
  FM:"'IBM Plex Mono',monospace",
};

export function RoadmapOrchestrator() {
  const [model, setModel] = useState<any>(null);
  const [flNodes, setFlNodes] = useState<any[]>([
    { id: 'node-lond-01', name: 'Royal London Hosp', samples: 450, status: 'ready' },
    { id: 'node-lags-02', name: 'Lagos Univ Coll', samples: 620, status: 'ready' },
    { id: 'node-nair-03', name: 'Nairobi National', samples: 380, status: 'ready' }
  ]);
  const [edgeDevices, setEdgeDevices] = useState<any[]>([
    { id: 'edge-mob-01', name: 'Mobile Clinic Tablet (Taraba)', status: 'offline', lastHeartbeat: '2026-07-02T12:00:00Z', scans: 12 },
    { id: 'edge-mob-02', name: 'Field Unit B (Turkana)', status: 'offline', lastHeartbeat: '2026-07-02T14:30:00Z', scans: 24 }
  ]);
  const [zkLogs, setZkLogs] = useState<any[]>([]);
  const [fusionLogs, setFusionLogs] = useState<any[]>([]);
  const [aggregating, setAggregating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchGlobalModel();
  }, []);

  const fetchGlobalModel = async () => {
    try {
      const res = await apiClient.get('/federated/model');
      setModel(res.data);
    } catch (e) {
      console.error('Failed to load global model', e);
    }
  };

  const runFederatedAggregation = async () => {
    setAggregating(true);
    setMessage('Uploading gradients and starting FedAvg aggregation...');
    try {
      // First simulate uploads from the active nodes
      for (const node of flNodes) {
        await apiClient.post('/federated/upload', {
          nodeId: node.id,
          weights: {
            conv1: Array.from({ length: 5 }, () => parseFloat((Math.random() - 0.5).toFixed(4))),
            dense1: Array.from({ length: 5 }, () => parseFloat((Math.random() - 0.5).toFixed(4)))
          },
          samples: node.samples
        });
      }

      // Then trigger central aggregation
      const res = await apiClient.post('/federated/aggregate');
      setModel(res.data.globalModel);
      setMessage(res.data.message);
    } catch (e: any) {
      setMessage(`Aggregation error: ${e.response?.data?.message || e.message}`);
    } finally {
      setAggregating(false);
    }
  };

  const triggerEdgeSync = async (deviceId: string, scansCount: number) => {
    // Generate simulated scans to push
    const simulatedScans = Array.from({ length: scansCount }, (_, i) => ({
      localId: `local-${deviceId}-${i}`,
      patientMrn: `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
      patientSex: Math.random() > 0.5 ? 'M' : 'F',
      patientDob: '1975-06-15',
      modality: Math.random() > 0.4 ? 'CT' : 'XR',
      bodyPart: 'Head',
      priority: Math.random() > 0.8 ? 'STAT' : 'ROUTINE',
      accessionNumber: `ACC-${Math.floor(1000000 + Math.random() * 9000000)}`,
      dicomInstanceUid: `1.2.840.113619.2.${Math.floor(10000 + Math.random() * 90000)}`
    }));

    try {
      const res = await apiClient.post('/edge-sync/sync', {
        edgeDeviceId: deviceId,
        scans: simulatedScans
      });
      
      // Update local state
      setEdgeDevices(prev => prev.map(d => d.id === deviceId ? { ...d, status: 'online', scans: 0 } : d));
      alert(`Synchronized ${res.data.syncedCount} scans from Edge Device ${deviceId}. skipped: ${res.data.skippedCount}`);
    } catch (e) {
      console.error('Edge Sync failed', e);
    }
  };

  const verifyZkConsent = async () => {
    // Generate valid mock zk-SNARK Groth16 pairing proof components
    // pairingInput = pi_a + pi_b + pi_c
    const pi_a = ["12093810293810", "48203810238120"];
    const pi_b = [["92038102", "19238102"], ["293810293", "293810238"]];
    const pi_c = ["2938102938", "102938102"];
    const pairingInput = pi_a.join('') + pi_b.map(arr => arr.join('')).join('') + pi_c.join('');
    
    // Deterministic signature simulation hash
    const proofHash = pairingInput.slice(0, 16); // Simulate computed hash signature prefix

    const mrnCommitment = `commitment-${crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}`;

    try {
      const res = await apiClient.post('/zk-consent/verify', {
        proof: { pi_a, pi_b, pi_c },
        publicSignals: {
          mrnCommitment,
          tenantIdHash: 'tenant-hash-01',
          proofHash
        }
      });
      setZkLogs(prev => [res.data, ...prev]);
    } catch (e) {
      console.error('ZK Verification failed', e);
    }
  };

  const triggerMultimodalFusion = async () => {
    // We assume a head CT scan is running, evaluate risk adjusting variables
    const labs = { troponin: 0.55, dDimer: 620, gcs: 7 };
    const clinicalHistory = { onAnticoagulants: true, priorStroke: false };

    try {
      // Retrieve first scan
      const scansRes = await apiClient.get('/scans');
      const scanId = scansRes.data?.scans?.[0]?.id;
      if (!scanId) {
        alert('No active scans found to run Multimodal Fusion simulation');
        return;
      }

      const res = await apiClient.post(`/clinical-fusion/evaluate/${scanId}`, {
        labs,
        clinicalHistory
      });
      setFusionLogs(prev => [res.data, ...prev]);
    } catch (e) {
      console.error('Fusion evaluation failed', e);
    }
  };

  return (
    <div style={{ flex: 1, padding: 40, background: C.bg1, color: C.textHi, overflowY: 'auto', fontFamily: C.F }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Advanced AI & Decentralization Control Room</h1>
          <p style={{ color: C.textMd, fontSize: 14, marginTop: 8 }}>Orchestrate Federated Learning, Edge Sync, Clinical Fusion, and ZK Privacy</p>
        </div>
        <div style={{ background: C.bg3, border: `1px solid ${C.border}`, padding: '12px 24px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Network size={20} color={C.brand} />
          <div>
            <div style={{ fontSize: 10, color: C.textLo, textTransform: 'uppercase' }}>Global Version</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.brandLt }}>v{model?.version || 1}</div>
          </div>
        </div>
      </div>

      {message && (
        <div style={{ padding: 16, background: C.bg3, borderLeft: `4px solid ${C.brand}`, borderRadius: 8, marginBottom: 24, fontSize: 14 }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        
        {/* Panel 1: Federated Aggregator */}
        <div style={{ background: C.bg2, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 }}>
          <h2 style={{ fontSize: 18, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cpu color={C.brandLt} size={20} />
            Federated Learning (FedAvg) Coordinator
          </h2>
          <div style={{ background: C.bg1, borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: C.textLo, marginBottom: 8 }}>Global Model Weight Weights</div>
            <div style={{ fontFamily: C.FM, fontSize: 12, color: C.brandLt }}>
              conv1: {JSON.stringify(model?.weights?.conv1)}
            </div>
            <div style={{ fontFamily: C.FM, fontSize: 12, color: C.brandLt, marginTop: 4 }}>
              dense1: {JSON.stringify(model?.weights?.dense1)}
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {flNodes.map(node => (
              <div key={node.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: C.bg3, borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{node.name}</div>
                  <div style={{ fontSize: 11, color: C.textLo }}>{node.samples} scans for training</div>
                </div>
                <span style={{ fontSize: 12, color: C.normal, background: `${C.normal}15`, padding: '4px 10px', borderRadius: 12, alignSelf: 'center' }}>
                  {node.status}
                </span>
              </div>
            ))}
          </div>

          <button 
            onClick={runFederatedAggregation} 
            disabled={aggregating}
            style={{ width: '100%', padding: 12, background: C.brand, color: C.bg1, border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <RefreshCw size={16} className={aggregating ? 'animate-spin' : ''} />
            {aggregating ? 'Aggregating...' : 'Trigger Weight Aggregation (FedAvg)'}
          </button>
        </div>

        {/* Panel 2: Edge Sync Gateway */}
        <div style={{ background: C.bg2, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 }}>
          <h2 style={{ fontSize: 18, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Server color={C.brandLt} size={20} />
            Edge Device Registry & Sync Gateway
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {edgeDevices.map(device => (
              <div key={device.id} style={{ padding: 16, background: C.bg3, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{device.name}</span>
                  <span style={{ fontSize: 11, color: device.status === 'online' ? C.normal : C.urgent }}>{device.status.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textLo }}>
                  <span>Queued Scans: {device.scans}</span>
                  <span>Last Checked: {new Date(device.lastHeartbeat).toLocaleTimeString()}</span>
                </div>
                {device.scans > 0 && (
                  <button 
                    onClick={() => triggerEdgeSync(device.id, device.scans)}
                    style={{ marginTop: 12, width: '100%', padding: '6px 12px', background: C.bg4, color: C.textHi, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}
                  >
                    Sync Offline Queue
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Panel 3: Multimodal Clinical Fusion */}
        <div style={{ background: C.bg2, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 }}>
          <h2 style={{ fontSize: 18, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity color={C.brandLt} size={20} />
            Multimodal Clinical Fusion
          </h2>
          <p style={{ fontSize: 13, color: C.textMd, marginBottom: 20 }}>
            Evaluates clinical background risk (e.g. Troponin, GCS, medication statement of blood thinners) to automatically adjust scan priority urgency.
          </p>
          <button 
            onClick={triggerMultimodalFusion}
            style={{ width: '100%', padding: 12, background: C.info, color: '#FFF', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', marginBottom: 20 }}
          >
            Trigger Multimodal Fusion Check
          </button>
          
          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {fusionLogs.map((log, idx) => (
              <div key={idx} style={{ padding: 12, background: C.bg3, borderRadius: 8, borderLeft: `4px solid ${C.info}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  <span>Fusion Upgrade Check</span>
                  <span style={{ color: C.critical }}>Factor: {log.adjustmentFactor}x</span>
                </div>
                <div style={{ fontSize: 12, color: C.textMd }}>
                  Urgency: {log.originalUrgency} → <strong style={{ color: C.critical }}>{log.fusedUrgency}</strong>
                </div>
                {log.reasons.map((r: string, i: number) => (
                  <div key={i} style={{ fontSize: 11, color: C.textLo, marginTop: 4 }}>• {r}</div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Panel 4: Cryptographic zk-SNARK Consent */}
        <div style={{ background: C.bg2, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 }}>
          <h2 style={{ fontSize: 18, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck color={C.brandLt} size={20} />
            Zero-Knowledge Privacy Proofs
          </h2>
          <p style={{ fontSize: 13, color: C.textMd, marginBottom: 20 }}>
            Performs cryptographic zk-SNARK circuit pairing checks verifying patient consent hashes without leaking healthcare IDs.
          </p>
          <button 
            onClick={verifyZkConsent}
            style={{ width: '100%', padding: 12, background: C.brandLt, color: C.bg1, border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', marginBottom: 20 }}
          >
            Verify New zk-SNARK Proof
          </button>
          
          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {zkLogs.map((log, idx) => (
              <div key={idx} style={{ padding: 12, background: C.bg3, borderRadius: 8, borderLeft: `4px solid ${C.brand}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  <span style={{ color: C.brandLt }}>Circuit: {log.details?.circuitName}</span>
                  <span style={{ color: C.normal }}>VERIFIED</span>
                </div>
                <div style={{ fontSize: 11, fontFamily: C.FM, color: C.textLo }}>
                  Commitment: {log.details?.mrnCommitment}
                </div>
                <div style={{ fontSize: 11, fontFamily: C.FM, color: C.textLo }}>
                  Proof Signature: {log.details?.proofHash}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
