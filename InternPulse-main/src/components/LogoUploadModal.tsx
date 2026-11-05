import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  CheckCircle2, 
  RotateCcw, 
  Sparkles, 
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { LOGO_STORAGE_KEY, AppLogo } from './AppLogo';

interface LogoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogoUploadModal: React.FC<LogoUploadModalProps> = ({ isOpen, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(() => {
    return localStorage.getItem(LOGO_STORAGE_KEY) || null;
  });
  const [urlInput, setUrlInput] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size should be under 5MB for optimal performance.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      setPreviewUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    setPreviewUrl(urlInput.trim());
    setUrlInput('');
  };

  const handleSaveLogo = () => {
    if (previewUrl) {
      localStorage.setItem(LOGO_STORAGE_KEY, previewUrl);
      window.dispatchEvent(new Event('internpulse_logo_changed'));
      setSuccessMsg('Logo updated successfully across all dashboards and headers!');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);
    }
  };

  const handleResetToDefault = () => {
    localStorage.removeItem(LOGO_STORAGE_KEY);
    setPreviewUrl('/logo.svg');
    window.dispatchEvent(new Event('internpulse_logo_changed'));
    setSuccessMsg('Reset to default college logo!');
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E3E1EA] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E3E1EA]">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#24389C] text-white flex items-center justify-center font-bold">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1A1B22]">Customize App Icon & Logo</h3>
              <p className="text-[11px] text-[#57657A]">Upload your institutional or company logo image</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#757684] hover:bg-[#EFEDF6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Live Preview Box */}
        <div className="mt-5 p-4 bg-[#F4F2FA] rounded-2xl border border-[#E3E1EA] text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#57657A] mb-3">
            Live Preview in Header & Cards
          </p>
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl border border-[#E3E1EA] shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-white border border-[#E3E1EA] overflow-hidden flex items-center justify-center p-1">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Custom Preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src="/logo.svg"
                  alt="Default Logo"
                  className="w-full h-full object-contain"
                />
              )}
            </div>
            <div className="ml-3 text-left">
              <div className="font-bold text-sm text-[#1A1B22]">InternPulse</div>
              <div className="text-[10px] text-[#57657A]">Sri Manakula Vinayagar Engineering College</div>
            </div>
          </div>
        </div>

        {/* Upload Options */}
        <div className="mt-5 space-y-4 text-xs">
          
          {/* File Picker Drag/Click Area */}
          <div>
            <label className="block font-semibold text-[#1A1B22] mb-1.5">
              Select Image File from your Computer
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png, image/jpeg, image/svg+xml, image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 px-4 rounded-2xl border-2 border-dashed border-[#24389C]/40 hover:border-[#24389C] bg-[#FBF8FF] hover:bg-[#F4F2FA] transition-all flex flex-col items-center justify-center space-y-1.5 group text-center"
            >
              <Upload className="w-6 h-6 text-[#24389C] group-hover:scale-110 transition-transform" />
              <span className="font-bold text-xs text-[#1A1B22]">
                Click to browse & upload image
              </span>
              <span className="text-[10px] text-[#57657A]">
                Supports PNG, JPG, SVG, WebP (transparent PNG recommended)
              </span>
            </button>
          </div>

          {/* Or Paste URL */}
          <div>
            <label className="block font-semibold text-[#1A1B22] mb-1">
              Or paste an Image Web URL
            </label>
            <div className="flex space-x-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/college-logo.png"
                className="flex-1 px-3 py-2 rounded-xl border border-[#E3E1EA] text-xs bg-[#FBF8FF] focus:outline-none focus:border-[#24389C]"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="px-3 py-2 bg-[#EFEDF6] hover:bg-[#E3E1EA] text-[#1A1B22] font-semibold rounded-xl text-xs transition-colors"
              >
                Preview
              </button>
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-[11px] text-[#24389C] leading-relaxed">
            💡 <strong>Permanent Deployment Tip:</strong> You can also place an image file directly at <code className="bg-white px-1 py-0.5 rounded font-mono text-[10px]">/public/logo.png</code> or <code className="bg-white px-1 py-0.5 rounded font-mono text-[10px]">/public/logo.svg</code> in the project files.
          </div>

        </div>

        {/* Modal Actions */}
        <div className="mt-6 pt-4 border-t border-[#E3E1EA] flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center space-x-1.5 text-xs text-[#57657A] hover:text-rose-600 px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#57657A] hover:bg-[#EFEDF6]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveLogo}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#24389C] text-white hover:bg-[#1E2E80] shadow-sm flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Apply Logo</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
