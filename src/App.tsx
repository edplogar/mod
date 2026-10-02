import React, { useState, useEffect, useCallback } from 'react';
import { 
  loadReports, 
  saveReports, 
  getSyncState, 
  syncReportsToCloud, 
  saveSyncConfig 
} from './services/storageService';
import { 
  getStoredUser, 
  saveStoredUser, 
  getSessionUser,
  setSessionUser,
  clearSessionUser,
  isSuperAdminSessionValid,
  setSuperAdminSession,
  clearSuperAdminSession,
  getAllUsers,
  INITIAL_HOTEL_USERS,
  setUsersFromCloud
} from './services/authService';
import { setSettingsFromCloud } from './services/systemSettingsService';
import { 
  subscribeToFirestoreReports, 
  subscribeToFirestoreUsers, 
  subscribeToFirestoreSettings, 
  saveReportToFirestore, 
  deleteReportFromFirestore, 
  initFirebaseAuth, 
  seedUsersToFirestore 
} from './services/firebase';
import { ModReportItem, ReportStatus, UserProfile, CloudSyncState } from './types';
import { LoginPage } from './components/LoginPage';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ReportListView } from './components/ReportListView';
import { NewReportModal } from './components/NewReportModal';
import { PdfExportModal } from './components/PdfExportModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { AuthModal } from './components/AuthModal';
import { SuperAdminDashboard } from './components/admin/SuperAdminDashboard';
import { SuperAdminLoginModal } from './components/admin/SuperAdminLoginModal';
import { 
  Building2, 
  CheckCircle, 
  ShieldCheck, 
  Cloud, 
  Sparkles, 
  ArrowUpRight,
  HardDrive
} from 'lucide-react';

