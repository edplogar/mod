import { SystemSettings, SystemAuditLog, HotelLocationConfig, HotelBrandingConfig, DatabaseConnectionConfig } from '../types/index.ts';
import { HOTEL_LOCATIONS, HOTEL_DEPARTMENTS, RAW_MOD_CSV, parseCSVToReports } from '../data/initialData';
import { saveReports, saveSyncConfig } from './storageService';
import { saveAllUsers, INITIAL_HOTEL_USERS } from './authService';
import { extractDriveFolderId } from './driveSyncService';
import { saveSettingsToFirestore, addAuditLogToFirestore } from './firebase';

const SETTINGS_STORAGE_KEY = 'mod_report_system_settings_v1';
const AUDIT_LOG_STORAGE_KEY = 'mod_report_system_audit_logs_v1';

export const DEFAULT_DATABASE_CONNECTION: DatabaseConnectionConfig = {
  driver: 'sqlite_json',
  status: 'connected',
  lastTestedAt: new Date().toISOString(),
  host: 'localhost',
  port: 5432,
  databaseName: 'mod_report_logar',
  username: 'postgres',
  ssl: false,
  connectionTimeoutMs: 5000,
  trueNasDatasetPath: '/mnt/tank/apps/mod_report/data',
  trueNasAppNamespace: 'ix-mod-report',
  enableLocalFallback: true,
  enableFirestoreDualSync: true,
  autoExportBackupCron: 'Daily',
};

export const DEFAULT_BRANDING: HotelBrandingConfig = {
  logoUrl: '/logo-emblem.svg',
  logoShape: 'rounded',
  bgColor: '#16A34A',
  tagline: 'Experience the Green of the City',
  brandTitle: 'LOMBOK GARDEN HOTEL',
  brandSubtitle: 'MOD REPORT LOGAR',
  badgeText: 'MOD',
  customIconType: 'default_flower',
};

export function normalizeBranding(rawBranding?: any): HotelBrandingConfig {
  const merged: HotelBrandingConfig = {
    ...DEFAULT_BRANDING,
    ...(rawBranding || {}),
  };

  if (!merged.brandTitle || merged.brandTitle === 'LOMBOK GARDEN' || merged.brandTitle === 'MOD REPORT LOGAR') {
    merged.brandTitle = 'LOMBOK GARDEN HOTEL';
  }

  if (
    !merged.brandSubtitle ||
    merged.brandSubtitle === 'HOTEL • REPORT LOGAR' ||
    merged.brandSubtitle === 'Sistem Pelaporan & Monitoring Lapangan Manager on Duty'
  ) {
    merged.brandSubtitle = 'MOD REPORT LOGAR';
  }

  return merged;
}

export function normalizeSystemSettings(rawSettings?: any): SystemSettings {
  if (!rawSettings) return DEFAULT_SYSTEM_SETTINGS;
  return {
    ...DEFAULT_SYSTEM_SETTINGS,
    ...rawSettings,
    branding: normalizeBranding(rawSettings.branding),
    databaseConnection: {
      ...DEFAULT_DATABASE_CONNECTION,
      ...(rawSettings.databaseConnection || {}),
    },
  };
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  hotelName: 'Hotel Lombok Garden',
  hotelAddress: 'Jl. Bung Karno No. 7, Mataram, Nusa Tenggara Barat 83127',
  hotelPhone: '(0370) 636015 / +62 811-390-001',
  hotelEmail: 'hotellombokgarden@gmail.com',
  branding: DEFAULT_BRANDING,
  driveFolderId: '1LG_MOD_DRIVE_FOLDER_2026',
  driveFolderName: 'HOTEL LOMBOK GARDEN / MOD REPORTS 2026',
  driveWebhookUrl: '',
  compressionQuality: 0.72,
  maxImageDimension: 1280,
  autoSyncEnabled: true,
  autoSyncIntervalMinutes: 5,
  sessionTimeoutMinutes: 60,
  shifts: {
    morning: { name: 'Shift Pagi', time: '07:00 - 15:00' },
    afternoon: { name: 'Shift Sore', time: '15:00 - 23:00' },
    night: { name: 'Shift Malam', time: '23:00 - 07:00' },
  },
  locations: HOTEL_LOCATIONS.map((loc, idx) => {
    let areaGroup = 'Public Area';
    const locLower = loc.toLowerCase();
    if (locLower.includes('deluxe') || locLower.includes('kamar') || locLower.includes('floor') || locLower.includes('lantai')) {
      areaGroup = 'Deluxe & Rooms';
    } else if (locLower.includes('resto') || locLower.includes('kitchen') || locLower.includes('pantry')) {
      areaGroup = 'F&B & Resto';
    } else if (locLower.includes('pool') || locLower.includes('kolam') || locLower.includes('garden')) {
      areaGroup = 'Pool & Garden';
    } else if (locLower.includes('parkir') || locLower.includes('lobby')) {
      areaGroup = 'Lobby & Parking';
    } else if (locLower.includes('melati') || locLower.includes('edelweis') || locLower.includes('hall')) {
      areaGroup = 'Meeting & Ballrooms';
    } else if (locLower.includes('genset') || locLower.includes('laundry') || locLower.includes('loker') || locLower.includes('gudang')) {
      areaGroup = 'Back of House';
    }
    return {
      id: `loc-${idx + 1}`,
      name: loc,
      areaGroup,
      isActive: true,
    };
  }),
  departments: [...HOTEL_DEPARTMENTS],
};

