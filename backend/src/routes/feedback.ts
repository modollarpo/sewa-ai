// SEWA AI — Customer Feedback Routes
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getFeedback,
  getFeedbackById,
  createFeedback,
  updateFeedback,
} from '../controllers/customerFeedbackController';

const router = Router();

router.use(authenticate);

router.get('/', getFeedback);
router.get('/:id', getFeedbackById);
router.post('/', createFeedback);
router.patch('/:id', updateFeedback);

export default router;
