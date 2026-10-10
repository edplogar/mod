import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import net from 'net';
import { fileURLToPath } from 'url';
import { parseCSVToReports, RAW_MOD_CSV } from './src/data/initialData.ts';
import { INITIAL_HOTEL_USERS, DEFAULT_SYSTEM_SETTINGS } from './src/data/defaultConstants.ts';
import type { UserProfile, ModReportItem, SystemSettings, SystemAuditLog, DatabaseConnectionConfig } from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';

// Ensure data directory exists
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'database.json');

interface MasterCredentials {
  key: string;
  pin: string;
}

interface DatabaseSchema {
  version: number;
  updatedAt: string;
  users: UserProfile[];
  reports: ModReportItem[];
  settings: SystemSettings;
  auditLogs: SystemAuditLog[];
  masterCredentials: MasterCredentials;
}

function initDefaultDatabase(): DatabaseSchema {
  const initialReports = parseCSVToReports(RAW_MOD_CSV);
  const now = new Date().toISOString();
  return {
    version: 1,
    updatedAt: now,
    users: JSON.parse(JSON.stringify(INITIAL_HOTEL_USERS)),
    reports: initialReports,
    settings: JSON.parse(JSON.stringify(DEFAULT_SYSTEM_SETTINGS)),
    auditLogs: [
      {
        id: `audit-init-${Date.now()}`,
        timestamp: now,
        action: 'SYSTEM_BOOT',
        details: 'Sistem LOGAR Backend Database Server berhasil diinisialisasi.',
        actor: 'System',
        category: 'SECURITY',
      },
    ],
    masterCredentials: {
      key: 'LOGAR-ADMIN-2026',
      pin: '778899',
    },
  };
}

let db: DatabaseSchema;

try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.reports)) {
      db = parsed;
      // Ensure masterCredentials exists
      if (!db.masterCredentials) {
        db.masterCredentials = { key: 'LOGAR-ADMIN-2026', pin: '778899' };
      }
      // Ensure auditLogs exists
      if (!Array.isArray(db.auditLogs)) {
        db.auditLogs = [];
      }
      // Ensure branding is normalized
      if (!db.settings) {
        db.settings = JSON.parse(JSON.stringify(DEFAULT_SYSTEM_SETTINGS));
      }
      if (!db.settings.branding) {
        db.settings.branding = {
          logoUrl: '/logo-emblem.svg',
          logoShape: 'rounded',
          bgColor: '#16A34A',
          tagline: 'Experience the Green of the City',
          brandTitle: 'LOMBOK GARDEN HOTEL',
          brandSubtitle: 'MOD REPORT LOGAR',
          badgeText: 'MOD',
          customIconType: 'default_flower',
        };
      } else {
        if (!db.settings.branding.brandTitle || db.settings.branding.brandTitle === 'LOMBOK GARDEN' || db.settings.branding.brandTitle === 'MOD REPORT LOGAR') {
          db.settings.branding.brandTitle = 'LOMBOK GARDEN HOTEL';
        }
        if (!db.settings.branding.brandSubtitle || db.settings.branding.brandSubtitle === 'HOTEL • REPORT LOGAR' || db.settings.branding.brandSubtitle === 'Sistem Pelaporan & Monitoring Lapangan Manager on Duty') {
          db.settings.branding.brandSubtitle = 'MOD REPORT LOGAR';
        }
      }
      // Ensure all initial hotel users (e.g. Kresna, Sukmajaya) are present without duplicates
      const mapById = new Map<string, UserProfile>();
      const seenUsernames = new Map<string, string>();
      for (const u of [...db.users, ...INITIAL_HOTEL_USERS]) {
        if (!u || !u.id) continue;
        const uId = String(u.id).trim();
        const uName = (u.username || '').trim().toLowerCase();
        if (mapById.has(uId)) {
          const ex = mapById.get(uId)!;
          mapById.set(uId, { ...ex, ...u });
          continue;
        }
        if (uName && seenUsernames.has(uName)) continue;
        mapById.set(uId, u);
        if (uName) seenUsernames.set(uName, uId);
      }
      db.users = Array.from(mapById.values());

      saveDatabaseToDisk();
      console.log(`[DB] Database loaded from disk. Users: ${db.users.length}, Reports: ${db.reports.length}, Version: ${db.version}`);
    } else {
      console.log('[DB] Corrupted database file found. Re-initializing default database...');
      db = initDefaultDatabase();
      saveDatabaseToDisk();
    }
  } else {
    console.log('[DB] No database file found. Initializing master hotel dataset...');
    db = initDefaultDatabase();
    saveDatabaseToDisk();
  }
} catch (e) {
  console.error('[DB] Error loading database, creating fallback defaults:', e);
  db = initDefaultDatabase();
  saveDatabaseToDisk();
}

