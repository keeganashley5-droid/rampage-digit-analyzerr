
import { Router } from 'express';
import {
  adminAuthService,
} from '../services/adminAuthService.js';
import {
  adminSessionCookie,
  requireAdmin,
  type AdminAuthenticatedRequest,
} from '../middleware/adminSession.js';
import {
  adminLoginRateLimit,
  requireAdminOrigin,
} from '../middleware/adminSecurity.js';

import {
  getPlatformStrategyConfig,
  savePlatformStrategyConfig,
} from '../services/adminStrategyService.js';
const router = Router();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// POST /api/admin/login
router.post(
  '/login',
  adminLoginRateLimit,
  requireAdminOrigin,
  async (req, res) => {
    try {
      if (!isRecord(req.body)) {
        res.status(400).json({ error: 'invalid_request' });
        return;
      }

      const { email, password } = req.body;

      if (
        typeof email !== 'string' ||
        typeof password !== 'string'
      ) {
        res.status(400).json({ error: 'email_and_password_required' });
        return;
      }

      const result = await adminAuthService.login(
        email,
        password,
        req.get('user-agent') ?? undefined,
      );

      if (!result) {
        res.setHeader('Cache-Control', 'no-store');
        res.status(401).json({ error: 'invalid_credentials' });
        return;
      }

      adminSessionCookie.set(res, result.token);
      res.setHeader('Cache-Control', 'no-store');

      res.status(200).json({
        authenticated: true,
        user: result.user,
        expiresAt: result.expiresAt.toISOString(),
      });
    } catch {
      res.status(503).json({
        error: 'admin_login_unavailable',
      });
    }
  },
);

// GET /api/admin/me
router.get('/me', requireAdmin, (req, res) => {
  const adminReq = req as AdminAuthenticatedRequest;

  res.setHeader('Cache-Control', 'no-store');

  res.status(200).json({
    authenticated: true,
    user: adminReq.admin,
  });
});

// POST /api/admin/logout
router.post(
  '/logout',
  requireAdminOrigin,
  async (req, res) => {
    try {
      const token = adminSessionCookie.read(req);

      if (token) {
        const { adminSessionStore } = await import(
          '../services/adminSessionStore.js'
        );

        await adminSessionStore.revoke(token);
      }

      adminSessionCookie.clear(res);
      res.setHeader('Cache-Control', 'no-store');

      res.status(200).json({ authenticated: false });
    } catch {
      res.status(503).json({
        error: 'admin_logout_unavailable',
      });
    }
  },
);

// POST /api/admin/password
router.post(
  '/password',
  requireAdminOrigin,
  requireAdmin,
  async (req, res) => {
    try {
      if (!isRecord(req.body)) {
        res.status(400).json({ error: 'invalid_request' });
        return;
      }

      const { currentPassword, newPassword } = req.body;
      const adminReq = req as AdminAuthenticatedRequest;

      if (
        typeof currentPassword !== 'string' ||
        typeof newPassword !== 'string' ||
        !adminReq.admin
      ) {
        res.status(400).json({ error: 'invalid_password_request' });
        return;
      }

      await adminAuthService.changePassword(
        adminReq.admin.id,
        currentPassword,
        newPassword,
      );

      adminSessionCookie.clear(res);
      res.setHeader('Cache-Control', 'no-store');

      res.status(200).json({
        message: 'Password changed. Please sign in again.',
        authenticated: false,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Current password is incorrect.'
      ) {
        res.status(401).json({
          error: 'current_password_incorrect',
        });
        return;
      }

      if (
        error instanceof Error &&
        error.message.startsWith('Password must contain')
      ) {
        res.status(400).json({
          error: 'password_requirements_not_met',
          message: error.message,
        });
        return;
      }

      res.status(503).json({
        error: 'password_change_unavailable',
      });
    }
  },
);


// GET /api/admin/strategies
router.get('/strategies', requireAdmin, async (_req, res) => {
  try {
    const config = await getPlatformStrategyConfig();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(config);
  } catch {
    res.status(503).json({ error: 'strategy_config_unavailable' });
  }
});

// PUT /api/admin/strategies
router.put('/strategies', requireAdminOrigin, requireAdmin, async (req, res) => {
  if (!isRecord(req.body)) {
    res.status(400).json({ error: 'invalid_strategy_config' });
    return;
  }

  try {
    const adminReq = req as AdminAuthenticatedRequest;
    if (!adminReq.admin) {
      res.status(401).json({ error: 'admin_authentication_required' });
      return;
    }
    const config = await savePlatformStrategyConfig(adminReq.admin.id, req.body);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(config);
  } catch (error) {
    if (error instanceof Error && /^(Invalid|Unknown|Unsupported)/.test(error.message)) {
      res.status(400).json({ error: 'invalid_strategy_config' });
      return;
    }
    res.status(503).json({ error: 'strategy_config_save_unavailable' });
  }
});
export default router;


