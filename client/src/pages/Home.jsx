import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, ArrowRight, ShieldCheck, RefreshCw, Sparkles } from 'lucide-react';

export const Home = () => {
  const { user } = useAuth();

  return (
    <div className="bg-white">
      {/* Hero section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-32 bg-gradient-to-b from-blue-50/50 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Verified Campus Marketplace
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-gray-900 max-w-4xl mx-auto leading-tight">
            Exchange, buy, and share academic books with students on campus.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Sell textbooks for cash, swap courses materials with peers, or give away finished books to juniors.
            Transparent, local, and student-first.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition"
              >
                Go to Student Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition"
                >
                  Join CampusBooks
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-white hover:bg-gray-50 text-gray-800 font-medium border border-gray-300 shadow-sm transition"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features preview */}
      <section className="py-16 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-fit mb-4">
                <BookOpen className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Sell Textbooks</h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Set fair rupee prices for your semester books and get directly connected with junior students on campus.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit mb-4">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Swap & Share</h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Trade matching syllabus books directly or give away notes and reference guides completely free.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl w-fit mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Safe Campus Handover</h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Coordinate meetups at designated campus safety points with two-party verification.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
