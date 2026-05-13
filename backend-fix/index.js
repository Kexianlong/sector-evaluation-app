import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import { initDB, getDB } from './src/db.js';
import authRoutes from './src/routes/auth.js';
import userRoutes from './src/routes/users.js';
import sectorRoutes from './src/routes/sectors.js';
import scoreRoutes from './src/routes/scores.js';
import trendRoutes from './src/routes/trends.js';
import exportRoutes from './src/routes/export.js';
import batchRoutes from './src/routes/batch.js';

const app = express();
const PORT = process.env.PORT || 9000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sectors', sectorRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/trends', trendRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/batch', batchRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const db = getDB();
    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        db: 'cloudbase_nosql',
        dbStatus: db?.status || 'unknown'
      }
    });
  } catch (e) {
    res.status(200).json({
      success: true,
      data: { status: 'ok', db: 'cloudbase_nosql', dbStatus: 'error', dbError: e.message }
    });
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API端点不存在' });
});

app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: '服务器内部错误: ' + err.message
  });
});

async function startServer() {
  try {
    await initDB();
    console.log('[backend] DB initialized');
  } catch (err) {
    console.error('[backend] DB init error:', err.message);
  }
  app.listen(PORT, () => {
    console.log(`[backend] Express listening on port ${PORT}`);
  });
}

// 本地开发时启动服务器（非 CloudBase 环境）
if (!process.env.TCB_ENV_ID) {
  startServer();
}

// CloudBase 云函数入口
export const main = serverless(app);
export default app;
