import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { BookOpen, Mail, AlertCircle, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmed = email.trim();
    if (!trimmed) {
      setError('Email address is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.forgotPassword(trimmed.toLowerCase());
      setIsSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit password reset request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-gray-100">
        <div className="text-center">
          <div className="inline-flex p-3 rounded-full bg-blue-50 text-blue-600 mb-3">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Forgot your password?</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your college email and we will send you a link to reset your password.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {isSubmitted ? (
          <div className="space-y-4 text-center py-2">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
            <h2 className="text-lg font-semibold text-gray-900">Check your email</h2>
            <p className="text-sm text-gray-600">
              If an account exists with <strong>{email}</strong>, we have sent instructions to reset your password.
            </p>
            <p className="text-xs text-gray-500">
              The reset link will expire in 1 hour. Be sure to check your spam or junk folder if you don't see it.
            </p>
            <div className="pt-4">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-xl transition text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="student@college.edu"
                  className={`block w-full px-4 py-2.5 rounded-xl border text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition sm:text-sm ${
                    error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                  }`}
                  aria-invalid={error ? 'true' : 'false'}
                  aria-describedby={error ? 'forgot-email-error' : undefined}
                />
              </div>
              {error && (
                <p id="forgot-email-error" className="mt-1.5 text-xs text-red-600">
                  {error}
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send reset link
                  </>
                )}
              </button>
            </div>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

