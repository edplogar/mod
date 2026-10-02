import React, { useState, useMemo } from 'react';
import { 
  ModReportItem, 
  Department, 
  ReportStatus, 
  UserProfile,
  PictureItem
} from '../types';
import { 
  Search, 
  Filter, 
  ExternalLink, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Trash2, 
  Calendar, 
  User, 
  MapPin, 
  Eye, 
  X,
  FileDown,
  Layers,
  Sparkles,
  FolderOpen,
  Download,
  HardDrive
} from 'lucide-react';
import { formatBytes } from '../services/imageCompressionService';
import { getDriveFolderUrl } from '../services/driveSyncService';
import { getSystemSettings } from '../services/systemSettingsService';

interface ReportListViewProps {
  reports: ModReportItem[];
  currentUser: UserProfile;
  onUpdateStatus: (reportId: string, newStatus: ReportStatus) => void;
  onDeleteReport: (reportId: string) => void;
  onOpenPdfExport: () => void;
  initialFilterStatus?: string;
}

export const ReportListView: React.FC<ReportListViewProps> = ({
  reports,
  currentUser,
  onUpdateStatus,
  onDeleteReport,
  onOpenPdfExport,
  initialFilterStatus = 'all',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialFilterStatus);
  const [selectedOfficer, setSelectedOfficer] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Photo viewer modal state
  const [activePhotoModal, setActivePhotoModal] = useState<{
    isOpen: boolean;
    report: ModReportItem | null;
  }>({
    isOpen: false,
    report: null,
  });

  const handleDownloadPhoto = (pic: PictureItem) => {
    if (!pic.thumbnailUrl) return;
    const a = document.createElement('a');
    a.href = pic.thumbnailUrl;
    a.download = pic.name || `MOD_Bukti_${pic.id}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Extract unique officers
  const uniqueOfficers = useMemo(() => {
    const list = Array.from(new Set(reports.map(r => r.officerName))).filter(Boolean);
    return list.sort();
  }, [reports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter(item => {
      // Search keyword
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesLoc = item.location.toLowerCase().includes(query);
        const matchesProb = item.problem.toLowerCase().includes(query);
        const matchesOfficer = item.officerName.toLowerCase().includes(query);
        const matchesDate = item.date.includes(query);
        if (!matchesLoc && !matchesProb && !matchesOfficer && !matchesDate) {
          return false;
        }
      }

      // Dept filter
      if (selectedDept !== 'all') {
        if (item.followUpDept !== selectedDept) return false;
      }

      // Status filter
      if (selectedStatus !== 'all') {
        if (item.status !== selectedStatus) return false;
      }

      // Officer filter
      if (selectedOfficer !== 'all') {
        if (item.officerName !== selectedOfficer) return false;
      }

      return true;
    });
  }, [reports, searchTerm, selectedDept, selectedStatus, selectedOfficer]);

  const totalPages = Math.ceil(filteredReports.length / pageSize) || 1;
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, currentPage, pageSize]);

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'Aman':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#EAEEBB] text-[#5B6713] border border-[#C6CC81]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#95A823]" />
            Aman
          </span>
        );
      case 'Perlu Follow Up':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FBEBE7] text-[#C25941] border border-[#F2D7D0]">
            <AlertTriangle className="w-3.5 h-3.5 text-[#C25941]" />
            Perlu Follow Up
          </span>
        );
      case 'Dalam Proses':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FEF3E2] text-[#D48227] border border-[#FCE1B8]">
            <Clock className="w-3.5 h-3.5 text-[#D48227]" />
            Dalam Proses
          </span>
        );
      case 'Selesai':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#E8F0E4] text-[#43752E] border border-[#BBDDB0]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#43752E]" />
            Selesai
          </span>
        );
    }
  };

  const getDeptColor = (dept: Department) => {
    switch (dept) {
      case 'Housekeeping':
        return 'bg-[#EAEEBB]/70 text-[#5B6713] border-[#C6CC81]';
      case 'Engineering':
        return 'bg-[#F4EFEA] text-[#877465] border-[#D6C7BC]';
      case 'FB Service':
        return 'bg-[#F3F6D9] text-[#7B8C1B] border-[#C6CC81]';
      case 'Fb Product':
        return 'bg-[#FFF2E2] text-[#C77726] border-[#FFBC7D]';
      case 'Security':
        return 'bg-[#EDEAE7] text-[#61554D] border-[#D1CCC7]';
      case 'Front Office':
        return 'bg-[#E8F0E4] text-[#43752E] border-[#A8CC98]';
      default:
        return 'bg-[#FAFBF5] text-[#70635A] border-[#DFE4C4]';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Filter Control Panel */}
      <div className="bg-white rounded-3xl p-5 border border-[#E2E7B8] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#231E1B] tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#95A823]" />
              Daftar Riwayat Inspeksi Lapangan MOD
            </h2>
            <p className="text-xs text-[#70635A]">
              Menampilkan {filteredReports.length} dari total {reports.length} catatan inspeksi Hotel Lombok Garden
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenPdfExport}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#877465] hover:bg-[#70635A] text-white rounded-2xl text-xs font-bold shadow-sm transition"
            >
              <FileDown className="w-4 h-4 text-[#EAEEBB]" />
              <span>Ekspor PDF Format Resmi</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-[#F0F2E2]">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#877465]" />
            <input
              type="text"
              placeholder="Cari lokasi, temuan, atau nama..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FAFBF5] border border-[#D9DF98] text-[#231E1B] placeholder-[#877465]/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#95A823]/20 focus:border-[#95A823] transition"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[#FAFBF5] border border-[#D9DF98] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#95A823]/20 focus:border-[#95A823] font-semibold text-[#231E1B] transition"
            >
              <option value="all">Semua Departemen Follow-Up</option>
              <option value="Housekeeping">Housekeeping (HK)</option>
              <option value="Engineering">Engineering &amp; Teknisi</option>
              <option value="FB Service">Food &amp; Beverage Service</option>
              <option value="Fb Product">FB Product (Kitchen)</option>
              <option value="Security">Security &amp; Keamanan</option>
              <option value="Front Office">Front Office (Reception)</option>
              <option value="None">Tidak Ada Follow-Up (Kondusif)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[#FAFBF5] border border-[#D9DF98] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#95A823]/20 focus:border-[#95A823] font-semibold text-[#231E1B] transition"
            >
              <option value="all">Semua Status Kondisi</option>
              <option value="Aman">Aman &amp; Bersih</option>
              <option value="Perlu Follow Up">Perlu Follow-Up</option>
              <option value="Dalam Proses">Dalam Proses</option>
              <option value="Selesai">Tuntas Selesai</option>
            </select>
          </div>

          {/* Officer Filter */}
          <div>
            <select
              value={selectedOfficer}
              onChange={(e) => {
                setSelectedOfficer(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[#FAFBF5] border border-[#D9DF98] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#95A823]/20 focus:border-[#95A823] font-semibold text-[#231E1B] transition"
            >
              <option value="all">Semua Petugas MOD</option>
              {uniqueOfficers.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-[#E2E7B8] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#231E1B] text-[#EAEEBB] text-[11px] font-bold tracking-wider uppercase border-b-2 border-[#95A823]">
                <th className="py-3 px-4 w-12 text-center text-[#C6CC81]">No</th>
                <th className="py-3 px-4 w-32">Waktu &amp; Shift</th>
                <th className="py-3 px-4 w-40">Petugas MOD</th>
                <th className="py-3 px-4 w-48">Area / Lokasi</th>
                <th className="py-3 px-4">Temuan &amp; Kondisi Lapangan</th>
                <th className="py-3 px-4 w-36">Follow Up Dept</th>
                <th className="py-3 px-4 w-32 text-center">Status</th>
                <th className="py-3 px-4 w-28 text-center">Bukti / Foto</th>
                <th className="py-3 px-3 w-16 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F2E2] text-xs text-[#61554D]">
              {paginatedReports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#877465]">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-[#C6CC81]" />
                    Tidak ada data inspeksi yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                paginatedReports.map((report, idx) => {
                  const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr 
                      key={report.id}
                      className="hover:bg-[#FAFBF5] transition-colors group"
                    >
                      {/* Index */}
                      <td className="py-3 px-4 text-center font-mono text-[#877465] text-[11px]">
                        {itemIndex}
                      </td>

                      {/* Date, Time, Shift */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#231E1B] flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#877465]" />
                          <span>{report.date}</span>
                        </div>
                        <div className="text-[11px] text-[#70635A] font-mono mt-0.5">
                          {report.time} &bull; {report.shift.split(' ')[0]}
                        </div>
                      </td>

                      {/* Officer */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#231E1B] flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#95A823]" />
                          <span className="truncate max-w-[140px]">{report.officerName}</span>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#231E1B] flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#877465] shrink-0" />
                          <span className="line-clamp-2 leading-tight">{report.location}</span>
                        </div>
                        <span className="inline-block mt-1 text-[10px] bg-[#EAEEBB]/60 text-[#5B6713] border border-[#C6CC81]/40 px-1.5 py-0.5 rounded font-medium">
                          {report.areaGroup}
                        </span>
                      </td>

                      {/* Problem / Condition */}
                      <td className="py-3 px-4">
                        <p className={`line-clamp-3 leading-relaxed ${
                          report.status === 'Perlu Follow Up' ? 'text-[#231E1B] font-semibold' : 'text-[#61554D]'
                        }`}>
                          {report.problem}
                        </p>
                      </td>

                      {/* Follow up Dept */}
                      <td className="py-3 px-4">
                        {report.followUpDept && report.followUpDept !== 'None' ? (
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${getDeptColor(report.followUpDept)}`}>
                            {report.followUpDept}
                          </span>
                        ) : (
                          <span className="text-[#877465] text-xs">-</span>
                        )}
                      </td>

                      {/* Status + Toggle Dropdown */}
                      <td className="py-3 px-4 text-center">
                        <select
                          value={report.status}
                          onChange={(e) => onUpdateStatus(report.id, e.target.value as ReportStatus)}
                          className="text-xs font-semibold px-2 py-1 rounded-lg border border-[#D9DF98] bg-[#FAFBF5] focus:bg-white text-[#231E1B] focus:outline-none cursor-pointer"
                        >
                          <option value="Aman">Aman</option>
                          <option value="Perlu Follow Up">Perlu Follow Up</option>
                          <option value="Dalam Proses">Dalam Proses</option>
                          <option value="Selesai">Selesai</option>
                        </select>
                      </td>

                      {/* Pictures & Google Drive Link */}
                      <td className="py-3 px-4 text-center">
                        {report.pictures && report.pictures.length > 0 ? (
                          <button
                            onClick={() => setActivePhotoModal({ isOpen: true, report })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EAEEBB]/70 hover:bg-[#EAEEBB] border border-[#C6CC81] text-[#5B6713] text-xs font-bold transition shadow-2xs"
                            title="Buka bukti foto Google Drive"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-[#95A823]" />
                            <span>{report.pictures.length} Foto</span>
                          </button>
                        ) : (
                          <span className="text-[#877465]/60 text-xs font-mono">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => {
                            if (window.confirm('Hapus baris laporan inspeksi ini?')) {
                              onDeleteReport(report.id);
                            }
                          }}
                          className="p-1 rounded text-[#877465] hover:text-[#C25941] hover:bg-[#FBEBE7] transition"
                          title="Hapus baris laporan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="bg-[#F8F9F3] px-4 py-3 border-t border-[#E2E7B8] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#70635A]">
          <div>
            Halaman <strong className="text-[#231E1B]">{currentPage}</strong> dari{' '}
            <strong className="text-[#231E1B]">{totalPages}</strong> ({filteredReports.length} data ditemukan)
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-[#D9DF98] bg-white text-[#231E1B] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#EAEEBB]/50 transition"
            >
              Sebelumnya
            </button>
            <div className="px-2 font-mono text-[#70635A]">
              {currentPage} / {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-[#D9DF98] bg-white text-[#231E1B] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#EAEEBB]/50 transition"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* Picture Viewer Modal (Google Drive Evidence) */}
      {activePhotoModal.isOpen && activePhotoModal.report && (
        <div className="fixed inset-0 z-50 bg-[#1A1614]/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-[#E2E7B8]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#3D352F] flex items-center justify-between bg-[#231E1B] text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#95A823] flex items-center justify-center text-white">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Bukti Pendukung Google Drive ({activePhotoModal.report.pictures.length} File)
                  </h3>
                  <p className="text-xs text-[#C6CC81] mt-0.5">
                    {activePhotoModal.report.location} &bull; {activePhotoModal.report.date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActivePhotoModal({ isOpen: false, report: null })}
                className="w-8 h-8 rounded-full bg-[#3B332E] text-slate-300 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="bg-[#FAFBF5] border border-[#D9DF98] rounded-2xl p-4 text-xs text-[#61554D] flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#231E1B] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#95A823]" />
                    Penyimpanan Terkompresi Google Drive Hotel (Hemat 94% Kuota)
                  </p>
                  <p className="text-[#70635A] mt-1">
                    Semua gambar telah dikompres secara instan sebelum disimpan untuk efisiensi penyimpanan server dan cloud.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activePhotoModal.report.pictures.map((pic, idx) => (
                  <div
                    key={pic.id || idx}
                    className="border border-[#E2E7B8] rounded-2xl p-3.5 bg-[#FAFBF5] flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Thumbnail Preview */}
                      <div className="w-full h-44 rounded-xl bg-[#231E1B]/5 flex items-center justify-center overflow-hidden border border-[#D9DF98] relative group">
                        {pic.thumbnailUrl ? (
                          <img
                            src={pic.thumbnailUrl}
                            alt={pic.name || 'Bukti MOD'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-4">
                            <ImageIcon className="w-10 h-10 text-[#877465] mx-auto mb-2" />
                            <span className="text-xs text-[#70635A] font-mono">
                              File ID: {pic.driveId}
                            </span>
                          </div>
                        )}
                        <span className="absolute bottom-2 left-2 text-[10px] bg-[#231E1B]/80 text-[#EAEEBB] font-mono px-2 py-0.5 rounded backdrop-blur-xs">
                          Foto #{idx + 1}
                        </span>
                      </div>

                      <div className="mt-2.5 text-xs">
                        <p className="font-bold text-[#231E1B] truncate">
                          {pic.name || `Bukti_Foto_${idx + 1}.jpg`}
                        </p>
                        <p className="text-[11px] text-[#70635A] mt-0.5">
                          Ukuran: {formatBytes(pic.compressedSizeBytes)} (Asli: {formatBytes(pic.originalSizeBytes)})
                        </p>
                      </div>
                    </div>

                    {/* Google Drive Folder Info */}
                    <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-[#FAFBF5] border border-[#E2E7B8] flex items-center justify-between text-[10px]">
                      <span className="text-[#5B6713] truncate flex items-center gap-1 font-semibold">
                        <HardDrive className="w-3 h-3 text-[#7B8C1B] shrink-0" />
                        <span className="truncate">{pic.driveFolderName || getSystemSettings().driveFolderName}</span>
                      </span>
                    </div>

                    {/* Google Drive Link Action */}
                    <div className="mt-2.5 pt-2.5 border-t border-[#E2E7B8] flex items-center justify-between gap-1.5 flex-wrap">
                      <a
                        href={getDriveFolderUrl(pic.driveFolderId || getSystemSettings().driveFolderId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#95A823] hover:bg-[#82921D] text-white rounded-xl text-xs font-bold transition shadow-xs"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Buka Folder Drive</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      {pic.thumbnailUrl && (
                        <button
                          type="button"
                          onClick={() => handleDownloadPhoto(pic)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#FAFBF5] hover:bg-[#EAEEBB] text-[#231E1B] border border-[#D9DF98] rounded-xl text-xs font-semibold transition cursor-pointer"
                          title="Unduh file foto ini"
                        >
                          <Download className="w-3.5 h-3.5 text-[#70635A]" />
                          <span>Unduh</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-[#FAFBF5] border-t border-[#E2E7B8] flex items-center justify-end">
              <button
                onClick={() => setActivePhotoModal({ isOpen: false, report: null })}
                className="px-4 py-2 bg-[#EAEBD9] hover:bg-[#DFE1CA] text-[#231E1B] text-xs font-bold rounded-xl transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
