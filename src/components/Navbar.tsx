import React from 'react';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  FileText, 
  PlusCircle, 
  HardDrive, 
  CheckCircle2, 
  BarChart3, 
  ListFilter,
  KeyRound,
  LogOut
} from 'lucide-react';
import { UserProfile, CloudSyncState } from '../types';
import { LogarLogo } from './LogarLogo';

interface NavbarProps {
  activeTab: 'dashboard' | 'reports';
  setActiveTab: (tab: 'dashboard' | 'reports') => void;
  currentUser: UserProfile;
  syncState: CloudSyncState;
  onTriggerSync: () => void;
  onOpenNewReport: () => void;
  onOpenPdfExport: () => void;
  onOpenCloudSync: () => void;
  onOpenAuth: () => void;
  onOpenSuperAdmin: () => void;
  isSuperAdminAuth: boolean;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  syncState,
  onTriggerSync,
  onOpenNewReport,
  onOpenPdfExport,
  onOpenCloudSync,
  onOpenAuth,
  onOpenSuperAdmin,
  isSuperAdminAuth,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#231E1B] border-b border-[#3D352F] text-white shadow-xl">
      {/* Top Banner / Hotel Lombok Garden Official Identity Bar */}
      <div className="bg-[#95A823] px-4 py-1 text-xs text-white font-medium flex items-center justify-between border-b border-[#7B8C1B]/40">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#EAEEBB] animate-pulse"></span>
          <span className="font-semibold tracking-wide text-white text-[11px]">
            LOMBOK GARDEN HOTEL &bull; SISTEM RESMI MANAGER ON DUTY (MOD LOGAR)
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[#FAFBF5] opacity-95">
          <span className="hidden sm:inline">Jl. Bung Karno No. 7, Mataram</span>
          <span className="hidden sm:inline">&bull;</span>
          <span>Google Drive Cloud Sync Aktif</span>
          <span className="hidden md:inline">&bull;</span>
          <span className="hidden md:inline text-[#EAEEBB] font-semibold">Kompresi Hemat &gt;90%</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-17">
          {/* Logo with Lombok Garden Hotel branding */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <LogarLogo variant="full" light={true} />
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center bg-[#2E2824] p-1 rounded-2xl border border-[#453D37]">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-[#95A823] text-white shadow-md shadow-[#95A823]/30'
                  : 'text-[#D9DF98] hover:text-white hover:bg-[#3B332E]'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dasbor Visual</span>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'reports'
                  ? 'bg-[#95A823] text-white shadow-md shadow-[#95A823]/30'
                  : 'text-[#D9DF98] hover:text-white hover:bg-[#3B332E]'
              }`}
            >
              <ListFilter className="w-4 h-4" />
              <span>Data Laporan</span>
            </button>
          </div>

          {/* Actions & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Real-Time Firestore Sync Indicator */}
            <button
              onClick={onOpenCloudSync}
              title="Firebase Firestore Real-Time Database Aktif (Multi-Perangkat & IP)"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-[#1E2B14] hover:bg-[#253619] border border-[#95A823]/50 text-[#EAEEBB] transition"
            >
              <span className="w-2 h-2 rounded-full bg-[#95A823] animate-pulse"></span>
              <span>⚡ Real-Time Multi-IP</span>
            </button>

            {/* Cloud Sync Status Indicator */}
            <button
              onClick={onOpenCloudSync}
              title="Status Sinkronisasi Cloud & Google Drive"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs bg-[#2E2824] hover:bg-[#3B332E] border border-[#453D37] transition text-[#D9DF98]"
            >
              {syncState.isOnline ? (
                syncState.isSyncing ? (
                  <RefreshCw className="w-3.5 h-3.5 text-[#FFBC7D] animate-spin" />
                ) : syncState.pendingCount > 0 ? (
                  <Cloud className="w-3.5 h-3.5 text-[#FFBC7D]" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#95A823]" />
                )
              ) : (
                <CloudOff className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span className="hidden md:inline font-medium">
                {syncState.isSyncing
                  ? 'Menyinkronkan...'
                  : syncState.pendingCount > 0
                  ? `${syncState.pendingCount} Belum Sinkron`
                  : 'Drive Synced'}
              </span>
            </button>

            {/* Export PDF Button in Warm Earth tone */}
            <button
              onClick={onOpenPdfExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#877465] hover:bg-[#70635A] text-white shadow-sm border border-[#9A8778]/40 transition"
            >
              <FileText className="w-3.5 h-3.5 text-[#EAEEBB]" />
              <span className="hidden sm:inline">Ekspor PDF</span>
            </button>

            {/* Input New Inspection Report in Signature Lombok Garden Green */}
            <button
              onClick={onOpenNewReport}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#95A823] hover:bg-[#85971E] text-white shadow-md shadow-[#95A823]/30 transition transform hover:-translate-y-0.5"
            >
              <PlusCircle className="w-4 h-4 text-white" />
              <span>Input MOD</span>
            </button>

            {/* Super Admin Gateway */}
            <button
              onClick={onOpenSuperAdmin}
              title="Akses Backend Super Admin (Restricted)"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                isSuperAdminAuth
                  ? 'bg-[#FFBC7D]/20 text-[#FFBC7D] border-[#FFBC7D]/60 hover:bg-[#FFBC7D]/30'
                  : 'bg-[#2E2824] text-[#D9DF98] border-[#453D37] hover:text-[#FFBC7D] hover:border-[#FFBC7D]/50'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-[#FFBC7D]" />
              <span className="hidden xl:inline">Super Admin</span>
            </button>

            {/* User Profile Info */}
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-2xl bg-[#2E2824] hover:bg-[#3B332E] border border-[#453D37] transition cursor-pointer"
              title="Profil Petugas Aktif"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-7 h-7 rounded-xl object-cover border-2 border-[#95A823]"
              />
              <div className="text-left hidden lg:block">
                <p className="text-xs font-bold text-white leading-tight truncate max-w-[120px]">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-[#C6CC81] leading-tight font-medium">
                  {currentUser.role}
                </p>
              </div>
            </button>

            {/* Logout Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                title="Keluar / Logout dari Sistem"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#2E2824] hover:bg-[#C25941]/20 text-[#D9DF98] hover:text-[#FFBC7D] border border-[#453D37] hover:border-[#C25941]/60 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-[#FFBC7D]" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
