import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { getCustomerProfile, getSharedConfig, listCustomerProfiles } from './customer-profiles.service.js';

const router = Router();

router.get('/', authenticate, (_req, res) => {
  res.json({
    profiles: listCustomerProfiles(),
    shared: getSharedConfig(),
  });
});

router.get('/:profileId', authenticate, (req, res) => {
  const profile = getCustomerProfile(req.params.profileId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(profile);
});

export default router;
