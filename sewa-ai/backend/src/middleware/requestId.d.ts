import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            requestId: string;
            startTime: number;
        }
    }
}
export declare function requestId(req: Request, res: Response, next: NextFunction): void;
