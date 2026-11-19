import { Router } from 'express';
import { getPlatformStrategyConfig } from '../services/adminStrategyService.js';

const router = Router();

router.get('/strategies', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  try {
    const config = await getPlatformStrategyConfig();
    res.status(200).json(config);
  } catch {
    res.status(503).json({ error: 'platform_config_unavailable' });
  }
});

export default router;
