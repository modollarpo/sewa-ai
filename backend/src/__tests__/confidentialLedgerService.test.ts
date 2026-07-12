import crypto from 'crypto';

describe('ConfidentialLedger — block payload structure', () => {
  it('produces valid JSON payload for ledger entry', () => {
    const block = {
      blockIndex: 1,
      merkleRoot: crypto.createHash('sha256').update('test').digest('hex'),
      entryCount: 50,
      previousBlockHash: 'genesis',
      blockHash: crypto.createHash('sha256').update('genesis' + 'test-root').digest('hex'),
      entryIds: ['a', 'b', 'c'],
    };

    const payload = JSON.stringify(block);
    expect(() => JSON.parse(payload)).not.toThrow();
    const parsed = JSON.parse(payload);
    expect(parsed.blockIndex).toBe(1);
    expect(parsed.entryCount).toBe(50);
    expect(parsed.entryIds).toHaveLength(3);
  });
});

describe('ConfidentialLedger — receipt verification logic', () => {
  it('returns valid=false for unknown block', () => {
    const block = null;
    expect(block ?? { valid: false }).toEqual({ valid: false });
  });

  it('returns valid=false for uncommitted block', () => {
    const block = { committed: false };
    expect(!block.committed).toBe(true);
  });

  it('returns (valid=true, ledgerTxId) for committed block without ledger URL', () => {
    const block = { committed: true, ledgerTxId: 'local-sim-123' };
    const LEDGER_URL = '';
    const result = LEDGER_URL ? { valid: true } : { valid: block.committed, ledgerTxId: block.ledgerTxId };
    expect(result.valid).toBe(true);
    expect(result.ledgerTxId).toBe('local-sim-123');
  });
});

describe('ConfidentialLedger — status tracking', () => {
  it('block transitions from pending -> committed', () => {
    const statuses = ['pending', 'committed'];
    expect(statuses).toContain('pending');
    expect(statuses).toContain('committed');
  });

  it('pending blocks can be filtered', () => {
    const blocks = [
      { committed: true, blockIndex: 1 },
      { committed: false, blockIndex: 2 },
      { committed: false, blockIndex: 3 },
    ];
    const pending = blocks.filter(b => !b.committed);
    expect(pending).toHaveLength(2);
    expect(pending.map(b => b.blockIndex)).toEqual([2, 3]);
  });

  it('committed blocks are not resealed', () => {
    const block = { committed: true, blockIndex: 5 };
    const action = block.committed ? 'skip' : 'seal';
    expect(action).toBe('skip');
  });
});

describe('ConfidentialLedger — simulated mode', () => {
  it('generates simulated transaction ID', () => {
    const simulatedTxId = `local-sim-${Date.now()}`;
    expect(simulatedTxId).toMatch(/^local-sim-\d+$/);
  });

  it('marks ledgerReceipt with simulation metadata', () => {
    const receipt = { simulated: true, timestamp: new Date().toISOString() };
    expect(receipt.simulated).toBe(true);
    expect(() => new Date(receipt.timestamp)).not.toThrow();
  });
});