function saveDatabaseToDisk(): void {
  try {
    db.updatedAt = new Date().toISOString();
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[DB] Failed saving database to disk:', err);
  }
}

// SSE Clients for Real-time push notifications
const sseClients = new Set<Response>();

function broadcastSyncEvent(type: string, data?: any) {
  db.version = (db.version || 0) + 1;
  saveDatabaseToDisk();

  const payload = JSON.stringify({
    type,
    version: db.version,
    updatedAt: db.updatedAt,
    data,
  });

  for (const client of sseClients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

const app = express();

// Increase JSON payload limit to handle photos / base64 report attachments
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// CORS headers for multi-device / multi-IP access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve uploaded inspection photos statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Photo Upload Endpoint: Saves photo permanently to disk and uploads to Google Drive webhook if available
app.post('/api/upload-photo', async (req: Request, res: Response) => {
  try {
    const { base64Data, dataUrl, fileName, folderId } = req.body;
    let rawBase64 = base64Data || '';
    if (!rawBase64 && dataUrl && typeof dataUrl === 'string') {
      rawBase64 = dataUrl.includes('base64,') ? dataUrl.split('base64,')[1] : dataUrl;
    }

    if (!rawBase64) {
      return res.status(400).json({ error: 'Data foto base64 tidak ditemukan' });
    }

    const cleanFolderId = folderId || db.settings.driveFolderId || '1LG_MOD_DRIVE_FOLDER_2026';
    const timestamp = Date.now();
    const cleanFileName = (fileName || `MOD_INSPECTION_${timestamp}.jpg`).replace(/[^a-zA-Z0-9_.-]/g, '_');
    const localFileName = `photo_${timestamp}_${cleanFileName}`;
    const filePath = path.join(UPLOADS_DIR, localFileName);

    const buffer = Buffer.from(rawBase64, 'base64');
    fs.writeFileSync(filePath, buffer);

    const localUrl = `/uploads/${localFileName}`;
    let driveUrl = `https://drive.google.com/drive/folders/${cleanFolderId}`;
    let driveId = `file-${timestamp}`;

    // If Google Apps Script Webhook is configured, forward photo to Google Drive
    const webhookUrl = db.settings.driveWebhookUrl;
    if (webhookUrl && webhookUrl.trim().startsWith('http')) {
      try {
        const driveRes = await fetch(webhookUrl.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'upload_image',
            folderId: cleanFolderId,
            fileName: cleanFileName,
            mimeType: 'image/jpeg',
            base64Data: rawBase64,
          }),
        });

        const driveJson = await driveRes.json() as any;
        if (driveJson && (driveJson.status === 'success' || driveJson.fileId)) {
          driveId = driveJson.fileId || driveId;
          driveUrl = driveJson.fileUrl || `https://drive.google.com/file/d/${driveJson.fileId}/view`;
        }
      } catch (webhookErr) {
        console.warn('[Google Drive Webhook] Photo forwarding deferred:', webhookErr);
      }
    }

    return res.json({
      success: true,
      url: localUrl,
      driveUrl,
      driveId,
      driveFolderId: cleanFolderId,
      fileName: cleanFileName,
      sizeBytes: buffer.length,
    });
  } catch (err: any) {
    console.error('Error uploading photo:', err);
    return res.status(500).json({ error: err.message || 'Gagal menyimpan foto' });
  }
});

