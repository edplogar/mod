import React, { useState } from 'react';
import { 
  User, 
  KeyRound, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { UserProfile } from '../types';
import { authenticateUser } from '../services/authService';
import { fetchFullDatabaseSync } from '../services/liveSyncService';
import { LogarLogo } from './LogarLogo';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  onOpenSuperAdmin?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onOpenSuperAdmin }) => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      // Catch up with latest user accounts/passwords from server backend
      await fetchFullDatabaseSync();
    } catch {
      // offline fallback
    }

    const result = authenticateUser(usernameOrEmail, password);
    setIsLoading(false);

    if (result.success && result.user) {
      onLoginSuccess(result.user);
    } else {
      setErrorMessage(result.message || 'Login gagal. Periksa kembali username dan password Anda.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFBF5] text-[#231E1B] flex flex-col justify-between selection:bg-[#95A823] selection:text-white">
      {/* Top Identity Header */}
      <header className="bg-[#231E1B] border-b border-[#3D352F] text-white py-3 px-4 sm:px-8 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogarLogo variant="full" light={true} />
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-[#C6CC81]">
            <span className="w-2 h-2 rounded-full bg-[#95A823] animate-pulse"></span>
            <span className="font-serif italic text-sm text-[#D9DF98]">Experience the Green of the City</span>
          </div>
        </div>
      </header>

      {/* Main Login Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-md w-full space-y-5">
          {/* Brand Welcome Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E7B8] shadow-xl relative overflow-hidden">
            {/* Top decorative accent ribbon */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#95A823] via-[#C6CC81] to-[#FFBC7D]"></div>

            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#231E1B] border-2 border-[#95A823] flex items-center justify-center mx-auto mb-3.5 shadow-md shadow-[#95A823]/20">
                <LogarLogo variant="icon" className="w-9 h-9" />
              </div>
              <h1 className="text-2xl font-black text-[#231E1B] tracking-tight">
                MOD REPORT LOGAR
              </h1>
              <p className="text-xs text-[#70635A] mt-1 font-medium">
                Sistem Pelaporan &amp; Monitoring Lapangan Manager on Duty
              </p>
              <p className="text-[11px] text-[#95A823] font-serif italic mt-0.5 font-bold">
                Hotel Lombok Garden &bull; Mataram
              </p>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="mb-4 bg-[#FBEBE7] border border-[#F2D7D0] rounded-2xl p-3.5 text-xs text-[#C25941] flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#C25941] mt-0.5" />
                <span className="font-semibold leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-[#231E1B] mb-1.5">
                  Username atau Email Petugas <span className="text-[#C25941]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="Masukkan username atau email..."
                    required
                    autoFocus
                    className="w-full pl-10 pr-3 py-2.5 bg-[#FAFBF5] border border-[#D9DF98] rounded-xl text-xs font-semibold text-[#231E1B] placeholder-[#877465]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#95A823]/25 focus:border-[#95A823] transition"
                  />
                  <User className="w-4 h-4 text-[#877465] absolute left-3.5 top-3" />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-bold text-[#231E1B] mb-1.5">
                  Password Akun <span className="text-[#C25941]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password Anda..."
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-[#FAFBF5] border border-[#D9DF98] rounded-xl text-xs font-semibold text-[#231E1B] placeholder-[#877465]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#95A823]/25 focus:border-[#95A823] transition"
                  />
                  <KeyRound className="w-4 h-4 text-[#877465] absolute left-3.5 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-[#877465] hover:text-[#231E1B] transition cursor-pointer"
                    title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#95A823] hover:bg-[#83941F] active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-md shadow-[#95A823]/25 transition flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Sistem MOD LOGAR</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Direct Super Admin Gateway */}
            {onOpenSuperAdmin && (
              <div className="mt-5 pt-4 border-t border-[#F0F2E2] flex items-center justify-between">
                <span className="text-[11px] text-[#877465]">Akses Khusus Backend:</span>
                <button
                  type="button"
                  onClick={onOpenSuperAdmin}
                  className="text-xs font-bold text-[#8B4800] hover:text-[#5C3000] bg-[#FFBC7D]/20 hover:bg-[#FFBC7D]/35 border border-[#FFBC7D] px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <KeyRound className="w-3 h-3 text-[#8B4800]" />
                  <span>Super Admin Master Key</span>
                </button>
              </div>
            )}
          </div>

          {/* Security & Support Note */}
          <div className="bg-[#FAFBF5] border border-[#E2E7B8] rounded-2xl p-3 text-center text-xs text-[#70635A]">
            <p className="font-semibold text-[#231E1B]">
              Lombok Garden Hotel Access Security
            </p>
            <p className="text-[11px] text-[#877465] mt-0.5">
              Hanya personil terdaftar yang diizinkan mengakses data patroli dan inspeksi.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#231E1B] border-t border-[#3D352F] text-[#C6CC81] py-4 px-4 text-center text-xs">
        <p className="text-[#D9DF98]">
          &copy; {new Date().getFullYear()} Hotel Lombok Garden. Seluruh Hak Cipta Dilindungi.
        </p>
        <p className="text-[11px] text-[#877465] mt-0.5">
          Jl. Bung Karno No. 7, Mataram, Lombok - NTB &bull; Telp: 0370 636015
        </p>
      </footer>
    </div>
  );
};
