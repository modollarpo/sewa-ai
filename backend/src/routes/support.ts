// SEWA XAI — src/routes/support.ts
// Customer Support Ticket Routes

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getTickets,
  getTicket,
  createTicket,
  updateTicket,
} from '../controllers/supportController';

const router = Router();

router.use(authenticate);

router.get('/tickets', getTickets);
router.get('/tickets/:id', getTicket);
router.post('/tickets', createTicket);
router.patch('/tickets/:id', updateTicket);

export default router;