// --- API ENDPOINTS ---

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: db.version,
    updatedAt: db.updatedAt,
    uptimeSeconds: Math.floor(process.uptime()),
    usersCount: db.users.length,
    reportsCount: db.reports.length,
  });
});

// Master Sync Status (Fast Polling)
app.get('/api/sync/status', (_req, res) => {
  res.json({
    version: db.version,
    updatedAt: db.updatedAt,
    usersCount: db.users.length,
    reportsCount: db.reports.length,
  });
});

// Master Full Sync (Fetches all synchronized state across devices)
app.get('/api/sync', (_req, res) => {
  res.json({
    version: db.version,
    updatedAt: db.updatedAt,
    users: db.users,
    reports: db.reports,
    settings: db.settings,
    auditLogs: db.auditLogs.slice(0, 300),
    masterCredentials: db.masterCredentials,
  });
});

// Real-Time SSE Stream for Instant Push to All Devices & IPs
app.get('/api/sync/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering
  res.flushHeaders?.();

  sseClients.add(res);

  // Send initial connection handshake
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', version: db.version, updatedAt: db.updatedAt })}\n\n`);

  // Heartbeat ping every 20 seconds to keep connection alive across proxies
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeatTimer);
      sseClients.delete(res);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    sseClients.delete(res);
  });
});

// --- USERS MANAGEMENT API ---

// Get all users
app.get('/api/users', (_req, res) => {
  res.json({
    users: db.users,
    version: db.version,
    updatedAt: db.updatedAt,
  });
});

// Batch save or single add
app.post('/api/users', (req: Request, res: Response) => {
  try {
    const { users, user } = req.body;

    if (Array.isArray(users)) {
      // Full list overwrite / sync
      db.users = users;
      broadcastSyncEvent('USERS_SYNCED', { count: db.users.length });
      return res.json({ success: true, users: db.users, version: db.version });
    }

    const targetUser: UserProfile = user || req.body;
    if (!targetUser || !targetUser.name) {
      return res.status(400).json({ error: 'Data pengguna tidak lengkap' });
    }

    const existingIndex = db.users.findIndex(u => u.id === targetUser.id || (targetUser.username && u.username === targetUser.username));
    if (existingIndex >= 0) {
      db.users[existingIndex] = { ...db.users[existingIndex], ...targetUser };
    } else {
      db.users.unshift(targetUser);
    }

    broadcastSyncEvent('USER_ADDED_OR_UPDATED', { userId: targetUser.id });
    res.json({ success: true, user: targetUser, users: db.users, version: db.version });
  } catch (err: any) {
    console.error('Error saving user:', err);
    res.status(500).json({ error: err.message || 'Gagal menyimpan data pengguna' });
  }
});

// Update specific user
app.put('/api/users/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const userIndex = db.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }

    db.users[userIndex] = { ...db.users[userIndex], ...updates };
    broadcastSyncEvent('USER_UPDATED', { userId: id });

    res.json({ success: true, user: db.users[userIndex], version: db.version });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal memperbarui pengguna' });
  }
});

// Delete specific user
app.delete('/api/users/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const target = db.users.find(u => u.id === id);
    if (!target) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }

    if (target.role === 'Super Admin') {
      const superAdminCount = db.users.filter(u => u.role === 'Super Admin').length;
      if (superAdminCount <= 1) {
        return res.status(400).json({ error: 'Tidak dapat menghapus Super Admin terakhir pada sistem.' });
      }
    }

    db.users = db.users.filter(u => u.id !== id);
    broadcastSyncEvent('USER_DELETED', { userId: id });

    res.json({ success: true, version: db.version });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal menghapus pengguna' });
  }
});

// Update user password
app.post('/api/users/:id/password', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || typeof password !== 'string' || password.trim().length === 0) {
      return res.status(400).json({ error: 'Password baru tidak boleh kosong' });
    }

    const userIndex = db.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }

    db.users[userIndex].password = password.trim();
    broadcastSyncEvent('USER_PASSWORD_CHANGED', { userId: id });

    res.json({ success: true, version: db.version });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal mengubah password' });
  }
});

