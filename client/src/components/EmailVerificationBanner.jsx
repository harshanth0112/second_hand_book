import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth.api';
import { AlertTriangle, Mail, CheckCircle2, Loader2 } from 'lucide-react';

export const EmailVerificationBanner = () => {
  const { user } = useAuth();
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!user || user.emailVerified) {
    return null;
  }

  const handleResend = async () => {
    if (resending || cooldown > 0) return;
    setResending(true);
    setStatusMessage({ type: '', text: '' });

    try {
      await authApi.resendVerification();
      setStatusMessage({
        type: 'success',
        text: 'Verification link sent! Please check your inbox.',
      });
      setCooldown(60);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to send verification email. Please try again.',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      role="region"
      aria-label="Email verification notice"
      className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-amber-900"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span>
            Please verify your email address (<strong>{user.email}</strong>) to access all campus book exchange features.
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {statusMessage.text && (
            <span
              className={`text-xs flex items-center gap-1 ${
                statusMessage.type === 'success' ? 'text-green-700' : 'text-red-600'
              }`}
            >
              {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
              {statusMessage.text}
            </span>
          )}

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg font-medium text-xs transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {resending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Sending...
              </>
            ) : cooldown > 0 ? (
              `Resend in ${cooldown}s`
            ) : (
              <>
                <Mail className="w-3.5 h-3.5" />
                Resend email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

