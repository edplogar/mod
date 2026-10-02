export type Department = 
  | 'Housekeeping'
  | 'Engineering'
  | 'FB Service'
  | 'Fb Product'
  | 'Security'
  | 'Front Office'
  | 'General'
  | 'None';

export type ReportStatus = 'Aman' | 'Perlu Follow Up' | 'Dalam Proses' | 'Selesai';

export type PriorityLevel = 'Rendah' | 'Normal' | 'Tinggi' | 'Urgent';

export type ShiftType = 'Pagi (07:00 - 15:00)' | 'Sore (15:00 - 23:00)' | 'Malam (23:00 - 07:00)' | 'General';

export interface PictureItem {
  id: string;
  driveUrl: string;
  driveId?: string;
  driveFolderId?: string;
  driveFolderName?: string;
  name?: string;
  thumbnailUrl?: string;
  originalSizeBytes?: number;
  compressedSizeBytes?: number;
  compressionRatio?: number; // e.g. 85 (%)
  uploadedToDrive?: boolean;
  uploadStatus?: 'synced' | 'pending' | 'local';
}

export interface ModReportItem {
  id: string;
  timestamp: string; // ISO string or original format
  date: string;
  time: string;
  officerName: string;
  location: string;
  areaGroup: string; // e.g. 'Deluxe Building', 'F&B Area', 'Public Area', 'Back of House', 'Pool & Garden'
  problem: string;
  followUpDept: Department;
  status: ReportStatus;
  priority: PriorityLevel;
  pictures: PictureItem[];
  shift: ShiftType;
  notes?: string;
  synced: boolean;
  syncedAt?: string;
}

export type UserRole = 'Super Admin' | 'General Manager' | 'Duty Manager' | 'MOD Officer' | 'Department Head' | 'Staff';

export interface UserProfile {
  id: string;
  username: string;
  password?: string;
  name: string;
  email: string;
  role: UserRole;
  department: Department;
  avatar: string;
  phone?: string;
  status?: 'active' | 'suspended';
  lastActive?: string;
  createdAt?: string;
}

export interface HotelLocationConfig {
  id: string;
  name: string;
  areaGroup: string;
  isActive: boolean;
}

export interface SystemSettings {
  hotelName: string;
  hotelAddress: string;
  hotelPhone: string;
  hotelEmail: string;
  driveFolderId: string;
  driveFolderName: string;
  driveWebhookUrl?: string;
  compressionQuality: number; // e.g. 0.72
  maxImageDimension: number; // e.g. 1280
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  sessionTimeoutMinutes: number;
  shifts: {
    morning: { name: string; time: string };
    afternoon: { name: string; time: string };
    night: { name: string; time: string };
  };
  locations: HotelLocationConfig[];
  departments: string[];
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  category: 'USER' | 'SETTING' | 'DATA' | 'SECURITY';
}

export interface FilterState {
  search: string;
  startDate: string;
  endDate: string;
  officer: string;
  department: string;
  location: string;
  status: string;
  hasPhotos: boolean | null;
}

export interface CloudSyncState {
  isAutoSyncEnabled: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
  totalSyncedCount: number;
  driveFolderName: string;
  driveFolderId: string;
  driveWebhookUrl?: string;
}
