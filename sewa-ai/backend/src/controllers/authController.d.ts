import { Request, Response, NextFunction } from 'express';
export declare function login(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>>>;
export declare function verifyMFA(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function setupMFA(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function confirmMFA(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function logout(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function register(req: Request, res: Response, next: NextFunction): Promise<void>;
