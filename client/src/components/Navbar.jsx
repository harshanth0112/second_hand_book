import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, LogOut, User as UserIcon, Settings } from 'lucide-react';
import { EmailVerificationBanner } from './EmailVerificationBanner';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition">
            <BookOpen className="w-6 h-6" />
            <span className="font-bold text-xl tracking-tight text-gray-900">CampusBooks</span>
          </Link>

          <nav className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3 sm:gap-4">
                <Link
                  to="/sell"
                  className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-lg shadow-sm transition"
                >
                  Sell a Book
                </Link>

                <Link
                  to="/my-listings"
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition"
                >
                  My Listings
                </Link>

                <Link
                  to="/dashboard"
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-blue-600 transition"
                  title="Dashboard"
                >
                  <UserIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">{user.name}</span>
                </Link>

                <Link
                  to="/profile"
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-blue-600 transition px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-blue-200"
                  title="Profile Settings"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden md:inline">Profile</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-red-600 transition px-3 py-1.5 rounded-lg border border-gray-200 hover:border-red-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 px-3 py-1.5 transition"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow-sm transition"
                >
                  Sign up
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>
      <EmailVerificationBanner />
    </>
  );
};
