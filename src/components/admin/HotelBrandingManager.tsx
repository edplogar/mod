import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  Upload, 
  RotateCcw, 
  Save, 
  Palette, 
  Image as ImageIcon, 
  Building2, 
  Check, 
  Info, 
  FileText, 
  Eye, 
  Layers,
  Trash2,
  CheckCircle2,
  Maximize2
} from 'lucide-react';
import type { SystemSettings, HotelIconShape } from '../../types/index.ts';
import { updateSystemSettings } from '../../services/systemSettingsService';
import { compressImage, formatBytes } from '../../services/imageCompressionService';
import { LogarLogo, getShapeClasses } from '../LogarLogo';

interface HotelBrandingManagerProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  onShowToast: (msg: string) => void;
}

const SHAPE_OPTIONS: { id: HotelIconShape; name: string; desc: string }[] = [
  { id: 'rounded-xl', name: 'Rounded Square', desc: 'Sudut membulat standar proporsional' },
  { id: 'rounded-full', name: 'Lingkaran Penuh', desc: 'Bulat penuh modern & simetris' },
  { id: 'rounded-2xl', name: 'Modern Squircle', desc: 'Lengkungan lembut kontemporer' },
  { id: 'rounded-leaf', name: 'Daun Tropis Garden', desc: 'Bentuk daun selaras tema Lombok Garden' },
  { id: 'rounded-shield', name: 'Perisai / Tameng', desc: 'Bentuk emblem perisai hotel bergengsi' },
  { id: 'rounded-none', name: 'Kotak Klasik', desc: 'Persegi tegas tanpa lengkungan' },
];

const PRESET_COLORS: { hex: string; name: string; border: string; isTransparent?: boolean }[] = [
  { hex: 'transparent', name: 'Transparan (Tanpa Latar)', border: '#877465', isTransparent: true },
  { hex: '#95A823', name: 'Hijau Olive Logar (Resmi)', border: '#7B8C1B' },
  { hex: '#231E1B', name: 'Dark Earth Timber', border: '#3D352F' },
  { hex: '#2D5A27', name: 'Tropical Forest Green', border: '#23491E' },
  { hex: '#1F6F54', name: 'Emerald Palm Teal', border: '#175641' },
  { hex: '#D48227', name: 'Warm Amber Golden', border: '#B86F1E' },
  { hex: '#6A1B29', name: 'Burgundy Royal Elegance', border: '#53141F' },
  { hex: '#1A1614', name: 'Obsidian Black', border: '#2B2421' },
  { hex: '#FFFFFF', name: 'Pure White Clean', border: '#E2E7B8' },
];