export function getSystemSettings(): SystemSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const normalized = normalizeSystemSettings(parsed);
      return normalized;
    }
  } catch (e) {
    console.error('Failed loading system settings', e);
  }
  saveSystemSettings(DEFAULT_SYSTEM_SETTINGS);
  return DEFAULT_SYSTEM_SETTINGS;
}

export function getHotelBranding(): HotelBrandingConfig {
  const settings = getSystemSettings();
  return settings.branding || DEFAULT_BRANDING;
}

export function updateHotelBranding(brandingUpdates: Partial<HotelBrandingConfig>, actor: string = 'Super Admin'): SystemSettings {
  const currentSettings = getSystemSettings();
  const currentBranding = currentSettings.branding || DEFAULT_BRANDING;
  
  const updatedBranding: HotelBrandingConfig = normalizeBranding({
    ...currentBranding,
    ...brandingUpdates,
    updatedAt: new Date().toISOString(),
    updatedBy: actor,
  });

  return updateSystemSettings({
    branding: updatedBranding,
    hotelName: updatedBranding.brandTitle ? `Hotel ${updatedBranding.brandTitle}` : currentSettings.hotelName,
  }, actor);
}

export function saveSystemSettings(settings: SystemSettings): void {
  try {
    const normalized = normalizeSystemSettings(settings);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.error('Failed saving system settings', e);
  }
}

export function updateSystemSettings(updates: Partial<SystemSettings>, actor: string = 'Super Admin'): SystemSettings {
  const current = getSystemSettings();
  
  // Normalize drive folder ID if updated
  const cleanUpdates = { ...updates };
  if (cleanUpdates.driveFolderId) {
    cleanUpdates.driveFolderId = extractDriveFolderId(cleanUpdates.driveFolderId);
  }

  const updated: SystemSettings = { ...current, ...cleanUpdates };
  saveSystemSettings(updated);

  // Sync with CloudSync configuration
  saveSyncConfig({
    driveFolderId: updated.driveFolderId,
    driveFolderName: updated.driveFolderName,
    driveWebhookUrl: updated.driveWebhookUrl,
    isAutoSyncEnabled: updated.autoSyncEnabled,
  });

  // Notify components across the application
  try {
    window.dispatchEvent(new CustomEvent('logar_settings_updated', { detail: updated }));
  } catch {
    // ignore in non-browser environments
  }

  addAuditLog(
    'SETTING_UPDATED',
    `Parameter sistem diperbarui: ${Object.keys(updates).join(', ')} (Folder Drive: ${updated.driveFolderName})`,
    'SETTING',
    actor
  );

  // Sync to Firestore in real-time across all devices & IPs
  saveSettingsToFirestore(updated).catch(err => {
    console.warn('Real-time sync to Firestore deferred:', err);
  });

  return updated;
}

