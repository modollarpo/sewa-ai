import { Request, Response, NextFunction } from 'express';
export declare const OVERAGE_RATES: Record<string, number>;
export declare function enforceQuota(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function incrementQuota(tenantId: string, overage: boolean, overageRate: number): Promise<void>;