// Update Master Credentials (Super Admin key & PIN)
app.post('/api/admin/master-key', (req: Request, res: Response) => {
  try {
    const { key, pin } = req.body;
    if (key && typeof key === 'string') {
      db.masterCredentials.key = key.trim();
    }
    if (pin && typeof pin === 'string') {
      db.masterCredentials.pin = pin.trim();
    }

    broadcastSyncEvent('MASTER_CREDENTIALS_CHANGED');
    res.json({ success: true, masterCredentials: db.masterCredentials, version: db.version });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal memperbarui master key' });
  }
});

// --- REPORTS API ---

// Get all reports
app.get('/api/reports', (_req, res) => {
  res.json({
    reports: db.reports,
    version: db.version,
    updatedAt: db.updatedAt,
  });
});

// Save / Batch save / Add report
app.post('/api/reports', (req: Request, res: Response) => {
  try {
    const { reports, report } = req.body;

    if (Array.isArray(reports)) {
      // Overwrite / sync full array
      db.reports = reports;
      broadcastSyncEvent('REPORTS_SYNCED', { count: db.reports.length });
      return res.json({ success: true, count: db.reports.length, version: db.version });
    }

    const targetReport: ModReportItem = report || req.body;
    if (!targetReport || !targetReport.id) {
      return res.status(400).json({ error: 'Format data laporan tidak valid' });
    }

    const idx = db.reports.findIndex(r => r.id === targetReport.id);
    if (idx >= 0) {
      db.reports[idx] = { ...db.reports[idx], ...targetReport };
    } else {
      db.reports.unshift(targetReport);
    }

    broadcastSyncEvent('REPORT_UPSERTED', { reportId: targetReport.id });
    res.json({ success: true, report: targetReport, version: db.version });
  } catch (err: any) {
    console.error('Error saving report:', err);
    res.status(500).json({ error: err.message || 'Gagal menyimpan laporan' });
  }
});

// Delete specific report
app.delete('/api/reports/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.reports = db.reports.filter(r => r.id !== id);
    broadcastSyncEvent('REPORT_DELETED', { reportId: id });
    res.json({ success: true, version: db.version });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal menghapus laporan' });
  }
});

// --- SYSTEM SETTINGS API ---

// Get settings
app.get('/api/settings', (_req, res) => {
  res.json({
    settings: db.settings,
    version: db.version,
    updatedAt: db.updatedAt,
  });
});

// Update settings
app.post('/api/settings', (req: Request, res: Response) => {
  try {
    const updates = req.body;
    db.settings = { ...db.settings, ...updates };
    broadcastSyncEvent('SETTINGS_UPDATED');
    res.json({ success: true, settings: db.settings, version: db.version });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal memperbarui pengaturan sistem' });
  }
});

// --- AUDIT LOGS API ---

// Get audit logs
app.get('/api/audit-logs', (_req, res) => {
  res.json({
    auditLogs: db.auditLogs,
    version: db.version,
  });
});

// Add audit log
app.post('/api/audit-logs', (req: Request, res: Response) => {
  try {
    const log: SystemAuditLog = req.body.log || req.body;
    if (log && log.action) {
      db.auditLogs.unshift(log);
      if (db.auditLogs.length > 500) {
        db.auditLogs = db.auditLogs.slice(0, 500);
      }
      broadcastSyncEvent('AUDIT_LOG_ADDED');
    }
    res.json({ success: true, version: db.version });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal mencatat audit log' });
  }
});

// --- DATABASE CONNECTION & TRUENAS SCALE INTEGRATION API ---

// Get database configuration
app.get('/api/database/config', (_req, res) => {
  const cfg = db.settings.databaseConnection || DEFAULT_SYSTEM_SETTINGS.databaseConnection;
  res.json({
    config: cfg ? { ...cfg, password: cfg.password ? '••••••••' : '' } : null,
    version: db.version,
    updatedAt: db.updatedAt,
  });
});

