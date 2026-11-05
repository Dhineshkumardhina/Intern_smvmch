import React, { useState } from 'react';
import { X, Mail, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { authService } from '../core/auth/authService';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const res = await authService.resetPassword(email);
      if (res.success) {
        setSuccessMessage(res.message);
        setSubmitted(true);
      } else {
        setError(res.message || 'Failed to send reset link.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with Supabase Auth.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E3E1EA] animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-[#E3E1EA]">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-[#24389C] text-white flex items-center justify-center font-bold">
              <Mail className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base text-[#1A1B22]">Reset Password</h3>
          </div>
          <button
            onClick={() => { setSubmitted(false); setError(null); onClose(); }}
            className="p-1 rounded-lg text-[#757684] hover:bg-[#EFEDF6]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
            <p className="text-[#57657A] leading-relaxed">
              Enter your registered Supabase email address. A password recovery link will be dispatched to your inbox.
            </p>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-[#1A1B22] mb-1.5">Registered Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#757684] absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@college.edu"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C] text-xs bg-[#FBF8FF]"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#57657A] hover:bg-[#EFEDF6]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#24389C] text-white hover:bg-[#1E2E80] disabled:opacity-60"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 mt-4 text-xs">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Supabase Password Reset Link Sent</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                {successMessage || `A reset email has been dispatched via Supabase Auth.`}
              </p>
              <div className="pt-2 border-t border-emerald-200/60 font-mono text-[11px]">
                Target: {email}
              </div>
            </div>

            <button
              onClick={() => { setSubmitted(false); onClose(); }}
              className="w-full py-2.5 rounded-xl bg-[#24389C] text-white font-semibold text-xs hover:bg-[#1E2E80]"
            >
              Return to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