export function setSettingsFromCloud(cloudSettings: SystemSettings): void {
  if (!cloudSettings) return;
  const normalized = normalizeSystemSettings(cloudSettings);
  saveSystemSettings(normalized);
  saveSyncConfig({
    driveFolderId: normalized.driveFolderId,
    driveFolderName: normalized.driveFolderName,
    driveWebhookUrl: normalized.driveWebhookUrl,
    isAutoSyncEnabled: normalized.autoSyncEnabled,
  });

  try {
    window.dispatchEvent(new CustomEvent('logar_settings_updated', { detail: normalized }));
  } catch {
    // ignore
  }
}

// Audit Logs Management
export function getAuditLogs(): SystemAuditLog[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed loading audit logs', e);
  }
  return [
    {
      id: 'log-init-1',
      timestamp: new Date().toISOString(),
      actor: 'System Initialization',
      action: 'SYSTEM_BOOT',
      details: 'Sistem MOD REPORT LOGAR diinisialisasi dengan master data Hotel Lombok Garden',
      category: 'SECURITY',
    }
  ];
}

export function addAuditLog(
  action: string,
  details: string,
  category: 'USER' | 'SETTING' | 'DATA' | 'SECURITY',
  actor: string = 'Super Admin'
): void {
  try {
    const logs = getAuditLogs();
    const newLog: SystemAuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      actor,
      action,
      details,
      category,
    };
    const updated = [newLog, ...logs].slice(0, 150); // keep recent 150
    localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(updated));

    // Real-time Firestore sync
    addAuditLogToFirestore(newLog).catch(err => {
      console.warn('Real-time audit log sync deferred:', err);
    });
  } catch (e) {
    console.error('Failed writing audit log', e);
  }
}

export function clearAuditLogs(): void {
  localStorage.removeItem(AUDIT_LOG_STORAGE_KEY);
}

// Full System Backup and Factory Reset
export function exportSystemBackupJson(): string {
  const settings = getSystemSettings();
  const reportsRaw = localStorage.getItem('mod_report_logar_data_v2') || '[]';
  const usersRaw = localStorage.getItem('mod_report_all_users_v2') || '[]';
  const logs = getAuditLogs();

  const backupPacket = {
    app: 'MOD REPORT LOGAR',
    version: '2.6-enterprise',
    exportedAt: new Date().toISOString(),
    settings,
    users: JSON.parse(usersRaw),
    reports: JSON.parse(reportsRaw),
    auditLogs: logs,
  };

  return JSON.stringify(backupPacket, null, 2);
}

export function restoreSystemFromBackup(jsonString: string, actor: string = 'Super Admin'): { success: boolean; message: string } {
  try {
    const packet = JSON.parse(jsonString);
    if (!packet.settings || !Array.isArray(packet.reports)) {
      return { success: false, message: 'Format file cadangan tidak valid atau rusak.' };
    }

    if (packet.settings) saveSystemSettings(packet.settings);
    if (packet.users) saveAllUsers(packet.users);
    if (packet.reports) saveReports(packet.reports);

    addAuditLog('SYSTEM_RESTORE', `Memulihkan sistem dari file cadangan (${packet.reports.length} laporan, ${packet.users?.length || 0} pengguna)`, 'DATA', actor);

    return { success: true, message: `Berhasil memulihkan ${packet.reports.length} laporan dan ${packet.users?.length || 0} pengguna.` };
  } catch (e: any) {
    return { success: false, message: 'Gagal memproses file cadangan: ' + e.message };
  }
}

export function factoryResetSystem(actor: string = 'Super Admin'): void {
  saveReports([]);
  saveAllUsers(INITIAL_HOTEL_USERS);
  saveSystemSettings(DEFAULT_SYSTEM_SETTINGS);
  addAuditLog('FACTORY_RESET', 'Sistem dibersihkan ke kondisi awal Hotel Lombok Garden', 'DATA', actor);
}

export async function testDatabaseConnectionApi(config: DatabaseConnectionConfig): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
  try {
    const res = await fetch('/api/database/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, message: 'Gagal menghubungi server backend: ' + (err.message || 'Network error') };
  }
}

