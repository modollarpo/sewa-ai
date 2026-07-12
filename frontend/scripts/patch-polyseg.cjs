const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'node_modules', '@icr', 'polyseg-wasm', 'dist', 'index.js');

if (!fs.existsSync(target)) {
  console.log('[patch-polyseg] @icr/polyseg-wasm not found, skipping patch');
  process.exit(0);
}

const content = fs.readFileSync(target, 'utf8');

if (content.includes('ICRPolySeg.wasm') && !content.includes('// patched by patch-polyseg')) {
  const patched = `// patched by patch-polyseg — removes ESM .wasm import (unused polyseg feature)
import launcher from './ICRPolySeg.js';

export default class ICRPolySeg {
  constructor() {
    this._instance;
  }

  get instance() {
    if (this._instance) return this._instance;
    throw new Error('ICRPolySeg is not initialized.');
  }

  async initialize(params = {}) {
    this._instance = await launcher({
      locateFile: (f) => f,
      ...params,
    });
  }
}
`;
  fs.writeFileSync(target, patched);
  console.log('[patch-polyseg] Patched @icr/polyseg-wasm/dist/index.js (removed .wasm ESM import)');
} else {
  console.log('[patch-polyseg] Already patched or not needed');
}
