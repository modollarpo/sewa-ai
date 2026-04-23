import { Request, Response, NextFunction } from 'express';
export declare function uploadScan(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getWorklist(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>>>;
export declare function getScan(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function updateScanStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function deleteScan(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function generateDemoScan(req: Request, res: Response, next: NextFunction): Promise<void>;
