import { Request, Response, NextFunction } from 'express';
export declare function generateReport(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function updateReport(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function signReport(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function listReports(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getReport(req: Request, res: Response, next: NextFunction): Promise<void>;