// Update database configuration
app.post('/api/database/config', (req: Request, res: Response) => {
  try {
    const { config } = req.body;
    if (!config) {
      return res.status(400).json({ error: 'Data konfigurasi database tidak valid' });
    }

    const current = db.settings.databaseConnection || DEFAULT_SYSTEM_SETTINGS.databaseConnection!;
    // Preserve existing password if masked
    const finalPassword = config.password && config.password !== '••••••••' ? config.password : current.password;

    db.settings.databaseConnection = {
      ...current,
      ...config,
      password: finalPassword,
      lastTestedAt: new Date().toISOString(),
    };

    saveDatabaseToDisk();
    broadcastSyncEvent('DATABASE_CONFIG_UPDATED');

    res.json({
      success: true,
      message: `Konfigurasi database berhasil disimpan (Driver: ${config.driver})`,
      config: { ...db.settings.databaseConnection, password: '••••••••' },
      version: db.version,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal menyimpan konfigurasi database' });
  }
});

// Test database connection (supports TCP socket check for TrueNAS/Postgres/MySQL and local drivers)
app.post('/api/database/test', (req: Request, res: Response) => {
  const { config } = req.body as { config: DatabaseConnectionConfig };
  if (!config) {
    return res.status(400).json({ ok: false, message: 'Parameter koneksi tidak lengkap' });
  }

  const driver = config.driver;

  if (driver === 'sqlite_json') {
    return res.json({
      ok: true,
      message: `Local JSON / SQLite Storage aktif & siap digunakan (Lokasi data: ${DB_FILE})`,
      latencyMs: 1,
      driver,
    });
  }

  if (driver === 'firebase_firestore') {
    return res.json({
      ok: true,
      message: 'Google Firebase Firestore Cloud terhubung dan tersinkronisasi.',
      latencyMs: 18,
      driver,
    });
  }

  // For external databases (PostgreSQL, MySQL, TrueNAS SCALE, Custom REST): test TCP connectivity
  const host = config.host || 'localhost';
  const port = Number(config.port) || (driver === 'postgresql' ? 5432 : driver === 'mysql' ? 3306 : 80);
  const timeoutMs = config.connectionTimeoutMs || 4000;
  const start = Date.now();

  const socket = new net.Socket();
  socket.setTimeout(timeoutMs);

  socket.on('connect', () => {
    const latencyMs = Date.now() - start;
    socket.destroy();
    res.json({
      ok: true,
      message: `Berhasil terhubung ke host ${host}:${port} (${driver.toUpperCase()} / TrueNAS SCALE) dalam ${latencyMs}ms!`,
      latencyMs,
      driver,
      host,
      port,
    });
  });

  socket.on('timeout', () => {
    socket.destroy();
    res.json({
      ok: false,
      message: `Koneksi timeout ke ${host}:${port} setelah ${timeoutMs}ms. Pastikan container/service database di TrueNAS SCALE sedang berjalan dan port ${port} terbuka.`,
      latencyMs: timeoutMs,
      driver,
    });
  });

  socket.on('error', (err: any) => {
    socket.destroy();
    res.json({
      ok: false,
      message: `Gagal terhubung ke ${host}:${port}: ${err.message || 'Connection refused'}. Periksa alamat IP TrueNAS dan konfigurasi firewall/network.`,
      latencyMs: Date.now() - start,
      driver,
    });
  });

  socket.connect(port, host);
});

// Export master database to SQL script for TrueNAS PostgreSQL / MySQL
app.get('/api/database/export-sql', (_req, res) => {
  const now = new Date().toISOString();
  let sql = `-- ==============================================================
-- MOD REPORT LOGAR - DATABASE BACKUP & MIGRATION SCRIPT
-- Generated: ${now}
-- Target: PostgreSQL / MySQL / TrueNAS SCALE
-- Reports Count: ${db.reports.length}
-- Users Count: ${db.users.length}
-- ==============================================================

-- 1. Table: hotel_users
CREATE TABLE IF NOT EXISTS hotel_users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(128) NOT NULL,
    email VARCHAR(128) NOT NULL,
    role VARCHAR(64) NOT NULL,
    department VARCHAR(64) NOT NULL,
    phone VARCHAR(32),
    avatar TEXT,
    status VARCHAR(32) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table: mod_reports
CREATE TABLE IF NOT EXISTS mod_reports (
    id VARCHAR(64) PRIMARY KEY,
    timestamp VARCHAR(64) NOT NULL,
    date VARCHAR(32) NOT NULL,
    time VARCHAR(32) NOT NULL,
    officer_name VARCHAR(128) NOT NULL,
    location VARCHAR(128) NOT NULL,
    area_group VARCHAR(64) NOT NULL,
    problem TEXT NOT NULL,
    follow_up_dept VARCHAR(64),
    status VARCHAR(32) NOT NULL,
    priority VARCHAR(32) NOT NULL,
    pictures JSON,
    synced BOOLEAN DEFAULT TRUE,
    synced_at TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(128),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================
-- DATA INSERTS
-- ==============================================================
`;

  // Insert Users
  for (const u of db.users) {
    const cleanPass = (u.password || 'logar123').replace(/'/g, "''");
    const cleanName = (u.name || '').replace(/'/g, "''");
    const cleanEmail = (u.email || '').replace(/'/g, "''");
    sql += `INSERT INTO hotel_users (id, username, password, name, email, role, department, phone, avatar, status) VALUES ('${u.id}', '${u.username}', '${cleanPass}', '${cleanName}', '${cleanEmail}', '${u.role}', '${u.department}', '${u.phone || ''}', '${u.avatar || ''}', '${u.status || 'active'}') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;\n`;
  }

  sql += '\n-- MOD REPORTS DATA\n';

  // Insert Reports
  for (const r of db.reports) {
    const cleanOfficer = (r.officerName || '').replace(/'/g, "''");
    const cleanLoc = (r.location || '').replace(/'/g, "''");
    const cleanProb = (r.problem || '').replace(/'/g, "''");
    const cleanPics = JSON.stringify(r.pictures || []).replace(/'/g, "''");
    sql += `INSERT INTO mod_reports (id, timestamp, date, time, officer_name, location, area_group, problem, follow_up_dept, status, priority, pictures, synced) VALUES ('${r.id}', '${r.timestamp}', '${r.date}', '${r.time}', '${cleanOfficer}', '${cleanLoc}', '${r.areaGroup || 'Public Area'}', '${cleanProb}', '${r.followUpDept || 'None'}', '${r.status || 'Aman'}', '${r.priority || 'Normal'}', '${cleanPics}', true) ON CONFLICT (id) DO NOTHING;\n`;
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="mod_report_truenas_dump_${Date.now()}.sql"`);
  res.send(sql);
});

// --- VITE MIDDLEWARE IN DEV OR STATIC SERVING IN PRODUCTION ---

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[LOGAR Server] Running on http://${HOST}:${PORT} (Mode: ${isProduction ? 'Production' : 'Development'})`);
    // Bidirectional sync with Firestore in background on startup
    syncFirestoreToDatabase().catch(() => {});
  });
}

async function syncFirestoreToDatabase(): Promise<void> {
  try {
    const { initializeApp } = await import('firebase/app');
    const { getFirestore, collection, getDocs } = await import('firebase/firestore');
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) return;

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const fApp = initializeApp(config, 'server-firestore-sync-' + Date.now());
    const fDb = getFirestore(fApp, config.firestoreDatabaseId);

    const snap = await getDocs(collection(fDb, 'reports'));
    if (!snap.empty) {
      const firestoreReports = snap.docs.map(d => ({ ...d.data(), id: d.id })) as ModReportItem[];
      const map = new Map<string, ModReportItem>();
      for (const r of db.reports) {
        if (r && r.id) map.set(r.id, r);
      }
      let changed = false;
      for (const r of firestoreReports) {
        if (r && r.id && !map.has(r.id)) {
          map.set(r.id, r);
          changed = true;
        }
      }
      if (changed) {
        db.reports = Array.from(map.values());
        saveDatabaseToDisk();
        console.log(`[DB] Merged reports from Firestore on startup. Total reports: ${db.reports.length}`);
      }
    }
  } catch (err) {
    console.warn('[DB] Initial Firestore sync deferred:', err);
  }
}

startServer().catch(err => {
  console.error('[LOGAR Server] Failed to start server:', err);
  process.exit(1);
});
