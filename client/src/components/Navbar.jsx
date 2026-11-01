import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  BookOpen,
  LogOut,
  User as UserIcon,
  Settings,
  MessageSquare,
  Heart,
  ShieldAlert,
  Menu,
  X,
  Bell,
} from 'lucide-react';
import { EmailVerificationBanner } from './EmailVerificationBanner';
import { NotificationBell } from './NotificationBell';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { unreadTotal } = useSocket() || {};
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleLogout = async () => {
    await logout();
    closeMobileMenu();
    navigate('/login');
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <Link
              to="/"
              onClick={closeMobileMenu}
              className="flex min-w-0 items-center gap-2 text-blue-600 hover:text-blue-700 transition"
            >
              <BookOpen className="w-6 h-6 shrink-0" />
              <span className="font-bold text-xl tracking-tight text-gray-900">CampusBooks</span>
            </Link>

            <div className="hidden xl:block">
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
                    to="/requests"
                    className="text-sm font-medium text-gray-700 hover:text-blue-600 transition"
                  >
                    Requests
                  </Link>

                  <Link
                    to="/wishlist"
                    className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-red-500 transition"
                    title="My Wishlist"
                  >
                    <Heart className="w-4 h-4" />
                    <span className="hidden sm:inline">Wishlist</span>
                  </Link>

                  <Link
                    to="/wanted"
                    className="text-sm font-medium text-gray-700 hover:text-blue-600 transition"
                  >
                    Wanted
                  </Link>

                  <Link
                    to="/chat"
                    className="relative flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-blue-600 transition"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">Chat</span>
                    {unreadTotal > 0 && (
                      <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                        {unreadTotal > 9 ? '9+' : unreadTotal}
                      </span>
                    )}
                  </Link>

                  <NotificationBell />

                  <Link
                    to="/dashboard"
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-blue-600 transition"
                    title="Dashboard"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">{user.name}</span>
                  </Link>

                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 transition px-2.5 py-1.5 rounded-lg border border-red-200"
                      title="Admin Console"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Admin</span>
                    </Link>
                  )}

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

            <div className="flex items-center gap-2 xl:hidden">
              {user && !mobileMenuOpen && <NotificationBell />}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition hover:bg-gray-50 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 xl:hidden"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            hidden={!mobileMenuOpen}
            className="border-t border-gray-100 py-3 xl:hidden"
          >
              {user ? (
                <div className="flex flex-col gap-1">
                  <Link
                    to="/sell"
                    onClick={closeMobileMenu}
                    className="rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Sell a Book
                  </Link>
                  <Link
                    to="/my-listings"
                    onClick={closeMobileMenu}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    My Listings
                  </Link>
                  <Link
                    to="/requests"
                    onClick={closeMobileMenu}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Requests
                  </Link>
                  <Link
                    to="/wishlist"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Heart className="h-4 w-4" />
                    Wishlist
                  </Link>
                  <Link
                    to="/wanted"
                    onClick={closeMobileMenu}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Wanted
                  </Link>
                  <Link
                    to="/chat"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Chat
                    {unreadTotal > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                        {unreadTotal > 9 ? '9+' : unreadTotal}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/notifications"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Bell className="h-4 w-4" />
                    Notifications
                  </Link>
                  <Link
                    to="/dashboard"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <UserIcon className="h-4 w-4" />
                    Dashboard
                  </Link>
                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={closeMobileMenu}
                      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      Admin Console
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Settings className="h-4 w-4" />
                    Profile Settings
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg border-t border-gray-100 px-3 py-3 text-left text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    to="/login"
                    onClick={closeMobileMenu}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    onClick={closeMobileMenu}
                    className="rounded-lg bg-blue-600 px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-700"
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
