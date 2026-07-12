import { Request, Response, NextFunction } from 'express';

const SUPPORTED_VERSIONS = ['v1', 'v2'] as const;
type ApiVersion = typeof SUPPORTED_VERSIONS[number];

const DEPRECATED_VERSIONS: ApiVersion[] = ['v1'];

export function apiVersioning(req: Request, res: Response, next: NextFunction): void {
  const pathMatch = req.path.match(/^\/api\/(v\d+)\//);
  const version: ApiVersion = pathMatch ? (pathMatch[1] as ApiVersion) : 'v1';

  res.setHeader('X-API-Version', version);
  res.setHeader('X-API-Supported-Versions', SUPPORTED_VERSIONS.join(', '));

  if (DEPRECATED_VERSIONS.includes(version)) {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', '2027-01-01T00:00:00Z');
    res.setHeader('X-API-Deprecation-Notice',
      `${version} is deprecated. Migrate to v2. See https://api.sewaxai.health/docs/migration`);
  }

  next();
}

export function createVersionedRouter(version: ApiVersion) {
  const express = require('express') as typeof import('express');
  const router = express.Router();

  router.use((req: Request, _res: Response, next: NextFunction) => {
    req.url = req.url.replace(new RegExp(`^/${version}`), '');
    next();
  });

  return router;
}

export { SUPPORTED_VERSIONS };
export type { ApiVersion };
