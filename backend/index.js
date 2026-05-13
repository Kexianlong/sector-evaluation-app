const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();
const PORT = process.env.PORT || 9000;

// 基础中间件
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.path}`);
  next();
});

// 动态加载 ESM 路由
let ready = false;
let readyPromise = null;

async function setup() {
  try {
    const [
      dbMod,
      authRoutes,
      userRoutes,
      sectorRoutes,
      scoreRoutes,
      trendRoutes,
      exportRoutes,
      batchRoutes
    ] = await Promise.all([
      import('./src/db.js'),
      import('./src/routes/auth.js'),
      import('./src/routes/users.js'),
      import('./src/routes/sectors.js'),
      import('./src/routes/scores.js'),
      import('./src/routes/trends.js'),
      import('./src/routes/export.js'),
      import('./src/routes/batch.js')
    ]);

    const { initDB, getDB } = dbMod;

    app.use('/api/auth', authRoutes.default);
    app.use('/api/users', userRoutes.default);
    app.use('/api/sectors', sectorRoutes.default);
    app.use('/api/scores', scoreRoutes.default);
    app.use('/api/score-config', scoreRoutes.default);
    app.use('/api/trends', trendRoutes.default);
    app.use('/api/export', exportRoutes.default);
    app.use('/api/batch', batchRoutes.default);

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

    try {
      await initDB();
      console.log('[backend] DB initialized');
    } catch (err) {
      console.error('[backend] DB init error:', err.message);
    }

    ready = true;
    console.log('[backend] Routes loaded successfully');
  } catch (err) {
    console.error('[backend] Setup error:', err);
    throw err;
  }
}

// 本地开发时启动服务器
if (!process.env.TCB_ENV_ID) {
  setup().then(() => {
    app.listen(PORT, () => {
      console.log(`[backend] Express listening on port ${PORT}`);
    });
  });
}

const handler = serverless(app);

exports.main = async (event, context) => {
  if (!ready) {
    if (!readyPromise) {
      readyPromise = setup();
    }
    await readyPromise;
  }
  return handler(event, context);
};
