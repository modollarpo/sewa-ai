const path = require('path');
const originalJoin = path.join;
path.join = function(...args) {
  // Fix Node 24 strict path validation for Prisma
  const filtered = args.map(a => (a === undefined || a === null) ? '' : String(a));
  return originalJoin.apply(this, filtered);
};
// Use the local prisma CLI entry point
require('./node_modules/prisma/build/index.js');
