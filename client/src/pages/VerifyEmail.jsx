import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, XCircle, Loader2, BookOpen, ArrowRight } from 'lucide-react';

export const VerifyEmail = () => {
  const { token } = useParams();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    let isMounted = true;

    const verify = async () => {
      if (!token) {
        if (isMounted) {
          setErrorMessage('No verification token provided in URL');
          setLoading(false);
        }
        return;
      }

      try {
        await authApi.verifyEmail(token);
        if (isMounted) {
          setSuccess(true);
          await refreshUser();
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err.message || 'Verification token is invalid or has expired');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verify();

    return () => {
      isMounted = false;
    };
  }, [token, refreshUser]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-gray-100 text-center">
        <div className="inline-flex p-3 rounded-full bg-blue-50 text-blue-600 mb-1">
          <BookOpen className="w-8 h-8" />
        </div>

        {loading && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin motion-reduce:animate-none mx-auto" />
            <h1 className="text-xl font-bold text-gray-900">Verifying Email</h1>
            <p className="text-sm text-gray-600">Please wait while we verify your email address...</p>
          </div>
        )}

        {!loading && success && (
          <div className="space-y-4">
            <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900">Email Verified!</h1>
            <p className="text-sm text-gray-600">
              Your email address has been successfully verified. You now have full access to exchange and list campus textbooks.
            </p>
            <div className="pt-4">
              <Link
                to={user ? '/dashboard' : '/login'}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition"
              >
                <span>{user ? 'Continue to Dashboard' : 'Sign in to your account'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {!loading && !success && (
          <div className="space-y-4">
            <XCircle className="w-14 h-14 text-red-600 mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900">Verification Failed</h1>
            <p className="text-sm text-gray-600">
              {errorMessage || 'The verification link is invalid or may have expired.'}
            </p>
            <div className="pt-4 space-y-3">
              <Link
                to="/login"
                className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition"
              >
                Back to Sign in
              </Link>
              {user && !user.emailVerified && (
                <p className="text-xs text-gray-500">
                  You can request a new verification link from the banner at the top of your dashboard.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