export function generateTrueNasComposeYaml(config: DatabaseConnectionConfig): string {
  const isPostgres = config.driver === 'postgresql';
  const isMySql = config.driver === 'mysql';
  const datasetPath = config.trueNasDatasetPath || '/mnt/tank/apps/mod_report/data';
  const dbName = config.databaseName || 'mod_report_logar';
  const dbUser = config.username || (isPostgres ? 'postgres' : 'root');
  const dbPort = config.port || (isPostgres ? 5432 : 3306);
  const appPort = 3000;

  if (isPostgres) {
    return `# ==============================================================
# TrueNAS SCALE - Docker Compose Configuration
# Aplikasi: MOD REPORT LOGAR + Database PostgreSQL
# ==============================================================
version: '3.8'

services:
  # 1. Aplikasi MOD Report Hotel Lombok Garden
  mod-report-app:
    image: node:20-alpine
    container_name: truenas-mod-report
    restart: always
    working_dir: /app
    ports:
      - "${appPort}:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_DRIVER=postgresql
      - DB_HOST=mod-report-db
      - DB_PORT=5432
      - DB_NAME=${dbName}
      - DB_USER=${dbUser}
      - DB_PASSWORD=${config.password || 'logar123'}
      - TRUENAS_DATASET=${datasetPath}
    volumes:
      # Mount TrueNAS ZFS Dataset untuk data persisten & foto
      - "${datasetPath}:/app/data"
      - "${datasetPath}/uploads:/app/uploads"
    depends_on:
      mod-report-db:
        condition: service_healthy

  # 2. Database PostgreSQL Dedicated Container
  mod-report-db:
    image: postgres:16-alpine
    container_name: truenas-mod-postgres
    restart: always
    ports:
      - "${dbPort}:5432"
    environment:
      - POSTGRES_DB=${dbName}
      - POSTGRES_USER=${dbUser}
      - POSTGRES_PASSWORD=${config.password || 'logar123'}
    volumes:
      # ZFS dataset untuk PostgreSQL WAL & Tablespaces
      - "${datasetPath}/pgdata:/var/lib/postgresql/data"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${dbUser} -d ${dbName}"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  default:
    name: truenas-mod-network
`;
  }

  if (isMySql) {
    return `# ==============================================================
# TrueNAS SCALE - Docker Compose Configuration
# Aplikasi: MOD REPORT LOGAR + MariaDB / MySQL
# ==============================================================
version: '3.8'

services:
  mod-report-app:
    image: node:20-alpine
    container_name: truenas-mod-report
    restart: always
    working_dir: /app
    ports:
      - "${appPort}:3000"
    environment:
      - NODE_ENV=production
      - DB_DRIVER=mysql
      - DB_HOST=mod-report-db
      - DB_PORT=3306
      - DB_NAME=${dbName}
      - DB_USER=${dbUser}
      - DB_PASSWORD=${config.password || 'logar123'}
    volumes:
      - "${datasetPath}:/app/data"
      - "${datasetPath}/uploads:/app/uploads"
    depends_on:
      - mod-report-db

  mod-report-db:
    image: mariadb:11-jammy
    container_name: truenas-mod-mariadb
    restart: always
    ports:
      - "${dbPort}:3306"
    environment:
      - MYSQL_DATABASE=${dbName}
      - MYSQL_USER=${dbUser}
      - MYSQL_PASSWORD=${config.password || 'logar123'}
      - MYSQL_ROOT_PASSWORD=${config.password || 'logar123'}
    volumes:
      - "${datasetPath}/mysql:/var/lib/mysql"

networks:
  default:
    name: truenas-mod-network
`;
  }

  return `# ==============================================================
# TrueNAS SCALE - Standalone Container dengan Local ZFS Storage
# ==============================================================
version: '3.8'

services:
  mod-report-app:
    image: node:20-alpine
    container_name: truenas-mod-report
    restart: always
    working_dir: /app
    ports:
      - "${appPort}:3000"
    volumes:
      # TrueNAS ZFS Dataset Storage Mount
      - "${datasetPath}:/app/data"
      - "${datasetPath}/uploads:/app/uploads"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_DRIVER=${config.driver}
`;
}
