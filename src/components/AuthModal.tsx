import React from 'react';
import { 
  X, 
  User, 
  ShieldCheck, 
  LogOut, 
  Building2, 
  Mail, 
  Phone,
  Clock,
  Lock,
  CheckCircle2
} from 'lucide-react';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onLogout?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1614]/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col border border-[#E2E7B8] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#3D352F] flex items-center justify-between bg-[#231E1B] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#95A823] flex items-center justify-center text-white shadow-md shadow-[#95A823]/30">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Profil Petugas Aktif
              </h3>
              <p className="text-xs text-[#C6CC81]">
                Identitas kredensial sistem MOD LOGAR
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#362E2A] text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Active User Main Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#231E1B] to-[#362E2A] text-white flex items-center gap-3.5 shadow-sm border border-[#4A3F38]">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-[#95A823] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-white truncate">
                  {currentUser.name}
                </h4>
                <span className="text-[10px] font-bold bg-[#95A823]/30 text-[#EAEEBB] px-2 py-0.5 rounded-full border border-[#95A823]/50 shrink-0">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs text-[#C6CC81] font-mono mt-0.5 truncate">
                @{currentUser.username || currentUser.email.split('@')[0]}
              </p>
              <p className="text-[11px] text-[#EAEEBB] mt-0.5 truncate flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-[#C6CC81]" />
                Departemen: {currentUser.department}
              </p>
            </div>
          </div>

          {/* User Details Grid */}
          <div className="bg-[#FAFBF5] border border-[#E2E7B8] rounded-2xl p-4 space-y-2.5 text-xs text-[#231E1B]">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0F2E2]">
              <span className="text-[#877465] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#95A823]" /> Email Terdaftar:
              </span>
              <span className="font-semibold text-[#231E1B]">{currentUser.email}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-[#F0F2E2]">
              <span className="text-[#877465] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#95A823]" /> Nomor Kontak:
              </span>
              <span className="font-mono font-medium">{currentUser.phone || '-'}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-[#F0F2E2]">
              <span className="text-[#877465] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#95A823]" /> Status Akun:
              </span>
              <span className="px-2 py-0.5 bg-[#EAEEBB] text-[#5B6713] rounded-full text-[10px] font-bold border border-[#C6CC81]">
                Aktif (Active)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#877465] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#95A823]" /> Sesi Login:
              </span>
              <span className="text-[#5B6713] font-semibold">{currentUser.lastActive || 'Sedang aktif'}</span>
            </div>
          </div>

          {/* Security Policy Notice */}
          <div className="p-3.5 rounded-2xl bg-[#F8F9F3] border border-[#E2E7B8] text-xs text-[#70635A] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#231E1B]">
              <Lock className="w-3.5 h-3.5 text-[#95A823]" />
              <span>Kebijakan Keamanan Akun LOGAR</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#877465]">
              Untuk menjaga integritas laporan MOD, fitur tukar akun langsung dinonaktifkan. Pengguna lain wajib masuk dengan username dan password mereka masing-masing.
            </p>
          </div>
        </div>

        {/* Footer with Logout / Switch Account via Credentials */}
        <div className="px-6 py-3.5 bg-[#F8F9F3] border-t border-[#E2E7B8] flex items-center justify-between text-xs">
          {onLogout && (
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FBEBE7] text-[#C25941] border border-[#F2D7D0] font-bold transition cursor-pointer shadow-xs"
              title="Keluar dari sesi untuk login dengan akun lain"
            >
              <LogOut className="w-3.5 h-3.5 text-[#C25941]" />
              <span>Keluar Sesi &amp; Ganti Akun</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#EAEBD9] hover:bg-[#DFE1CA] text-[#231E1B] font-bold rounded-xl transition cursor-pointer ml-auto"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
