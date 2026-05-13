import tcb from '@cloudbase/node-sdk';
import { sectorData } from './data/sectors.js';

const ENV_ID = process.env.TCB_ENV_ID || 'cloud1-d9g2y40ql2eb2cc4a';

let app = null;
let database = null;
let dbStatus = 'not_initialized';
let dbError = null;

function toJSON(doc) {
  if (!doc) return doc;
  const obj = typeof doc === 'object' && doc._id ? { ...doc } : doc;
  delete obj._id;
  delete obj.password;
  return obj;
}

function toJSONList(docs) {
  return (docs || []).map(toJSON);
}

export function initDB() {
  if (database) return database;
  try {
    app = tcb.init({ env: ENV_ID });
    database = app.database();
    dbStatus = 'initialized';
  } catch (e) {
    dbError = e.message;
    dbStatus = 'error: ' + e.message;
  }
  return database;
}

export function getDB() {
  return database || initDB();
}

export function getDBStatus() {
  return { dbStatus, dbError };
}

const seedUsers = [
  { userId: 'admin_001', username: 'admin', password: 'Admin@Eval2026!', name: '系统管理员', role: 'center_director', department: '', team: '' },
  { userId: 'stu_001', username: 'students', password: 'Stu@Eval2026!', name: '学员甲', role: 'student', studentLevel: '初阶一段', department: '', team: '', isReleased: false },
  { userId: 'stu_002', username: 'student2', password: 'Stu2@Eval2026!', name: '学员乙', role: 'student', studentLevel: '中阶二段', department: '', team: '', isReleased: false },
  { userId: 'ins_001', username: 'instructor', password: 'Ins@Eval2026!', name: '教员甲', role: 'instructor', instructorLevel: '初教', department: '', team: '' },
];

export async function seedIfEmpty() {
  const db = getDB();
  if (!db) return;

  const p1 = db.collection('users').count().catch(() => ({ total: 0 })).then(r => {
    if (r.total === 0) {
      return Promise.all(seedUsers.map(u => db.collection('users').add(u).catch(e => {
        console.log('[seed] user add err:', e.message);
      })));
    }
  }).catch(e => {
    console.log('[seed] users init err:', e.message);
  });

  const p2 = db.collection('sectors').count().catch(() => ({ total: 0 })).then(r => {
    if (r.total === 0) {
      return Promise.all(sectorData.map(s => db.collection('sectors').add(s).catch(e => {
        console.log('[seed] sector add err:', e.message);
      })));
    }
  }).catch(e => {
    console.log('[seed] sectors init err:', e.message);
  });

  return Promise.all([p1, p2]);
}

export const User = {
  async create(userData) {
    const db = getDB();
    const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const doc = { userId, ...userData };
    await db.collection('users').add(doc);
    return toJSON(doc);
  },

  async findByUsername(username) {
    const db = getDB();
    const r = await db.collection('users').where({ username }).limit(1).get();
    const doc = (r.data || [])[0] || null;
    return doc;
  },

  async findById(userId) {
    const db = getDB();
    const r = await db.collection('users').where({ userId }).limit(1).get();
    const doc = (r.data || [])[0] || null;
    return doc;
  },

  async findAll() {
    const db = getDB();
    const r = await db.collection('users').limit(500).get();
    return r.data || [];
  },

  async findByRole(role) {
    const db = getDB();
    const r = await db.collection('users').where({ role }).get();
    return r.data || [];
  },

  async update(userId, updateData) {
    const db = getDB();
    const upd = { ...updateData };
    delete upd._id;
    await db.collection('users').where({ userId }).update(upd);
    const r = await db.collection('users').where({ userId }).limit(1).get();
    return (r.data || [])[0] || null;
  },

  async delete(userId) {
    const db = getDB();
    const r = await db.collection('users').where({ userId }).limit(1).get();
    const doc = (r.data || [])[0] || null;
    await db.collection('users').where({ userId }).remove();
    return doc;
  },

  async verifyPassword(user, plainPassword) {
    return user && user.password === plainPassword;
  },

  getJwtSecret() {
    return process.env.JWT_SECRET || 'sector-eval-cloud-secret-2024';
  }
};

