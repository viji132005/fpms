import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { apiRouter } from './src/server/routes.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePort(): number {
  // 1. Check CLI arguments (e.g. tsx server.ts --port 3000)
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--port' || args[i] === '-p') && args[i + 1]) {
      const parsed = parseInt(args[i + 1], 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }

  // 2. Check DEFAULT_APP_PORT
  if (process.env.DEFAULT_APP_PORT) {
    const parsed = parseInt(process.env.DEFAULT_APP_PORT, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // 3. Check PORT env var (ignore 8080 because 8080 is reserved for nginx proxy)
  if (process.env.PORT) {
    const parsed = parseInt(process.env.PORT, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed !== 8080) return parsed;
  }

  // 4. Strict default for AI Studio environment
  return 3000;
}

async function startServer() {
  const app = express();
  const PORT = resolvePort();
  const isProduction = process.env.NODE_ENV === 'production';

  // Body parsing and security cookies
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));
  app.use(cookieParser());

  // Mount API endpoints
  app.use('/api', apiRouter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      institution: 'Maharaja Institute of Technology, Mysore',
      system: 'Faculty Portfolio Management System (FPMS)',
      timestamp: new Date().toISOString(),
    });
  });

  if (!isProduction) {
    // Development mode: Mount Vite dev server middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built static files
    const distPath = path.resolve(__dirname, 'dist');
    const indexHtmlPath = path.resolve(distPath, 'index.html');
    if (fs.existsSync(indexHtmlPath)) {
      app.use(express.static(distPath));

      app.get('*', (req, res) => {
        res.sendFile(indexHtmlPath);
      });
    } else {
      console.warn('Production build dist/index.html not found, falling back to Vite middleware');
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(` Maharaja Institute of Technology, Mysore (MIT Mysore)`);
    console.log(` Faculty Portfolio Management System (FPMS) Backend`);
    console.log(` Server running on http://0.0.0.0:${PORT}`);
    console.log(` Environment: ${isProduction ? 'production' : 'development'}`);
    console.log(`====================================================`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
