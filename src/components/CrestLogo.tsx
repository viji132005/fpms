import React, { useState } from 'react';

interface CrestLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: string;
  src?: string;
}

export const CrestLogo: React.FC<CrestLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  textColor = 'text-slate-900',
  src = '/assets/aistudio/mit_logo_e728531b.webp',
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeMap = {
    sm: { box: 36, text: 'text-xs', sub: 'text-[9px]' },
    md: { box: 48, text: 'text-sm font-bold', sub: 'text-[10px]' },
    lg: { box: 64, text: 'text-base font-bold', sub: 'text-xs' },
    xl: { box: 88, text: 'text-lg font-bold', sub: 'text-xs' },
  };

  const dim = sizeMap[size].box;

  return (
    <div className={`inline-flex items-center justify-center ${showText ? 'gap-3' : ''} ${className}`}>
      {/* Official Maharaja Institute of Technology, Mysore Logo Badge */}
      <div
        className="relative flex items-center justify-center rounded-full bg-white shadow-sm overflow-hidden border border-slate-200 shrink-0 select-none mx-auto"
        style={{ width: `${dim}px`, height: `${dim}px`, minWidth: `${dim}px`, minHeight: `${dim}px` }}
        title="Maharaja Institute of Technology, Mysore"
      >
        {!imgError ? (
          <img
            src={src}
            alt="Maharaja Institute of Technology, Mysore Seal"
            className="w-full h-full object-cover object-center"
            onError={() => setImgError(true)}
            loading="eager"
          />
        ) : (
          <div className="w-full h-full bg-[#0B1B3D] text-[#D4AF37] font-bold text-xs flex items-center justify-center text-center p-1">
            MITM
          </div>
        )}
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`tracking-tight ${textColor} ${sizeMap[size].text}`}>
            <span className="hidden sm:inline">Maharaja Institute of Technology, Mysore</span>
            <span className="sm:hidden">MIT Mysore</span>
          </span>
          <span className={`text-slate-500 font-medium ${sizeMap[size].sub} hidden sm:block`}>
            Faculty Portfolio Management System (FPMS)
          </span>
        </div>
      )}
    </div>
  );
};