export const Score = {
  async create(scoreData) {
    const db = getDB();
    const scoreId = 'score_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const doc = { scoreId, ...scoreData };
    await db.collection('scores').add(doc);
    return toJSON(doc);
  },

  async findById(scoreId) {
    const db = getDB();
    const r = await db.collection('scores').where({ scoreId }).limit(1).get();
    const doc = (r.data || [])[0] || null;
    return doc;
  },

  async findAll() {
    const db = getDB();
    const r = await db.collection('scores').orderBy('date', 'desc').limit(5000).get();
    return r.data || [];
  },

  async findByStudentId(studentId) {
    const db = getDB();
    const r = await db.collection('scores').where({ studentId }).orderBy('date', 'desc').get();
    return r.data || [];
  },

  async findByInstructorId(instructorId) {
    const db = getDB();
    const r = await db.collection('scores').where({ instructorId }).orderBy('date', 'desc').get();
    return r.data || [];
  },

  async findBySectorId(sectorId) {
    const db = getDB();
    const r = await db.collection('scores').where({ sectorId }).orderBy('date', 'desc').get();
    return r.data || [];
  },

  async update(scoreId, updateData) {
    const db = getDB();
    const upd = { ...updateData };
    delete upd._id;
    await db.collection('scores').where({ scoreId }).update(upd);
    const r = await db.collection('scores').where({ scoreId }).limit(1).get();
    return (r.data || [])[0] || null;
  },

  async delete(scoreId) {
    const db = getDB();
    const r = await db.collection('scores').where({ scoreId }).limit(1).get();
    const doc = (r.data || [])[0] || null;
    await db.collection('scores').where({ scoreId }).remove();
    return doc;
  },

  async deleteAllScores() {
    const db = getDB();
    const r = await db.collection('scores').get();
    const count = (r.data || []).length;
    await db.collection('scores').remove();
    return { deletedCount: count };
  }
};

export const Sector = {
  async initialize() {
    const db = getDB();
    const r = await db.collection('sectors').count().catch(() => ({ total: 0 }));
    if (r.total === 0) {
      await Promise.all(sectorData.map(s => db.collection('sectors').add(s).catch(e => {
        console.log('[Sector.initialize] add err:', e.message);
      })));
    }
  },

  async findAll() {
    const db = getDB();
    const r = await db.collection('sectors').limit(100).get();
    return r.data || [];
  },

  async findById(sectorId) {
    const db = getDB();
    const r = await db.collection('sectors').where({ sectorId }).limit(1).get();
    return (r.data || [])[0] || null;
  },

  async create(sectorData) {
    const db = getDB();
    await db.collection('sectors').add(sectorData);
    return sectorData;
  },

  async update(sectorId, updateData) {
    const db = getDB();
    const upd = { ...updateData };
    delete upd._id;
    await db.collection('sectors').where({ sectorId }).update(upd);
    const r = await db.collection('sectors').where({ sectorId }).limit(1).get();
    return (r.data || [])[0] || null;
  },

  async delete(sectorId) {
    const db = getDB();
    const r = await db.collection('sectors').where({ sectorId }).limit(1).get();
    const doc = (r.data || [])[0] || null;
    await db.collection('sectors').where({ sectorId }).remove();
    return doc;
  },

  async upsert(sectorData) {
    const db = getDB();
    const existing = await this.findById(sectorData.sectorId);
    if (existing) {
      const upd = { ...sectorData };
      delete upd._id;
      delete upd.sectorId;
      await db.collection('sectors').where({ sectorId: sectorData.sectorId }).update(upd);
      const r = await db.collection('sectors').where({ sectorId: sectorData.sectorId }).limit(1).get();
      return { sector: (r.data || [])[0] || null, created: false };
    }
    await db.collection('sectors').add(sectorData);
    return { sector: sectorData, created: true };
  }
};

export default { initDB, getDB, getDBStatus, seedIfEmpty, User, Score, Sector };