export const HotelBrandingManager: React.FC<HotelBrandingManagerProps> = ({
  settings,
  onUpdateSettings,
  onShowToast,
}) => {
  const [hotelName, setHotelName] = useState(settings.hotelName || 'Hotel Lombok Garden');
  const [hotelTagline, setHotelTagline] = useState(settings.hotelTagline || 'Experience the Green of the City');
  const [hotelAddress, setHotelAddress] = useState(settings.hotelAddress || 'Jl. Bung Karno No. 7, Mataram, Nusa Tenggara Barat 83127');
  const [hotelPhone, setHotelPhone] = useState(settings.hotelPhone || '(0370) 636015 / +62 811-390-001');
  const [hotelEmail, setHotelEmail] = useState(settings.hotelEmail || 'hotellombokgarden@gmail.com');
  const [hotelWebsite, setHotelWebsite] = useState(settings.hotelWebsite || 'www.lombokgardenhotel.com');
  
  const [customLogoUrl, setCustomLogoUrl] = useState(settings.customLogoUrl || '');
  const [customIconUrl, setCustomIconUrl] = useState(settings.customIconUrl || '');
  const [iconShape, setIconShape] = useState<HotelIconShape>(settings.iconShape || 'rounded-xl');
  const [iconBgColor, setIconBgColor] = useState(settings.iconBgColor || '#95A823');
  const [showLogoText, setShowLogoText] = useState(settings.showLogoText !== false);

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  // Handle Logo Upload from device
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar yang valid (PNG, JPG, SVG, WEBP).');
      return;
    }

    setIsUploadingLogo(true);
    try {
      // Compress with high quality
      const compressed = await compressImage(file, 800, 300, 0.9);
      setCustomLogoUrl(compressed.dataUrl);
      setIsDirty(true);
      onShowToast(`Logo lengkap berhasil dimuat dari perangkat (${formatBytes(compressed.compressedSizeBytes)})!`);
    } catch (err: any) {
      console.error(err);
      alert('Gagal memproses gambar logo: ' + (err.message || 'Error'));
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  // Handle Icon Upload from device
  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar yang valid (PNG, JPG, SVG, WEBP).');
      return;
    }

    setIsUploadingIcon(true);
    try {
      const compressed = await compressImage(file, 400, 400, 0.9);
      setCustomIconUrl(compressed.dataUrl);
      setIsDirty(true);
      onShowToast(`Ikon emblem berhasil dimuat dari perangkat (${formatBytes(compressed.compressedSizeBytes)})!`);
    } catch (err: any) {
      console.error(err);
      alert('Gagal memproses gambar ikon: ' + (err.message || 'Error'));
    } finally {
      setIsUploadingIcon(false);
      if (iconInputRef.current) iconInputRef.current.value = '';
    }
  };

  const handleClearLogo = () => {
    setCustomLogoUrl('');
    setIsDirty(true);
    onShowToast('Logo direset ke emblem default Hotel Lombok Garden.');
  };

  const handleClearIcon = () => {
    setCustomIconUrl('');
    setIsDirty(true);
    onShowToast('Ikon direset ke emblem lotus default.');
  };

  const handleResetDefaultBranding = () => {
    if (window.confirm('Kembalikan seluruh identitas branding & warna logo ke pengaturan standar resmi Hotel Lombok Garden?')) {
      setHotelName('Hotel Lombok Garden');
      setHotelTagline('Experience the Green of the City');
      setHotelAddress('Jl. Bung Karno No. 7, Mataram, Nusa Tenggara Barat 83127');
      setHotelPhone('(0370) 636015 / +62 811-390-001');
      setHotelEmail('hotellombokgarden@gmail.com');
      setHotelWebsite('www.lombokgardenhotel.com');
      setCustomLogoUrl('');
      setCustomIconUrl('');
      setIconShape('rounded-xl');
      setIconBgColor('#95A823');
      setShowLogoText(true);
      setIsDirty(true);
      onShowToast('Pengaturan branding dikembalikan ke standar awal.');
    }
  };

  const handleSaveBranding = async () => {
    setIsSaving(true);
    try {
      const updated = updateSystemSettings({
        hotelName: hotelName.trim() || 'Hotel Lombok Garden',
        hotelTagline: hotelTagline.trim() || 'Experience the Green of the City',
        hotelAddress: hotelAddress.trim() || 'Jl. Bung Karno No. 7, Mataram',
        hotelPhone: hotelPhone.trim() || '(0370) 636015',
        hotelEmail: hotelEmail.trim() || 'hotellombokgarden@gmail.com',
        hotelWebsite: hotelWebsite.trim() || 'www.lombokgardenhotel.com',
        customLogoUrl,
        customIconUrl,
        iconShape,
        iconBgColor,
        showLogoText,
      });

      onUpdateSettings(updated);
      setIsDirty(false);
      onShowToast('Branding, Logo & Kop PDF berhasil disimpan dan disinkronkan ke seluruh sistem!');
    } catch (err: any) {
      console.error(err);
      onShowToast('Gagal menyimpan branding: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-[#FAFBF5]">
      {/* Hidden File Inputs */}
      <input
        ref={logoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handleLogoUpload}
        className="hidden"
      />
      <input
        ref={iconInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handleIconUpload}
        className="hidden"
      />

      {/* Top Banner Card */}
      <div className="bg-gradient-to-r from-[#231E1B] via-[#2E2824] to-[#362E2A] text-white rounded-3xl p-6 sm:p-8 border border-[#3D352F] shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-8 h-8 rounded-xl bg-[#95A823] flex items-center justify-center text-white shadow-md shadow-[#95A823]/30">
                <Palette className="w-4 h-4" />
              </span>
              <span className="text-xs font-black tracking-widest text-[#EAEEBB] uppercase">
                Branding &bull; Logo &bull; Kop Surat PDF &bull; Navbar
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Kustomisasi Logo, Ikon &amp; Kop Laporan
            </h2>
            <p className="text-xs sm:text-sm text-[#D9DF98] mt-1.5 leading-relaxed">
              Upload logo atau ikon hotel langsung dari perangkat Anda, sesuaikan bentuk sudut dan warna latar belakang ikon, 
              serta atur identitas kop surat resmi yang langsung diterapkan di Nav Bar dan dokumen cetak PDF.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleResetDefaultBranding}
              className="px-3.5 py-2.5 rounded-xl bg-[#28211D] hover:bg-[#3D352F] text-[#D9DF98] hover:text-white border border-[#453D37] text-xs font-bold flex items-center gap-2 transition cursor-pointer"
              title="Reset logo dan warna ke standar hotel"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Standar</span>
            </button>

            <button
              type="button"
              onClick={handleSaveBranding}
              disabled={isSaving}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg ${
                isDirty 
                  ? 'bg-[#95A823] hover:bg-[#83941F] text-white shadow-[#95A823]/30 animate-pulse' 
                  : 'bg-[#95A823] hover:bg-[#83941F] text-white shadow-[#95A823]/20'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : (isDirty ? 'Simpan & Terapkan Branding *' : 'Tersimpan & Sinkron')}</span>
            </button>
          </div>
        </div>

        {/* Ambient glow */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 rounded-full bg-[#95A823]/10 blur-3xl pointer-events-none"></div>
      </div>

      {/* Main Grid: Upload & Shape Configuration + Live Previews */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Upload Controls & Customization */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Upload Logo & Ikon */}
          <div className="bg-[#231E1B] rounded-3xl p-6 border border-[#3D352F] shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#3D352F]">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#95A823]" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  1. Unggah Berkas Logo &amp; Ikon dari Perangkat
                </h3>
              </div>
              <span className="text-[10px] text-[#A89E96]">Mendukung PNG (Transparan), JPG, SVG, WEBP</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card Upload Logo Lengkap */}
              <div className="bg-[#2A2420] border border-[#3D352F] rounded-2xl p-4 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white">Logo Lengkap (Header/Navbar)</p>
                    {customLogoUrl && (
                      <span className="text-[9px] font-bold bg-[#95A823]/20 text-[#EAEEBB] border border-[#95A823]/40 px-1.5 py-0.5 rounded">
                        Kustom Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#A89E96] mt-1">
                    Logo horizontal utama untuk bilah navigasi dan identitas aplikasi.
                  </p>
                </div>

                <div className="h-20 bg-[#1A1614] rounded-xl border border-[#3D352F] flex items-center justify-center p-2 overflow-hidden">
                  {customLogoUrl ? (
                    <img src={customLogoUrl} alt="Logo Kustom" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <LogarLogo variant="full" light={true} className="scale-90" />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#95A823] hover:bg-[#83941F] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingLogo ? 'Memproses...' : 'Pilih dari HP / Laptop'}</span>
                  </button>

                  {customLogoUrl && (
                    <button
                      type="button"
                      onClick={handleClearLogo}
                      className="p-2 rounded-xl bg-[#362E2A] hover:bg-[#C25941]/20 text-[#A89E96] hover:text-[#C25941] border border-[#453D37] transition cursor-pointer"
                      title="Gunakan Logo Bawaan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Card Upload Ikon / Emblem */}
              <div className="bg-[#2A2420] border border-[#3D352F] rounded-2xl p-4 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white">Ikon / Emblem Simbol Hotel</p>
                    {customIconUrl && (
                      <span className="text-[9px] font-bold bg-[#95A823]/20 text-[#EAEEBB] border border-[#95A823]/40 px-1.5 py-0.5 rounded">
                        Kustom Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#A89E96] mt-1">
                    Simbol emblem bujur sangkar / lingkaran untuk sidebar ringkas &amp; Kop PDF.
                  </p>
                </div>

                <div className="h-20 bg-[#1A1614] rounded-xl border border-[#3D352F] flex items-center justify-center p-2">
                  <div 
                    className={`w-12 h-12 flex items-center justify-center p-1.5 shadow-md overflow-hidden ${getShapeClasses(iconShape)}`}
                    style={{ backgroundColor: iconBgColor }}
                  >
                    {customIconUrl ? (
                      <img src={customIconUrl} alt="Ikon Kustom" className="w-full h-full object-contain" />
                    ) : (
                      <LogarLogo variant="icon" className="w-full h-full" iconBgColor={iconBgColor} iconShape={iconShape} />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => iconInputRef.current?.click()}
                    disabled={isUploadingIcon}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#95A823] hover:bg-[#83941F] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingIcon ? 'Memproses...' : 'Pilih Ikon dari Device'}</span>
                  </button>

                  {customIconUrl && (
                    <button
                      type="button"
                      onClick={handleClearIcon}
                      className="p-2 rounded-xl bg-[#362E2A] hover:bg-[#C25941]/20 text-[#A89E96] hover:text-[#C25941] border border-[#453D37] transition cursor-pointer"
                      title="Gunakan Ikon Bawaan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Bentuk Ikon (Icon Shape) */}
          <div className="bg-[#231E1B] rounded-3xl p-6 border border-[#3D352F] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#3D352F]">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#95A823]" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  2. Pengaturan Bentuk Sudut Ikon (Icon Shape)
                </h3>
              </div>
              <span className="text-[10px] text-[#A89E96]">Pilih gaya estetika wadah lambang</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SHAPE_OPTIONS.map((opt) => {
                const isSelected = iconShape === opt.id;
                const previewShapeClass = getShapeClasses(opt.id);

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setIconShape(opt.id);
                      setIsDirty(true);
                    }}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#2E2824] border-[#95A823] shadow-md shadow-[#95A823]/10 ring-1 ring-[#95A823]'
                        : 'bg-[#2A2420] border-[#3D352F] hover:border-[#4D423B]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className={`w-9 h-9 flex items-center justify-center text-white text-xs font-black shadow-sm ${previewShapeClass}`}
                        style={{ backgroundColor: iconBgColor }}
                      >
                        LG
                      </div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-[#95A823] text-white flex items-center justify-center text-[10px] font-bold">
                          ✓
                        </span>
                      )}
                    </div>

                    <div>
                      <p className={`text-xs font-bold ${isSelected ? 'text-[#EAEEBB]' : 'text-white'}`}>
                        {opt.name}
                      </p>
                      <p className="text-[10px] text-[#A89E96] leading-tight mt-0.5">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Warna Latar Ikon (Icon Background Color) */}
          <div className="bg-[#231E1B] rounded-3xl p-6 border border-[#3D352F] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#3D352F]">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#95A823]" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  3. Pengaturan Warna Latar Ikon (Background Color)
                </h3>
              </div>
              <span className="text-[10px] text-[#A89E96]">Diterapkan pada latar emblem &amp; aksen kop</span>
            </div>

            {/* Color Presets */}
            <div>
              <p className="text-[11px] font-bold text-[#D9DF98] mb-2">Palet Warna Rekomendasi Hotel:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PRESET_COLORS.map((col) => {
                  const isSelected = iconBgColor.toLowerCase() === col.hex.toLowerCase();
                  return (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => {
                        setIconBgColor(col.hex);
                        setIsDirty(true);
                      }}
                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition text-left cursor-pointer ${
                        isSelected
                          ? 'bg-[#2E2824] border-[#95A823] ring-1 ring-[#95A823]'
                          : 'bg-[#2A2420] border-[#3D352F] hover:border-[#4D423B]'
                      }`}
                    >
                      {col.isTransparent ? (
                        <span 
                          className="w-5 h-5 rounded-lg shrink-0 border shadow-xs bg-[repeating-conic-gradient(#555_0_90deg,#333_0_180deg)_0_0/8px_8px]" 
                          style={{ borderColor: col.border }}
                          title="Transparan"
                        />
                      ) : (
                        <span 
                          className="w-5 h-5 rounded-lg shrink-0 border shadow-xs" 
                          style={{ backgroundColor: col.hex, borderColor: col.border }}
                        />
                      )}
                      <div className="truncate">
                        <p className="text-[11px] font-bold text-white truncate">{col.name}</p>
                        <p className="text-[9px] font-mono text-[#A89E96]">{col.hex}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Hex Color Picker */}
            <div className="pt-3 border-t border-[#3D352F] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-white">Warna Kustom Hex:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={iconBgColor}
                    onChange={(e) => {
                      setIconBgColor(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-[#3D352F]"
                  />
                  <input
                    type="text"
                    value={iconBgColor}
                    onChange={(e) => {
                      setIconBgColor(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="#95A823"
                    className="w-24 px-2.5 py-1 rounded-lg bg-[#1A1614] border border-[#3D352F] text-xs font-mono font-bold text-white focus:outline-none focus:border-[#95A823]"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#D9DF98]">
                <input
                  type="checkbox"
                  checked={showLogoText}
                  onChange={(e) => {
                    setShowLogoText(e.target.checked);
                    setIsDirty(true);
                  }}
                  className="rounded accent-[#95A823] cursor-pointer w-4 h-4"
                />
                <span>Tampilkan Nama Hotel di Samping Logo</span>
              </label>
            </div>
          </div>

          {/* Section 4: Identitas Teks Hotel & Kontak Kop Surat */}
          <div className="bg-[#231E1B] rounded-3xl p-6 border border-[#3D352F] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#3D352F]">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#95A823]" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  4. Identitas Teks Hotel &amp; Kop Laporan
                </h3>
              </div>
              <span className="text-[10px] text-[#A89E96]">Diterapkan pada bilah atas &amp; Kop Dokumen PDF</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[#D9DF98] font-bold mb-1">Nama Properti Hotel</label>
                <input
                  type="text"
                  value={hotelName}
                  onChange={(e) => {
                    setHotelName(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full px-3 py-2 bg-[#1A1614] border border-[#3D352F] rounded-xl text-white font-semibold focus:outline-none focus:border-[#95A823]"
                />
              </div>

              <div>
                <label className="block text-[#D9DF98] font-bold mb-1">Tagline / Motto Hotel</label>
                <input
                  type="text"
                  value={hotelTagline}
                  onChange={(e) => {
                    setHotelTagline(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full px-3 py-2 bg-[#1A1614] border border-[#3D352F] rounded-xl text-white font-semibold focus:outline-none focus:border-[#95A823]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[#D9DF98] font-bold mb-1">Alamat Lengkap Hotel</label>
                <input
                  type="text"
                  value={hotelAddress}
                  onChange={(e) => {
                    setHotelAddress(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full px-3 py-2 bg-[#1A1614] border border-[#3D352F] rounded-xl text-white font-semibold focus:outline-none focus:border-[#95A823]"
                />
              </div>

              <div>
                <label className="block text-[#D9DF98] font-bold mb-1">Telepon &amp; WhatsApp</label>
                <input
                  type="text"
                  value={hotelPhone}
                  onChange={(e) => {
                    setHotelPhone(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full px-3 py-2 bg-[#1A1614] border border-[#3D352F] rounded-xl text-white font-semibold focus:outline-none focus:border-[#95A823]"
                />
              </div>

              <div>
                <label className="block text-[#D9DF98] font-bold mb-1">Email Resmi Hotel</label>
                <input
                  type="email"
                  value={hotelEmail}
                  onChange={(e) => {
                    setHotelEmail(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full px-3 py-2 bg-[#1A1614] border border-[#3D352F] rounded-xl text-white font-semibold focus:outline-none focus:border-[#95A823]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Previews */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Live Preview Card 1: Bilah Navigasi (Navbar Preview) */}
          <div className="bg-[#231E1B] rounded-3xl p-6 border border-[#3D352F] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#3D352F]">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#95A823]" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Pratinjau Nav Bar (Sidebar / Header)
                </h4>
              </div>
              <span className="text-[10px] text-[#A89E96]">Tampilan Aplikasi</span>
            </div>

            {/* Simulation of Navbar Brand Area */}
            <div className="bg-[#1A1614] p-4 rounded-2xl border border-[#3D352F] space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#877465]">Mode Terbuka (Expanded):</p>
              <div className="p-3 bg-[#231E1B] rounded-xl border border-[#3D352F] flex items-center justify-between">
                <LogarLogo
                  customLogoUrl={customLogoUrl}
                  customIconUrl={customIconUrl}
                  iconShape={iconShape}
                  iconBgColor={iconBgColor}
                  hotelName={hotelName}
                  showText={showLogoText}
                />
              </div>

              <p className="text-[10px] font-bold uppercase tracking-wider text-[#877465] pt-1">Mode Ringkas (Collapsed Icon Only):</p>
              <div className="p-3 bg-[#231E1B] rounded-xl border border-[#3D352F] flex items-center justify-center">
                <LogarLogo
                  variant="icon"
                  className="w-10 h-10"
                  customIconUrl={customIconUrl}
                  iconShape={iconShape}
                  iconBgColor={iconBgColor}
                  hotelName={hotelName}
                />
              </div>
            </div>
          </div>

          {/* Live Preview Card 2: Kop Laporan Dokumen PDF Resmi */}
          <div className="bg-[#231E1B] rounded-3xl p-6 border border-[#3D352F] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#3D352F]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#EAEEBB]" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Pratinjau Kop Laporan Cetak PDF
                </h4>
              </div>
              <span className="text-[10px] text-[#A89E96]">Format A4 Resmi</span>
            </div>

            {/* Simulation of PDF Header Paper */}
            <div className="bg-white rounded-2xl p-4 text-[#231E1B] shadow-md border border-[#E2E7B8] space-y-3">
              {/* PDF Header Band */}
              <div className="bg-[#231E1B] p-3 rounded-xl text-white relative overflow-hidden">
                <div 
                  className="absolute left-0 right-0 bottom-0 h-1" 
                  style={{ backgroundColor: iconBgColor }} 
                />
                
                <div className="flex items-center gap-3">
                  <div 
                    className={`w-10 h-10 flex items-center justify-center p-1.5 shrink-0 shadow-sm overflow-hidden ${getShapeClasses(iconShape)}`}
                    style={{ backgroundColor: iconBgColor }}
                  >
                    {customIconUrl ? (
                      <img src={customIconUrl} alt={hotelName} className="w-full h-full object-contain" />
                    ) : (
                      <LogarLogo variant="icon" className="w-full h-full" iconBgColor={iconBgColor} iconShape={iconShape} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-xs tracking-wider uppercase text-white truncate">
                      {hotelName.toUpperCase()}
                    </p>
                    <p className="text-[9px] text-[#EAEEBB] italic truncate">
                      {hotelTagline}
                    </p>
                    <p className="text-[8px] text-[#C6CC81] truncate">
                      {hotelAddress} | Telp: {hotelPhone}
                    </p>
                  </div>
                </div>
              </div>

              {/* PDF Sample Title & Grid */}
              <div className="space-y-1.5 px-1 text-[10px]">
                <p className="font-bold text-[#231E1B]">LAPORAN RESMI MANAGER ON DUTY (MOD REPORT LOGAR)</p>
                <div className="bg-[#FAFBF5] border border-[#E2E7B8] rounded-lg p-2 grid grid-cols-2 gap-1 text-[9px] text-[#61554D]">
                  <div><strong className="text-[#231E1B]">Periode:</strong> 1 Sep 2026 s/d 30 Sep 2026</div>
                  <div><strong className="text-[#231E1B]">Petugas:</strong> MOD Officer Lapangan</div>
                  <div><strong className="text-[#231E1B]">Shift:</strong> Semua Shift Operasional</div>
                  <div><strong className="text-[#231E1B]">Kondisi:</strong> 100% Terverifikasi</div>
                </div>
              </div>
            </div>

            <div className="bg-[#2A2420] p-3 rounded-xl border border-[#3D352F] text-[11px] text-[#D9DF98] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#95A823] shrink-0" />
              <span>Kop surat otomatis disematkan pada setiap lembar dokumen PDF hasil unduhan.</span>
            </div>
          </div>

          {/* Quick Info Callout */}
          <div className="bg-[#2A2420] rounded-2xl p-4 border border-[#3D352F] text-xs text-[#A89E96] space-y-2">
            <div className="flex items-center gap-2 font-bold text-white">
              <Info className="w-4 h-4 text-[#95A823]" />
              <span>Otoritas Super Admin</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Pengaturan branding ini hanya dapat diubah oleh akun Super Administrator. Perubahan yang disimpan akan otomatis tersinkronisasi ke seluruh browser dan ponsel petugas secara <em>real-time</em> via Firestore.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