export default function App() {
  const [reports, setReports] = useState<ModReportItem[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getSessionUser());
  const [syncState, setSyncState] = useState<CloudSyncState>({
    isAutoSyncEnabled: true,
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncedAt: null,
    pendingCount: 0,
    totalSyncedCount: 0,
    driveFolderName: 'HOTEL LOMBOK GARDEN / MOD REPORTS 2026',
    driveFolderId: '1LG_MOD_DRIVE_FOLDER_2026',
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports'>('dashboard');
  const [reportFilterStatus, setReportFilterStatus] = useState<string>('all');

  // Modals
  const [isNewReportOpen, setIsNewReportOpen] = useState(false);
  const [isPdfExportOpen, setIsPdfExportOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSuperAdminLoginOpen, setIsSuperAdminLoginOpen] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);
  const [isSuperAdminAuth, setIsSuperAdminAuth] = useState(isSuperAdminSessionValid());

  // Toast banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // Initialize data & real-time Firestore sync listeners
  useEffect(() => {
    const loaded = loadReports();
    setReports(loaded);
    setSyncState(getSyncState(loaded));

    // Initialize Firebase Auth & seed initial users to Firestore
    initFirebaseAuth().then(() => {
      seedUsersToFirestore(getAllUsers());
    }).catch(err => {
      console.warn('Firebase init note:', err);
    });

    // Real-time synchronization for MOD reports across all devices & IPs
    const unsubReports = subscribeToFirestoreReports(
      (cloudReports) => {
        if (cloudReports && cloudReports.length > 0) {
          setReports(cloudReports);
          saveReports(cloudReports);
          setSyncState(getSyncState(cloudReports));
        }
      },
      (err) => console.warn('Real-time reports listener note:', err)
    );

    // Real-time synchronization for users and permissions across all devices & IPs
    const unsubUsers = subscribeToFirestoreUsers(
      (cloudUsers) => {
        if (cloudUsers && cloudUsers.length > 0) {
          setUsersFromCloud(cloudUsers);
        }
      },
      (err) => console.warn('Real-time users listener note:', err)
    );

    // Real-time synchronization for system settings across all devices & IPs
    const unsubSettings = subscribeToFirestoreSettings(
      (cloudSettings) => {
        if (cloudSettings) {
          setSettingsFromCloud(cloudSettings);
        }
      },
      (err) => console.warn('Real-time settings listener note:', err)
    );

    return () => {
      unsubReports();
      unsubUsers();
      unsubSettings();
    };
  }, []);

  // Listen to network status
  useEffect(() => {
    const handleOnline = () => {
      setSyncState(prev => ({ ...prev, isOnline: true }));
      showToast('Koneksi internet kembali aktif & cloud tersambung.');
    };
    const handleOffline = () => {
      setSyncState(prev => ({ ...prev, isOnline: false }));
      showToast('Mode Offline. Data tetap disimpan lokal & akan disinkronkan saat online.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleSettingsUpdated = () => {
      setSyncState(getSyncState(reports));
    };
    window.addEventListener('logar_settings_updated', handleSettingsUpdated);

    const handleReportsUpdated = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setReports(e.detail);
        setSyncState(getSyncState(e.detail));
      }
    };
    window.addEventListener('logar_reports_updated', handleReportsUpdated);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('logar_settings_updated', handleSettingsUpdated);
      window.removeEventListener('logar_reports_updated', handleReportsUpdated);
    };
  }, [reports, showToast]);

  // Cloud sync trigger
  const handleTriggerSync = useCallback(async () => {
    setSyncState(prev => ({ ...prev, isSyncing: true }));
    try {
      const res = await syncReportsToCloud(reports);
      if (res.success) {
        setReports(res.updatedReports);
        setSyncState(getSyncState(res.updatedReports));
        showToast(
          res.syncedCount > 0 
            ? `Berhasil menyinkronkan ${res.syncedCount} laporan ke Firebase & Google Drive!`
            : 'Semua laporan sudah tersinkronisasi dengan Cloud.'
        );
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal melakukan sinkronisasi cloud.');
    } finally {
      setSyncState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [reports, showToast]);

  // Add new report
  const handleAddReport = (newReport: ModReportItem) => {
    const updated = [newReport, ...reports];
    setReports(updated);
    saveReports(updated);
    setSyncState(getSyncState(updated));

    // Real-time Firestore sync across all devices & IPs
    saveReportToFirestore(newReport).catch(err => {
      console.warn('Real-time Firestore write deferred:', err);
    });

    showToast(`Laporan MOD area "${newReport.location}" berhasil dicatat & disinkronkan real-time!`);

    // Auto-sync in background if enabled and online
    if (syncState.isAutoSyncEnabled && navigator.onLine) {
      setTimeout(() => {
        handleTriggerSync();
      }, 1200);
    }
  };

  // Update report status
  const handleUpdateStatus = (reportId: string, newStatus: ReportStatus) => {
    let targetReport: ModReportItem | null = null;
    const updated = reports.map(r => {
      if (r.id === reportId) {
        targetReport = { ...r, status: newStatus, synced: false };
        return targetReport;
      }
      return r;
    });
    setReports(updated);
    saveReports(updated);
    setSyncState(getSyncState(updated));

    if (targetReport) {
      // Real-time Firestore update across all devices & IPs
      saveReportToFirestore(targetReport).catch(err => {
        console.warn('Real-time Firestore update deferred:', err);
      });
    }

    showToast(`Status temuan diperbarui menjadi: ${newStatus}`);
  };

  // Delete report
  const handleDeleteReport = (reportId: string) => {
    const updated = reports.filter(r => r.id !== reportId);
    setReports(updated);
    saveReports(updated);
    setSyncState(getSyncState(updated));

    // Real-time Firestore delete across all devices & IPs
    deleteReportFromFirestore(reportId).catch(err => {
      console.warn('Real-time Firestore delete deferred:', err);
    });

    showToast('Catatan inspeksi dihapus.');
  };

  const handleLogout = () => {
    clearSessionUser();
    clearSuperAdminSession();
    setIsSuperAdminAuth(false);
    setIsAdminView(false);
    setCurrentUser(null);
    showToast('Anda telah berhasil keluar dari sistem MOD LOGAR.');
  };

  // Navigate to reports tab with optional filter
  const handleNavigateToReports = (statusFilter?: string) => {
    if (statusFilter) {
      setReportFilterStatus(statusFilter);
    } else {
      setReportFilterStatus('all');
    }
    setActiveTab('reports');
  };

  const handleOpenSuperAdmin = () => {
    if (isSuperAdminSessionValid()) {
      setIsSuperAdminAuth(true);
      setIsAdminView(true);
    } else {
      setIsSuperAdminLoginOpen(true);
    }
  };

  const handleRefreshData = () => {
    const loaded = loadReports();
    setReports(loaded);
    setSyncState(getSyncState(loaded));
  };

  // Default Landing Page: If user is not authenticated, show LoginPage
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FAFBF5]">
        {/* Toast Banner */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 bg-[#231E1B] text-[#FAFBF5] px-4 py-3 rounded-2xl shadow-2xl border border-[#95A823]/50 flex items-center gap-2.5 text-xs animate-bounce font-medium">
            <Sparkles className="w-4 h-4 text-[#95A823] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        <LoginPage
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setSessionUser(user);
            if (user.role === 'Super Admin') {
              setIsSuperAdminAuth(true);
              setSuperAdminSession();
            }
            showToast(`Selamat datang, ${user.name} (${user.role})!`);
          }}
          onOpenSuperAdmin={handleOpenSuperAdmin}
        />

        <SuperAdminLoginModal
          isOpen={isSuperAdminLoginOpen}
          onClose={() => setIsSuperAdminLoginOpen(false)}
          onLoginSuccess={() => {
            setIsSuperAdminAuth(true);
            const superAdminUser = getAllUsers().find(u => u.role === 'Super Admin') || INITIAL_HOTEL_USERS[0];
            setSessionUser(superAdminUser);
            setCurrentUser(superAdminUser);
            setIsAdminView(true);
            showToast('Selamat datang di Super Admin Backend Control Center.');
          }}
        />
      </div>
    );
  }

  // If in Super Admin Backend mode, show full backend control center
  if (isAdminView) {
    return (
      <SuperAdminDashboard
        onBackToApp={() => {
          setIsAdminView(false);
          setIsSuperAdminAuth(isSuperAdminSessionValid());
        }}
        reports={reports}
        onRefreshData={handleRefreshData}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBF5] text-[#231E1B] flex flex-col font-sans">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#231E1B] text-[#FAFBF5] px-4 py-3 rounded-2xl shadow-2xl border border-[#95A823]/50 flex items-center gap-2.5 text-xs animate-bounce font-medium">
          <Sparkles className="w-4 h-4 text-[#95A823] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        syncState={syncState}
        onTriggerSync={handleTriggerSync}
        onOpenNewReport={() => setIsNewReportOpen(true)}
        onOpenPdfExport={() => setIsPdfExportOpen(true)}
        onOpenCloudSync={() => setIsCloudSyncOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenSuperAdmin={handleOpenSuperAdmin}
        isSuperAdminAuth={isSuperAdminAuth}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' ? (
          <DashboardView
            reports={reports}
            currentUser={currentUser}
            onNavigateToReports={handleNavigateToReports}
            onOpenNewReport={() => setIsNewReportOpen(true)}
          />
        ) : (
          <ReportListView
            reports={reports}
            currentUser={currentUser}
            onUpdateStatus={handleUpdateStatus}
            onDeleteReport={handleDeleteReport}
            onOpenPdfExport={() => setIsPdfExportOpen(true)}
            initialFilterStatus={reportFilterStatus}
          />
        )}
      </main>

      {/* Footer in Official Lombok Garden Hotel Dark Earth Timber */}
      <footer className="bg-[#231E1B] border-t border-[#3D352F] text-[#C6CC81] py-7 text-xs mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#95A823]"></span>
              <span className="font-extrabold text-white tracking-wide">HOTEL LOMBOK GARDEN</span>
            </div>
            <span className="hidden sm:inline text-[#877465]">&bull;</span>
            <span className="text-[#D9DF98] font-serif italic text-sm">Experience the Green of the City</span>
            <span className="hidden md:inline text-[#877465]">&bull;</span>
            <span className="text-[#877465] hidden md:inline">MOD REPORT LOGAR &bull; Sistem Monitoring &amp; Patroli</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#FAFBF5]/90">
            <span className="flex items-center gap-1 text-[#95A823] font-semibold">
              <Cloud className="w-3.5 h-3.5" /> Auto-Sync Aktif
            </span>
            <span className="text-[#877465]">&bull;</span>
            <span className="flex items-center gap-1 text-[#EAEEBB]">
              <HardDrive className="w-3.5 h-3.5 text-[#C6CC81]" /> Google Drive Kompresi On
            </span>
            <span className="text-[#877465]">&bull;</span>
            <button
              onClick={handleOpenSuperAdmin}
              className="text-[#FFBC7D] hover:text-[#FFAE64] underline font-bold"
            >
              Super Admin Backend
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <NewReportModal
        isOpen={isNewReportOpen}
        onClose={() => setIsNewReportOpen(false)}
        onSubmit={handleAddReport}
        currentUser={currentUser}
      />

      <PdfExportModal
        isOpen={isPdfExportOpen}
        onClose={() => setIsPdfExportOpen(false)}
        reports={reports}
        currentUser={currentUser}
      />

      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        syncState={syncState}
        reports={reports}
        onTriggerSync={handleTriggerSync}
        onToggleAutoSync={(enabled) => {
          saveSyncConfig({ isAutoSyncEnabled: enabled });
          setSyncState(prev => ({ ...prev, isAutoSyncEnabled: enabled }));
          showToast(`Auto-sync cloud ${enabled ? 'diaktifkan' : 'dinonaktifkan'}.`);
        }}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <SuperAdminLoginModal
        isOpen={isSuperAdminLoginOpen}
        onClose={() => setIsSuperAdminLoginOpen(false)}
        onLoginSuccess={() => {
          setIsSuperAdminAuth(true);
          setIsAdminView(true);
          showToast('Selamat datang di Super Admin Backend Control Center.');
        }}
      />
    </div>
  );
}
