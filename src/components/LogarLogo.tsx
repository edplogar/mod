import React, { useState, useEffect } from 'react';
import { HotelBrandingConfig, LogoShape } from '../types';
import { getHotelBranding } from '../services/systemSettingsService';
import { Edit2, Sparkles, Building2, Shield, Leaf } from 'lucide-react';

interface LogarLogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'badge' | 'header';
  light?: boolean;
  branding?: HotelBrandingConfig;
  onEdit?: () => void;
  showEditButton?: boolean;
}

/**
 * Official Lombok Garden Hotel 5-Petal Flower Emblem
 * Vectorized from official Lombok Garden branding emblem (40.png)
 */
export const HotelFlowerIcon: React.FC<{ className?: string; color?: string; centerColor?: string }> = ({
  className = 'w-6 h-6',
  color = '#FFFFFF',
  centerColor = '#FFFFFF',
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Lombok Garden Hotel Flower Logo"
    >
      {/* 5-Petal Flower Silhouette */}
      <path
        d="M50 44
           C46 36 34 22 23 23
           C15 24 13 32 17 39
           C20 44 26 47 33 49
           C25 50 14 51 9 58
           C5 63 7 70 14 74
           C21 78 30 76 38 70
           C37 77 37 84 41 89
           C45 94 54 94 59 89
           C63 85 64 79 64 72
           C71 77 80 80 87 75
           C94 70 95 62 90 56
           C85 50 76 49 68 49
           C75 46 83 40 85 33
           C87 25 80 18 72 19
           C62 20 54 33 50 44 Z"
        fill={color}
      />
      {/* Refined Petal Layers & Ruffles for high fidelity match */}
      <path
        d="M48.5 42
           C44.2 32.8 32.5 17.5 21.2 19.8
           C12.8 21.5 10.5 30.8 15.2 38.5
           C18.8 44.5 26.2 47.8 34.5 49.2
           C25.2 49.8 12.8 51.2 7.8 59.5
           C3.8 66.2 7.2 74.5 15.5 77.8
           C23.2 80.8 32.5 77.2 39.8 70.5
           C38.2 78.5 38.8 86.8 43.8 91.5
           C48.5 95.8 57.5 94.5 62.2 88.5
           C65.8 83.8 65.5 76.5 64.8 69.2
           C72.5 75.2 82.8 77.8 89.8 72.2
           C96.5 66.8 96.8 57.5 90.8 50.8
           C85.2 44.5 75.8 44.8 67.2 46.5
           C74.5 42.2 83.8 35.5 84.8 27.2
           C85.8 18.5 77.8 12.5 68.8 14.5
           C58.5 16.8 52.2 31.5 48.5 42 Z"
        fill={color}
      />

      {/* Center Stamen & Pistil Core Details matching 40.png */}
      <circle cx="50" cy="51.5" r="5.5" fill="#231E1B" />
      <circle cx="50" cy="51.5" r="4" fill={centerColor === '#FFFFFF' ? '#EAEEBB' : '#95A823'} />

      {/* Radiating Flower Stamen / Anther Filaments */}
      <g stroke="#231E1B" strokeWidth="1.5" strokeLinecap="round">
        <path d="M46 47.5 L39 40" />
        <circle cx="38" cy="39" r="1.2" fill="#231E1B" />

        <path d="M48 45.5 L45 35" />
        <circle cx="44.5" cy="34" r="1.2" fill="#231E1B" />

        <path d="M52 46 L57 37" />
        <circle cx="58" cy="36" r="1.2" fill="#231E1B" />

        <path d="M54 48 L63 43" />
        <circle cx="64" cy="42" r="1.2" fill="#231E1B" />

        <path d="M55 52 L65 54" />
        <circle cx="66" cy="54.5" r="1.2" fill="#231E1B" />

        <path d="M53.5 55.5 L60 64" />
        <circle cx="61" cy="65" r="1.2" fill="#231E1B" />

        <path d="M50 56.5 L49 66" />
        <circle cx="49" cy="67.5" r="1.2" fill="#231E1B" />

        <path d="M46 54.5 L39 61" />
        <circle cx="38" cy="62" r="1.2" fill="#231E1B" />

        <path d="M44.5 51 L35 51.5" />
        <circle cx="34" cy="51.5" r="1.2" fill="#231E1B" />
      </g>
    </svg>
  );
};

export function getShapeClass(shape: LogoShape = 'rounded'): string {
  switch (shape) {
    case 'circle':
      return 'rounded-full';
    case 'square':
      return 'rounded-md';
    case 'rounded':
    default:
      return 'rounded-2xl';
  }
}

