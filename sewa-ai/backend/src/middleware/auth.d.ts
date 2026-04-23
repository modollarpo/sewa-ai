import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                tenantId: string;
                role: string;
            };
        }
    }
}
export declare function authenticate(req: Request, _res: Response, next: NextFunction): void;
export declare function authorize(...roles: string[]): (req: Request, _res: Response, next: NextFunction) => void;
export declare function sameTenat(req: Request, _res: Response, next: NextFunction): void;
