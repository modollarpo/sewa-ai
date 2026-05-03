import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { validate } from '../middleware/validate';
import { PatientSchema, PatientConsentSchema } from '../utils/validators';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
const r = Router();
r.use(authenticate);

r.post('/', authorize('admin','superadmin','doctor','radiologist'), validate(PatientSchema), async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const { mrn, dateOfBirth, sex, firstName, lastName, email } = req.body;

    // Generate a secure random password — patient uses 'forgot password' to set their own
    const randomPw = crypto.randomBytes(24).toString('base64url');
    const passwordHash = await bcrypt.hash(randomPw, 12);

    const patient = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: { firstName, lastName, email, role: 'patient', tenantId, passwordHash, status: 'pending_verification' }
      });
      return tx.patient.create({
        data: { tenantId, mrn, dateOfBirth: new Date(dateOfBirth), sex, userId: user.id }
      });
    });

    res.status(201).json(patient);
  } catch (err) { next(err); }
});

r.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const { search, page = '1', limit = '50' } = req.query as Record<string,string>;
    const where: any = { tenantId };
    if (search) where.user = { OR: [{ firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }] };
    const [patients, total] = await Promise.all([
      prisma.patient.findMany({ where, take: parseInt(limit), skip: (parseInt(page)-1)*parseInt(limit), include: { user: { select: { firstName:true, lastName:true, email:true } }, scans: { take:3, orderBy:{ receivedAt:'desc' }, include:{ aiResult:true } } } }),
      prisma.patient.count({ where }),
    ]);
    res.json({ patients, total });
  } catch (err) { next(err); }
});

r.get('/:id', async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const patient = await prisma.patient.findFirst({
      where: { id: req.params.id, tenantId },
      include: { user: true, scans: { include: { aiResult:true, report:{ select:{ id:true, status:true, signedAt:true } } }, orderBy:{ receivedAt:'desc' } }, messages: { take:20, orderBy:{ createdAt:'desc' } } },
    });
    if (!patient) throw new AppError('Patient not found', 404);
    res.json(patient);
  } catch (err) { next(err); }
});

r.patch('/:id/consent', validate(PatientConsentSchema), async (req, res, next) => {
  try {
    const { tenantId, role, id: requestingUserId } = req.user!;
    const { consentAI, consentResearch, consentThirdParty } = req.body;

    // Patients can only update their own consent record
    if (role === 'patient') {
      const self = await prisma.patient.findFirst({ where: { userId: requestingUserId, tenantId } });
      if (!self || self.id !== req.params.id) {
        throw new AppError('You can only update your own consent preferences.', 403);
      }
    }

    const patient = await prisma.patient.updateMany({ where: { id: req.params.id, tenantId }, data: { consentAI, consentResearch, consentThirdParty } });
    res.json({ updated: patient.count });
  } catch (err) { next(err); }
});

export default r;
