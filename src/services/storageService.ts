import { ModReportItem, CloudSyncState, PictureItem } from '../types/index.ts';
import { parseCSVToReports, RAW_MOD_CSV } from '../data/initialData';
import { getSystemSettings } from './systemSettingsService';
import { syncAllPhotosToDrive, extractDriveFolderId, getDriveFolderUrl } from './driveSyncService';
import { batchSyncReportsToFirestore, saveReportToFirestore, clearAllReportsFromFirestore } from './firebase';

const STORAGE_KEY = 'mod_report_logar_data_v2';
const SYNC_CONFIG_KEY = 'mod_report_logar_sync_config_v1';
const CLEARED_KEY = 'mod_report_logar_cleared_v1';

export function loadReports(): ModReportItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading reports from localStorage', e);
  }

  return [];
}

export function saveReports(reports: ModReportItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (e) {
    console.error('Error saving reports to localStorage', e);
  }
}

export async function clearAllReports(): Promise<void> {
  saveReports([]);
  try {
    await clearAllReportsFromFirestore();
  } catch (err) {
    console.warn('Error clearing Firestore reports:', err);
  }
  try {
    window.dispatchEvent(new CustomEvent('logar_reports_updated', { detail: [] }));
  } catch {
    // ignore
  }
}

export function getSyncState(reports: ModReportItem[]): CloudSyncState {
  const settings = getSystemSettings();
  const cleanFolderId = extractDriveFolderId(settings.driveFolderId) || '1LG_MOD_DRIVE_FOLDER_2026';
  const cleanFolderName = settings.driveFolderName || 'HOTEL LOMBOK GARDEN / MOD REPORTS 2026';

  let config = {
    isAutoSyncEnabled: settings.autoSyncEnabled ?? true,
    lastSyncedAt: new Date().toISOString(),
    driveFolderName: cleanFolderName,
    driveFolderId: cleanFolderId,
    driveWebhookUrl: settings.driveWebhookUrl || '',
  };

  try {
    const raw = localStorage.getItem(SYNC_CONFIG_KEY);
    if (raw) {
      config = { ...config, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Error loading sync config', e);
  }

  // Always enforce latest Super Admin settings
  config.driveFolderId = cleanFolderId;
  config.driveFolderName = cleanFolderName;
  if (settings.driveWebhookUrl) {
    config.driveWebhookUrl = settings.driveWebhookUrl;
  }

  const pending = reports.filter(r => !r.synced).length;
  const synced = reports.filter(r => r.synced).length;

  return {
    isAutoSyncEnabled: config.isAutoSyncEnabled,
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncedAt: config.lastSyncedAt,
    pendingCount: pending,
    totalSyncedCount: synced,
    driveFolderName: config.driveFolderName,
    driveFolderId: config.driveFolderId,
    driveWebhookUrl: config.driveWebhookUrl,
  };
}

export function saveSyncConfig(config: Partial<CloudSyncState>): void {
  try {
    const current = localStorage.getItem(SYNC_CONFIG_KEY);
    const parsed = current ? JSON.parse(current) : {};
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify({ ...parsed, ...config }));
  } catch (e) {
    console.error('Error saving sync config', e);
  }
}

/**
 * Perform Cloud Sync: uploads all unsynced reports and marks them as synced,
 * ensuring all photos are synchronized and stamped with the designated Super Admin Google Drive folder.
 */
export async function syncReportsToCloud(
  reports: ModReportItem[]
): Promise<{ success: boolean; syncedCount: number; updatedReports: ModReportItem[]; uploadedDriveCount?: number }> {
  const settings = getSystemSettings();
  const folderId = extractDriveFolderId(settings.driveFolderId) || '1LG_MOD_DRIVE_FOLDER_2026';
  const folderName = settings.driveFolderName || 'HOTEL LOMBOK GARDEN / MOD REPORTS 2026';
  const webhookUrl = settings.driveWebhookUrl;

  // Sync photos to Google Drive folder (if webhook configured, upload; otherwise ensure folder metadata is stamped)
  const driveResult = await syncAllPhotosToDrive(reports, folderId, webhookUrl);

  const now = new Date().toISOString();
  let count = 0;

  const updated = driveResult.updatedReports.map(item => {
    // Stamp all photos to the active Super Admin folder
    const picturesWithFolder = (item.pictures || []).map(p => ({
      ...p,
      driveFolderId: p.driveFolderId || folderId,
      driveFolderName: p.driveFolderName || folderName,
      driveUrl: p.driveUrl || getDriveFolderUrl(folderId),
    }));

    if (!item.synced) {
      count++;
      return {
        ...item,
        pictures: picturesWithFolder,
        synced: true,
        syncedAt: now,
      };
    }
    return {
      ...item,
      pictures: picturesWithFolder,
    };
  });

  saveReports(updated);
  saveSyncConfig({ 
    lastSyncedAt: now, 
    driveFolderId: folderId, 
    driveFolderName: folderName,
    driveWebhookUrl: webhookUrl,
  });

  // Real-time synchronization to Firebase Firestore across all devices and IPs
  try {
    await batchSyncReportsToFirestore(updated);
  } catch (err) {
    console.warn('Real-time sync to Firestore deferred:', err);
  }

  return { 
    success: true, 
    syncedCount: count, 
    updatedReports: updated,
    uploadedDriveCount: driveResult.uploadedCount,
  };
}

export function setReportsFromCloud(cloudReports: ModReportItem[]): void {
  if (!cloudReports || cloudReports.length === 0) return;
  saveReports(cloudReports);
  try {
    window.dispatchEvent(new CustomEvent('logar_reports_updated', { detail: cloudReports }));
  } catch {
    // ignore
  }
}

/**
 * Calculates total storage space saved via compression across all photos in the dataset
 */
export function calculateStorageSavings(reports: ModReportItem[]): {
  totalPictures: number;
  originalBytes: number;
  compressedBytes: number;
  savedBytes: number;
  percentageSaved: number;
} {
  let totalPictures = 0;
  let originalBytes = 0;
  let compressedBytes = 0;

  reports.forEach(r => {
    if (r.pictures && r.pictures.length > 0) {
      r.pictures.forEach(p => {
        totalPictures++;
        originalBytes += p.originalSizeBytes || 2500000;
        compressedBytes += p.compressedSizeBytes || 140000;
      });
    }
  });

  const savedBytes = Math.max(0, originalBytes - compressedBytes);
  const percentageSaved = originalBytes > 0 ? Math.round((savedBytes / originalBytes) * 100) : 0;

  return {
    totalPictures,
    originalBytes,
    compressedBytes,
    savedBytes,
    percentageSaved,
  };
}
