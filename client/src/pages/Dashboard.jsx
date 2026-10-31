import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, School, BookCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Student Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome back, <span className="font-semibold text-gray-800">{user?.name}</span>. Manage your campus book exchanges and profile.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm md:col-span-1">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{user?.name}</h2>
              <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                {user?.role}
              </span>
            </div>
          </div>

          <div className="space-y-4 border-t border-gray-100 pt-5 text-sm">
            <div className="flex items-center gap-3 text-gray-600">
              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="truncate">{user?.email}</span>
            </div>

            <div className="flex items-center gap-3 text-gray-600">
              <School className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{user?.college || 'College not specified'}</span>
            </div>

            {user?.department && (
              <div className="flex items-center gap-3 text-gray-600">
                <BookCheck className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{user?.department}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              {user?.isVerified ? (
                <div className="flex items-center gap-2 text-emerald-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Email Verified</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600 font-medium">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Unverified (Step 2 Verification)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick status preview */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm md:col-span-2">
          <h2 className="text-base font-bold text-gray-900 mb-4">Step 1 Foundation Overview</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Authentication Protocol</p>
                <p className="text-xs text-gray-500 mt-0.5">Secure JWT in httpOnly lax cookie</p>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                Active
              </span>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Protected Routes & Session Persistence</p>
                <p className="text-xs text-gray-500 mt-0.5">Client AuthContext checks /api/auth/me on mount</p>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                Active
              </span>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Next Step Readiness</p>
                <p className="text-xs text-gray-500 mt-0.5">Step 2: Email verification, password reset, Google login</p>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                Ready
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
