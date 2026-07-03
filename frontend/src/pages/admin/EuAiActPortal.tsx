// SEWA XAI — EuAiActPortal.tsx
import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

const C = {
  bg1: '#08160F', bg2: '#0C1D17', bg3: '#111F1A',
  brand: '#408D7B', brandLt: '#52B09A',
  normal: '#1DBF73', urgent: '#E08A20', critical: '#E03535',
  textHi: '#D0ECE6', textMd: '#6FA898', textLo: '#3A6055',
  border: '#1B3028',
  F: "'IBM Plex Sans',system-ui,sans-serif",
  FM: "'IBM Plex Mono',monospace",
};

interface Model {
  id: string;
  name: string;
  riskCategory: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'REGISTERED' | 'PENDING' | 'DRAFT';
}

export function EuAiActPortal() {
  const [models, setModels] = useState<Model[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [modelsRes, summaryRes] = await Promise.all([
        apiClient.get('/compliance/eu-ai-act/models'),
        apiClient.get('/compliance/eu-ai-act/summary')
      ]);
      setModels(modelsRes.data);
      setSummary(summaryRes.data);
    } catch (e) {
      console.error('[EU_AI_ACT] Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDocumentation = async () => {
    if (!selectedModelId || !notes) return;
    try {
      setSaving(true);
      await apiClient.post('/compliance/eu-ai-act/documentation', {
        modelId: selectedModelId,
        notes
      });
      setNotes('');
      alert('Documentation saved successfully!');
    } catch (e) {
      console.error('[EU_AI_ACT] Failed to save docs:', e);
      alert('Failed to save documentation');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, background: C.bg1, minHeight: '100vh' }}>
        Loading EU AI Act Registry...
      </div>
    );
  }

  return (
    <div style={{
      padding: 24, background: C.bg1,
      minHeight: 'calc(100vh - 76px)', fontFamily: C.F
    }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: C.textHi, fontSize: 24, fontWeight: 800 }}>
          🇪🇺 EU AI Act Registration Portal
        </h1>
        <p style={{ margin: '8px 0', color: C.textMd, fontSize: 14 }}>
          Register and document high/medium-risk AI systems
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 20, background: C.bg2, borderRadius: 16, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textLo, textTransform: 'uppercase', marginBottom: 8 }}>
            Total Models
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: C.brand }}>{summary?.total}</div>
        </div>
        <div style={{ padding: 20, background: C.bg2, borderRadius: 16, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textLo, textTransform: 'uppercase', marginBottom: 8 }}>
            High Risk
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: C.critical }}>{summary?.highRisk}</div>
        </div>
        <div style={{ padding: 20, background: C.bg2, borderRadius: 16, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textLo, textTransform: 'uppercase', marginBottom: 8 }}>
            Medium Risk
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: C.urgent }}>{summary?.mediumRisk}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left: Model List */}
        <div style={{
          padding: 20, background: C.bg2,
          borderRadius: 16, border: `1px solid ${C.border}`
        }}>
          <h3 style={{ margin: '0 0 20px', color: C.textHi, fontSize: 16, fontWeight: 700 }}>
            AI Model Inventory
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {models.map(model => (
              <div
                key={model.id}
                onClick={() => setSelectedModelId(model.id)}
                style={{
                  padding: 16, borderRadius: 12,
                  border: `1px solid ${selectedModelId === model.id ? C.brand : C.border}`,
                  background: selectedModelId === model.id ? `${C.brand}12` : C.bg3,
                  cursor: 'pointer', transition: 'all 150ms'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.textHi }}>
                    {model.name}
                  </div>
                  <span style={{
                    fontSize: 10, padding: '4px 10px',
                    borderRadius: 20, fontWeight: 800,
                    background: model.riskCategory === 'HIGH' ? C.critBg
                      : model.riskCategory === 'MEDIUM' ? C.urgBg
                        : C.normalBg,
                    color: model.riskCategory === 'HIGH' ? C.critical
                      : model.riskCategory === 'MEDIUM' ? C.urgent
                        : C.normal,
                    border: `1px solid ${model.riskCategory === 'HIGH' ? C.critical
                      : model.riskCategory === 'MEDIUM' ? C.urgent
                        : C.normal}30`
                  }}>
                    {model.riskCategory}
                  </span>
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: C.textMd, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', background: C.bg4, borderRadius: 12, color: C.normal }}>
                    {model.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Documentation Editor */}
        <div style={{
          padding: 20, background: C.bg2,
          borderRadius: 16, border: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', gap: 16
        }}>
          <h3 style={{ margin: 0, color: C.textHi, fontSize: 16, fontWeight: 700 }}>
            Model Documentation
          </h3>

          {selectedModelId ? (
            <>
              <div style={{
                padding: 16, background: C.bg3,
                borderRadius: 12, border: `1px solid ${C.border}`
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.textHi, marginBottom: 4 }}>
                  {models.find(m => m.id === selectedModelId)?.name}
                </div>
                <div style={{ fontSize: 12, color: C.textMd }}>
                  ID: {selectedModelId}
                </div>
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add documentation notes (e.g., intended use, human oversight plan, bias assessment)..."
                style={{
                  flex: 1,
                  width: '100%',
                  minHeight: 200,
                  background: C.bg3,
                  color: C.textHi,
                  fontSize: 13,
                  borderRadius: 12,
                  border: `1px solid ${C.border}`,
                  padding: 16,
                  fontFamily: C.F,
                  resize: 'vertical'
                }}
              />

              <button
                onClick={handleSaveDocumentation}
                disabled={saving || !notes.trim()}
                style={{
                  padding: '14px 24px',
                  background: C.brand,
                  border: 'none',
                  borderRadius: 12,
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: saving || !notes.trim() ? 'not-allowed' : 'pointer',
                  opacity: saving || !notes.trim() ? 0.5 : 1
                }}
              >
                {saving ? 'Saving...' : 'Save Documentation'}
              </button>
            </>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.textLo,
              fontSize: 13
            }}>
              Select a model from the list to view and edit documentation
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
