import React from 'react';
import { ShieldAlert, ArrowLeft, LogOut, Lock, Home } from 'lucide-react';
import { AuthUser } from '../core/auth/authUser';
import { AppLogo } from './AppLogo';

interface AccessDeniedPageProps {
  currentUser: AuthUser | null;
  attemptedRoute?: string;
  onReturnToDashboard: () => void;
  onLogout: () => void;
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({
  currentUser,
  attemptedRoute,
  onReturnToDashboard,
  onLogout,
}) => {
  const roleName = currentUser?.role ? currentUser.role.toUpperCase() : 'UNAUTHENTICATED';

  return (
    <div className="min-h-screen bg-[#FBF8FF] flex flex-col justify-center items-center px-4 py-8 selection:bg-[#DEE0FF]">
      <div className="max-w-md w-full text-center">
        
        {/* Institutional Branding */}
        <div className="mb-6 flex justify-center">
          <AppLogo size="lg" showText={true} />
        </div>

        {/* Access Denied Card */}
        <div className="bg-white rounded-3xl p-8 border border-[#E3E1EA] shadow-xl relative overflow-hidden">
          {/* Top Decorative Banner */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600" />

          {/* Icon Badge */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-[#1A1B22] mb-1">
            Access Denied
          </h2>
          <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-4">
            403 - Forbidden
          </p>

          <p className="text-xs text-[#57657A] leading-relaxed mb-6">
            You do not have the required institutional role authorization to access this workspace or resource.
          </p>

          {/* Identity & Scope Info */}
          <div className="bg-[#F8F7FC] rounded-2xl p-3.5 border border-[#E3E1EA] text-left mb-6 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[#757684]">Logged In As:</span>
              <span className="font-semibold text-[#1A1B22] truncate max-w-[180px]">
                {currentUser?.name || 'Unknown User'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#757684]">Assigned Role:</span>
              <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-[#DEE0FF] text-[#00105C]">
                {roleName}
              </span>
            </div>
            {attemptedRoute && (
              <div className="flex justify-between items-center pt-1 border-t border-[#E3E1EA]">
                <span className="text-[#757684]">Requested Path:</span>
                <span className="font-mono text-[11px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                  {attemptedRoute}
                </span>
              </div>
            )}
          </div>

          {/* Navigation Action Buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={onReturnToDashboard}
              className="w-full py-2.5 px-4 rounded-xl bg-[#24389C] hover:bg-[#1E2E80] text-white font-semibold text-xs transition-all flex items-center justify-center space-x-2 shadow-xs"
            >
              <Home className="w-4 h-4" />
              <span>Return to My Authorized Dashboard</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="w-full py-2.5 px-4 rounded-xl border border-[#E3E1EA] text-[#57657A] hover:text-rose-600 hover:bg-rose-50 font-semibold text-xs transition-all flex items-center justify-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout & Switch Account</span>
            </button>
          </div>
        </div>

        {/* Footer Support Notice */}
        <p className="text-[11px] text-[#757684] mt-6">
          If you believe this role assignment is in error, please contact your Head of Department (HOD) or SMVEC Institutional Administration.
        </p>
      </div>
    </div>
  );
};

