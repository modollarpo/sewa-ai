const API_URL = 'http://localhost:3000/api/v1/ai/edge/sync';

async function simulateOfflineSync() {
  console.log('📡 [Edge Node] Restored 4G Connection. Preparing to sync offline payload...');
  
  // Create dummy payload of offline scans
  const numScans = Math.floor(Math.random() * 50) + 10; 
  const payload = {
    deviceId: 'EDGE-NG-001',
    tenantId: '54e0b0e9-b542-4f36-9ab5-16781fbc03ff', // using the default tenant from init DB
    region: 'Lagos Rural Mobile Clinic',
    scans: Array.from({ length: numScans }).map(() => ({
      accessionNumber: `EDGE-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      fileSize: Math.floor(Math.random() * 30000000) + 10000000, // 10MB - 40MB
      modality: 'XR',
      bodyPart: 'Chest',
      status: 'ai_complete',
      aiFindings: { "Tuberculosis": 0.88, "Pneumonia": 0.12 }
    }))
  };

  console.log(`📦 [Edge Node] Transmitting ${numScans} scans to central SEWA Azure cluster...`);
  
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Sync failed');
    console.log(`✅ [Edge Node] Sync Success:`, data);
  } catch (err: any) {
    console.error(`❌ [Edge Node] Sync Failed:`, err.message);
  }
}

simulateOfflineSync();
