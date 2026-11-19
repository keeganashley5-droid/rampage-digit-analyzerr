
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { config } from './config.js';
import oauthRouter from './routes/oauth.js';
import derivRouter from './routes/deriv.js';
import adminRouter from './routes/admin.js';
import platformConfigRouter from './routes/platformConfig.js';
import {
  partnerOAuthRouter,
  partnerAdminApiRouter,
} from './routes/partnerAdminOAuth.js';

const app = express();
const distPath = path.resolve(process.cwd(), 'dist');

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

// OAuth and API routes
app.use('/oauth', oauthRouter);
app.use('/api/deriv', derivRouter);
app.use('/admin/oauth', partnerOAuthRouter);
app.use('/api/admin/partner', partnerAdminApiRouter);
app.use('/api/admin', adminRouter);
app.use('/api/config', platformConfigRouter);

app.get('/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'ok',
    service: 'Rampage Digit Analyzer API',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'ok',
    service: 'Rampage Digit Analyzer API',
    route: 'frontend-proxy',
  });
});


// Serve the separate private administrator application
app.get('/admin', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');

  res.sendFile(path.join(distPath, 'admin.html'), (error) => {
    if (error) next(error);
  });
});

app.get('/admin/*', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');

  res.sendFile(path.join(distPath, 'admin.html'), (error) => {
    if (error) next(error);
  });
});

app.use(express.static(distPath));


app.get('*', (req, res, next) => {
  if (
    req.path === '/api' ||
    req.path.startsWith('/api/') ||
    req.path === '/oauth' ||
    req.path.startsWith('/oauth/')
  ) {
    return res.status(404).json({ error: 'not_found' });
  }

  res.sendFile(path.join(distPath, 'index.html'), (error) => {
    if (error) next(error);
  });
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Rampage API listening on port ${config.port}`);
});

