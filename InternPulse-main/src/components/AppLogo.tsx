import React, { useState, useEffect } from 'react';

export const LOGO_STORAGE_KEY = 'internpulse_custom_logo_url';

export interface AppLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
  subText?: string;
  className?: string;
  onClick?: () => void;
  clickable?: boolean;
  layout?: 'horizontal' | 'vertical';
}

export const InternPulseMark: React.FC<{ className?: string; sizePx?: number }> = ({ 
  className = 'w-full h-full',
  sizePx 
}) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 400 400" 
      width={sizePx || '100%'} 
      height={sizePx || '100%'} 
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient id="internPulseBrandGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0A2558" />
          <stop offset="35%" stopColor="#0E4884" />
          <stop offset="70%" stopColor="#009BA9" />
          <stop offset="100%" stopColor="#00C4B8" />
        </linearGradient>
      </defs>

      {/* Outer rounded squircle boundary */}
      <path 
        d="M 52 230 
           A 64 64 0 0 0 116 348 
           L 284 348 
           A 64 64 0 0 0 348 284 
           L 348 116 
           A 64 64 0 0 0 284 52 
           L 116 52 
           A 64 64 0 0 0 52 116 
           L 52 205" 
        stroke="url(#internPulseBrandGrad)" 
        strokeWidth="28" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />

      {/* Pulse waveform shooting up into dynamic arrow */}
      <path 
        d="M 52 228 
           L 108 228 
           L 152 165 
           L 198 282 
           L 282 134" 
        stroke="url(#internPulseBrandGrad)" 
        strokeWidth="28" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />

      {/* Arrowhead */}
      <path 
        d="M 230 134 
           L 284 132 
           L 286 186" 
        stroke="url(#internPulseBrandGrad)" 
        strokeWidth="28" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  showText = false,
  showTagline = false,
  subText = 'Sri Manakula Vinayagar Engineering College',
  className = '',
  onClick,
  clickable = false,
  layout = 'horizontal',
}) => {
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(() => {
    return localStorage.getItem(LOGO_STORAGE_KEY) || null;
  });
  const [imgError, setImgError] = useState(false);

  // Listen to storage events so custom logo updates synchronize across tabs & components
  useEffect(() => {
    const handleStorage = () => {
      const url = localStorage.getItem(LOGO_STORAGE_KEY) || null;
      setCustomLogoUrl(url);
      setImgError(false);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('internpulse_logo_changed', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('internpulse_logo_changed', handleStorage);
    };
  }, []);

  const sizeClasses = {
    xs: {
      box: 'w-7 h-7',
      title: 'text-sm',
      sub: 'text-[9px]',
      tagline: 'text-[9px]',
    },
    sm: {
      box: 'w-8 h-8',
      title: 'text-base',
      sub: 'text-[10px]',
      tagline: 'text-[10px]',
    },
    md: {
      box: 'w-10 h-10',
      title: 'text-lg',
      sub: 'text-xs',
      tagline: 'text-xs',
    },
    lg: {
      box: 'w-14 h-14',
      title: 'text-2xl',
      sub: 'text-xs',
      tagline: 'text-xs',
    },
    xl: {
      box: 'w-20 h-20',
      title: 'text-3xl',
      sub: 'text-xs',
      tagline: 'text-xs',
    },
  }[size];

  const isVertical = layout === 'vertical';

  return (
    <div
      onClick={onClick}
      className={`inline-flex ${isVertical ? 'flex-col items-center text-center space-y-3' : 'items-center space-x-3 text-left'} ${
        clickable ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''
      } ${className}`}
    >
      {/* Logo Mark Container */}
      <div
        className={`${sizeClasses.box} flex items-center justify-center shrink-0 relative`}
      >
        {customLogoUrl && !imgError ? (
          <img
            src={customLogoUrl}
            alt="InternPulse Logo"
            className="w-full h-full object-contain p-0.5"
            onError={() => setImgError(true)}
          />
        ) : (
          <InternPulseMark className="w-full h-full" />
        )}
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className={isVertical ? 'text-center' : 'text-left'}>
          <div className="flex items-center space-x-2">
            <span className={`font-extrabold ${sizeClasses.title} tracking-tight leading-none`}>
              <span className="text-[#0C2340]">Intern</span>
              <span className="text-[#00C4B8]">Pulse</span>
            </span>
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-[#E0F7F6] text-[#00695C] leading-none">
              SMVEC
            </span>
          </div>

          {showTagline ? (
            <p className={`${sizeClasses.tagline} text-[#57657A] font-medium mt-1 leading-none tracking-tight`}>
              Stay Connected. Track Progress. Grow Together.
            </p>
          ) : subText ? (
            <p className={`${sizeClasses.sub} text-[#57657A] font-medium mt-1 leading-none`}>
              {subText}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
};
