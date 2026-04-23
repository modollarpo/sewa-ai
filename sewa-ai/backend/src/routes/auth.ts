// SEWA AI — backend/src/routes/auth.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import * as ctrl from '../controllers/authController';
const r = Router();
r.post('/login',        authLimiter, ctrl.login);
r.post('/mfa/verify',  authLimiter, ctrl.verifyMFA);
r.post('/mfa/setup',   authenticate, ctrl.setupMFA);
r.post('/mfa/confirm', authenticate, ctrl.confirmMFA);
r.post('/refresh',     ctrl.refreshToken);
r.post('/logout',      ctrl.logout);
r.post('/register',    ctrl.register);
export default r;