export const LogarLogo: React.FC<LogarLogoProps> = ({
  className = 'h-9 w-auto',
  variant = 'full',
  light = true,
  branding: propBranding,
  onEdit,
  showEditButton = false,
}) => {
  const [activeBranding, setActiveBranding] = useState<HotelBrandingConfig>(() => {
    return propBranding || getHotelBranding();
  });
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (propBranding) {
      setActiveBranding(propBranding);
      setImageError(false);
      return;
    }

    const handleSettingsUpdate = (e: any) => {
      if (e.detail?.branding) {
        setActiveBranding(e.detail.branding);
        setImageError(false);
      }
    };

    window.addEventListener('logar_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('logar_settings_updated', handleSettingsUpdate);
    };
  }, [propBranding]);

  const textColor = light ? '#FFFFFF' : '#231E1B';
  const bgColor = activeBranding.bgColor || '#95A823';
  const shapeClass = getShapeClass(activeBranding.logoShape);
  const brandTitle = activeBranding.brandTitle || 'LOMBOK GARDEN';
  const brandSubtitle = activeBranding.brandSubtitle || 'HOTEL • REPORT LOGAR';
  const badgeText = activeBranding.badgeText || 'MOD';
  const hasCustomImage = Boolean(activeBranding.logoUrl && !imageError);

  // Render Inner Icon/Image content
  const renderIconContent = () => {
    if (hasCustomImage && activeBranding.logoUrl) {
      return (
        <img
          src={activeBranding.logoUrl}
          alt={brandTitle}
          className="w-full h-full object-contain filter drop-shadow-xs"
          onError={() => setImageError(true)}
        />
      );
    }

    if (activeBranding.customIconType === 'building') {
      return <Building2 className="w-full h-full text-white p-1" />;
    }
    if (activeBranding.customIconType === 'shield') {
      return <Shield className="w-full h-full text-white p-1" />;
    }
    if (activeBranding.customIconType === 'leaf') {
      return <Leaf className="w-full h-full text-white p-1" />;
    }

    return <HotelFlowerIcon className="w-full h-full" color="#FFFFFF" centerColor="#EAEEBB" />;
  };

  if (variant === 'icon') {
    return (
      <div className="relative group inline-block">
        <div
          className={`relative flex items-center justify-center p-1.5 shadow-md transition-all duration-300 ${shapeClass} ${className}`}
          style={{ backgroundColor: bgColor }}
        >
          {renderIconContent()}
        </div>

        {showEditButton && onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#231E1B] text-[#EAEEBB] hover:bg-[#95A823] hover:text-white border border-[#EAEEBB]/50 flex items-center justify-center shadow-lg transition-transform hover:scale-110 opacity-0 group-hover:opacity-100 z-10"
            title="Ganti Logo & Ikon"
            aria-label="Ganti Logo"
          >
            <Edit2 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#231E1B] border border-[#3D352F] text-white shadow-md relative group ${className}`}>
        <div
          className={`w-6 h-6 flex items-center justify-center p-0.5 shrink-0 ${shapeClass}`}
          style={{ backgroundColor: bgColor }}
        >
          {renderIconContent()}
        </div>
        <div className="leading-tight">
          <span className="font-extrabold text-xs tracking-wider uppercase">{brandTitle}</span>
          <span className="block text-[9px] text-[#C6CC81] font-bold">{brandSubtitle}</span>
        </div>

        {showEditButton && onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="w-4 h-4 rounded-full bg-[#3D352F] hover:bg-[#95A823] text-[#EAEEBB] hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ml-1"
            title="Ganti Logo"
          >
            <Edit2 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 relative group ${className}`}>
      {/* Emblem Icon / Custom Logo Container */}
      <div className="relative">
        <div
          className={`w-10 h-10 flex items-center justify-center p-1.5 shadow-md transition-all duration-300 shrink-0 border border-white/20 ${shapeClass}`}
          style={{ backgroundColor: bgColor }}
        >
          {renderIconContent()}
        </div>

        {showEditButton && onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#231E1B] text-[#EAEEBB] hover:bg-[#95A823] hover:text-white border border-[#EAEEBB]/60 flex items-center justify-center shadow-lg transition-transform hover:scale-110 opacity-0 group-hover:opacity-100 z-10"
            title="Ganti Logo & Ikon Hotel"
            aria-label="Ganti Logo"
          >
            <Edit2 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* Typography */}
      <div className="leading-tight">
        <div className="flex items-center gap-1.5">
          <span 
            className="font-extrabold text-base tracking-wider uppercase font-sans truncate max-w-[180px] sm:max-w-[240px]"
            style={{ color: textColor }}
          >
            {brandTitle}
          </span>
          <span 
            className="text-[10px] font-black px-1.5 py-0.5 rounded tracking-wide uppercase shadow-2xs shrink-0"
            style={{ backgroundColor: bgColor, color: '#FFFFFF' }}
          >
            {badgeText}
          </span>
        </div>
        <p className="text-[10px] tracking-widest uppercase font-semibold text-[#C6CC81] truncate max-w-[200px] sm:max-w-[260px]">
          {brandSubtitle}
        </p>
      </div>
    </div>
  );
};
