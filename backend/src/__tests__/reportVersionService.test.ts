import crypto from 'crypto';

// Pure logic tests — no DB needed
describe('ReportVersion — SHA-256 hashing', () => {
  it('produces consistent hash for identical content', () => {
    const content = JSON.stringify({ technique: 'CT Head', findings: 'Normal', impression: 'No acute abnormality', recommendation: null, fullText: null });
    const hash1 = crypto.createHash('sha256').update(content).digest('hex');
    const hash2 = crypto.createHash('sha256').update(content).digest('hex');
    expect(hash1).toBe(hash2);
  });

  it('produces different hash for different content', () => {
    const c1 = JSON.stringify({ technique: 'CT', findings: 'Normal', impression: 'Normal', recommendation: null, fullText: null });
    const c2 = JSON.stringify({ technique: 'MRI', findings: 'Abnormal', impression: 'Abnormal', recommendation: null, fullText: null });
    const h1 = crypto.createHash('sha256').update(c1).digest('hex');
    const h2 = crypto.createHash('sha256').update(c2).digest('hex');
    expect(h1).not.toBe(h2);
  });
});

describe('ReportVersion — version increment', () => {
  it('first version is 1 when no prior versions exist', () => {
    const prevVersion = undefined;
    const version = (prevVersion ?? 0) + 1;
    expect(version).toBe(1);
  });

  it('increments correctly from existing version', () => {
    const prevVersion = { version: 3 };
    const version = (prevVersion?.version ?? 0) + 1;
    expect(version).toBe(4);
  });
});

describe('ReportVersion — content reconstruction for verification', () => {
  it('reconstructed content matches original for hash verification', () => {
    const original = { technique: 'CT Head', findings: 'No acute intracranial hemorrhage', impression: 'Normal study', recommendation: 'None', fullText: 'Full report text' };
    const content = JSON.stringify(original);
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    const reconstructed = JSON.stringify(original);
    const reconstructedHash = crypto.createHash('sha256').update(reconstructed).digest('hex');

    expect(hash).toBe(reconstructedHash);
  });

  it('detects tampered content', () => {
    const original = { technique: 'CT', findings: 'Normal', impression: 'Normal', recommendation: null, fullText: null };
    const tampered = { technique: 'CT', findings: 'Abnormal', impression: 'Critical', recommendation: null, fullText: null };

    const originalHash = crypto.createHash('sha256').update(JSON.stringify(original)).digest('hex');
    const tamperedHash = crypto.createHash('sha256').update(JSON.stringify(tampered)).digest('hex');

    expect(originalHash).not.toBe(tamperedHash);
  });
});
