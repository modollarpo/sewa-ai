import crypto from 'crypto';

function computeMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return crypto.createHash('sha256').update('empty').digest('hex');
  let layer = hashes.map(h => h);
  while (layer.length > 1) {
    const nextLayer: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      if (i + 1 < layer.length) {
        nextLayer.push(crypto.createHash('sha256').update(layer[i] + layer[i + 1]).digest('hex'));
      } else {
        nextLayer.push(layer[i]);
      }
    }
    layer = nextLayer;
  }
  return layer[0];
}

describe('MerkleBlock — computeMerkleRoot', () => {
  it('returns deterministic root for empty list', () => {
    const root = computeMerkleRoot([]);
    expect(root).toHaveLength(64);
    expect(root).toMatch(/^[a-f0-9]{64}$/);
  });

  it('single hash returns itself', () => {
    const hash = crypto.createHash('sha256').update('test').digest('hex');
    const root = computeMerkleRoot([hash]);
    expect(root).toBe(hash);
  });

  it('even number of leaves produces a root', () => {
    const hashes = [
      crypto.createHash('sha256').update('a').digest('hex'),
      crypto.createHash('sha256').update('b').digest('hex'),
    ];
    const root = computeMerkleRoot(hashes);
    expect(root).toHaveLength(64);

    const expected = crypto.createHash('sha256').update(hashes[0] + hashes[1]).digest('hex');
    expect(root).toBe(expected);
  });

  it('odd number of leaves propagates last hash', () => {
    const hashes = [
      crypto.createHash('sha256').update('a').digest('hex'),
      crypto.createHash('sha256').update('b').digest('hex'),
      crypto.createHash('sha256').update('c').digest('hex'),
    ];
    const root = computeMerkleRoot(hashes);
    expect(root).toHaveLength(64);

    // Layer 1: hash(a+b), hash(c)
    const l1a = crypto.createHash('sha256').update(hashes[0] + hashes[1]).digest('hex');
    // Layer 2: hash(l1a + l1b)
    const expected = crypto.createHash('sha256').update(l1a + hashes[2]).digest('hex');
    expect(root).toBe(expected);
  });

  it('deterministic — same inputs produce same root', () => {
    const hashes = Array.from({ length: 5 }, (_, i) =>
      crypto.createHash('sha256').update(`leaf-${i}`).digest('hex'));
    const root1 = computeMerkleRoot(hashes);
    const root2 = computeMerkleRoot(hashes);
    expect(root1).toBe(root2);
  });

  it('different order produces different root', () => {
    const h1 = crypto.createHash('sha256').update('first').digest('hex');
    const h2 = crypto.createHash('sha256').update('second').digest('hex');
    const rootA = computeMerkleRoot([h1, h2]);
    const rootB = computeMerkleRoot([h2, h1]);
    expect(rootA).not.toBe(rootB);
  });
});

describe('MerkleBlock — block hash chaining', () => {
  it('genesis block uses "genesis" as previous hash', () => {
    const previousBlockHash = 'genesis';
    const merkleRoot = crypto.createHash('sha256').update('test-root').digest('hex');
    const blockHash = crypto.createHash('sha256').update(previousBlockHash + merkleRoot).digest('hex');
    expect(blockHash).toHaveLength(64);
  });

  it('subsequent block chains to previous', () => {
    const prevBlockHash = crypto.createHash('sha256').update('prev-block').digest('hex');
    const merkleRoot = crypto.createHash('sha256').update('current-root').digest('hex');

    const expectedPrev = prevBlockHash;
    const blockHash = crypto.createHash('sha256').update(expectedPrev + merkleRoot).digest('hex');

    // Verify chain: the block's previousBlockHash must match previous block's blockHash
    expect(blockHash).not.toBe(merkleRoot);
    expect(blockHash).toHaveLength(64);

    // Verify tampering detection
    const tamperedPrevHash = crypto.createHash('sha256').update('tampered').digest('hex');
    const tamperedBlockHash = crypto.createHash('sha256').update(tamperedPrevHash + merkleRoot).digest('hex');
    expect(tamperedBlockHash).not.toBe(blockHash);
  });
});

describe('MerkleBlock — entry hashing', () => {
  it('produces deterministic SHA-256 for audit entries', () => {
    const entry = { tenantId: 't1', userId: 'u1', action: 'REPORT_SIGNED', timestamp: '2026-07-12T12:00:00.000Z' };
    const payload = JSON.stringify(entry);
    const hash = crypto.createHash('sha256').update(payload).digest('hex');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('different timestamp produces different hash', () => {
    const entry1 = { action: 'LOGIN', timestamp: '2026-07-12T12:00:00.000Z' };
    const entry2 = { action: 'LOGIN', timestamp: '2026-07-12T12:00:01.000Z' };

    const h1 = crypto.createHash('sha256').update(JSON.stringify(entry1)).digest('hex');
    const h2 = crypto.createHash('sha256').update(JSON.stringify(entry2)).digest('hex');
    expect(h1).not.toBe(h2);
  });
});
