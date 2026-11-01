import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../api/user.api';
import { DEPARTMENTS } from '../constants';
import {
  User as UserIcon,
  Mail,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Download,
  Trash2,
  Shield,
  Camera,
  Upload,
} from 'lucide-react';
import { exportUserData } from '../api/privacy';
import { DeleteAccountModal } from '../components/DeleteAccountModal';

export const Profile = () => {
  const { user, updateUser, refreshUser } = useAuth();

  // Profile fields state initialized from current user
  const [profileData, setProfileData] = useState(() => ({
    name: user?.name || '',
    department: user?.department || '',
    semester: user?.semester != null ? String(user.semester) : '',
    avatar: user?.avatar || '',
    emailNotifications: user?.emailNotifications !== false,
  }));

  // Sync state if user changes (standard React pattern without useEffect cascading render)
  const [syncedUser, setSyncedUser] = useState(user);
  if (user && user !== syncedUser) {
    setSyncedUser(user);
    setProfileData({
      name: user.name || '',
      department: user.department || '',
      semester: user.semester != null ? String(user.semester) : '',
      avatar: user.avatar || '',
      emailNotifications: user.emailNotifications !== false,
    });
  }

  // Password fields state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Status and feedback states
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileFieldErrors, setProfileFieldErrors] = useState({});

  // Avatar upload states
  const fileInputRef = useRef(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarSuccess, setAvatarSuccess] = useState('');

  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({});

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so user can pick the same file again if failed
    e.target.value = '';

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setAvatarError('Only JPEG, PNG and WebP images are allowed.');
      setAvatarSuccess('');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Avatar image must be smaller than 2 MB.');
      setAvatarSuccess('');
      return;
    }

    setAvatarUploading(true);
    setAvatarError('');
    setAvatarSuccess('');

    try {
      const updatedUser = await userApi.uploadAvatar(file);
      updateUser(updatedUser);
      setProfileData((prev) => ({
        ...prev,
        avatar: updatedUser.avatar || '',
      }));
      setAvatarSuccess('Profile photo updated successfully!');
    } catch (err) {
      setAvatarError(err.message || 'Failed to upload avatar photo');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (profileFieldErrors[name]) {
      setProfileFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setProfileSuccess('');
    setProfileError('');
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    if (passwordFieldErrors[name]) {
      setPasswordFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setPasswordSuccess('');
    setPasswordError('');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setProfileFieldErrors({});

    const errors = {};
    if (!profileData.name.trim()) {
      errors.name = 'Name is required';
    } else if (profileData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (Object.keys(errors).length > 0) {
      setProfileFieldErrors(errors);
      return;
    }

    setProfileSaving(true);
    try {
      const payload = {
        name: profileData.name.trim(),
        emailNotifications: profileData.emailNotifications,
      };

      if (profileData.department) {
        payload.department = profileData.department;
      }

      if (profileData.semester) {
        payload.semester = parseInt(profileData.semester, 10);
      } else {
        payload.semester = null;
      }

      if (profileData.avatar !== undefined) {
        payload.avatar = profileData.avatar.trim();
      }

      const updated = await userApi.updateProfile(payload);
      updateUser(updated);
      setProfileSuccess('Profile updated successfully');
    } catch (err) {
      if (err.errors && err.errors.length > 0) {
        const mapped = {};
        err.errors.forEach((e) => {
          mapped[e.field] = e.message;
        });
        setProfileFieldErrors(mapped);
      } else {
        setProfileError(err.message || 'Failed to update profile');
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');
    setPasswordFieldErrors({});

    const errors = {};
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Enter your current password';
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    } else if (!/[a-zA-Z]/.test(passwordData.newPassword) || !/[0-9]/.test(passwordData.newPassword)) {
      errors.newPassword = 'Password must contain at least one letter and one number';
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordFieldErrors(errors);
      return;
    }

    setPasswordSaving(true);
    try {
      await userApi.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setPasswordSuccess('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      await refreshUser();
    } catch (err) {
      if (err.errors && err.errors.length > 0) {
        const mapped = {};
        err.errors.forEach((e) => {
          mapped[e.field] = e.message;
        });
        setPasswordFieldErrors(mapped);
      } else {
        setPasswordError(err.message || 'Failed to update password');
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  const isGoogleOnly =
    user?.authProviders &&
    user.authProviders.includes('google') &&
    !user.authProviders.includes('local');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const handleExportData = async () => {
    setExporting(true);
    setExportError('');
    try {
      await exportUserData();
    } catch (err) {
      setExportError(err.message || 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Account Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your personal details, college department, and security preferences.
        </p>
      </div>

      {/* Account Overview Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-2xl overflow-hidden border border-blue-200">
              {profileData.avatar ? (
                <img
                  src={profileData.avatar}
                  alt={user?.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <span>{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
              )}
            </div>
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
            {/* Upload button overlay */}
            <button
              type="button"
              disabled={avatarUploading}
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100 disabled:bg-black/60 cursor-pointer"
              title="Change profile photo"
              aria-label="Change profile photo"
            >
              {avatarUploading ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  <span className="text-[10px] font-medium mt-0.5">Edit</span>
                </>
              )}
            </button>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium underline flex items-center gap-1"
              >
                {avatarUploading ? 'Uploading...' : 'Change photo'}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {user?.email}
              </span>
              <span>•</span>
              <span className="capitalize">{user?.role}</span>
            </div>
            {avatarError && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {avatarError}
              </p>
            )}
            {avatarSuccess && (
              <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {avatarSuccess}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {user?.emailVerified ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified Email
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5" />
              Unverified Email
            </span>
          )}

          {user?.authProviders?.map((prov) => (
            <span
              key={prov}
              className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full border border-gray-200 uppercase"
            >
              {prov}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Information Form */}
        <div className="md:col-span-2 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200 space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
            <UserIcon className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Personal & Academic Details</h3>
          </div>

          {profileSuccess && (
            <div
              role="alert"
              className="flex items-center gap-2 p-3.5 bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl"
            >
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div
              role="alert"
              className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl"
            >
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-5" noValidate>
            <div>
              <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <input
                id="profile-name"
                name="name"
                type="text"
                required
                value={profileData.name}
                onChange={handleProfileChange}
                className={`mt-1 block w-full px-4 py-2.5 rounded-xl border text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition sm:text-sm ${
                  profileFieldErrors.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
                aria-invalid={profileFieldErrors.name ? 'true' : 'false'}
              />
              {profileFieldErrors.name && (
                <p className="mt-1 text-xs text-red-600">{profileFieldErrors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700">
                Email Address (read-only)
              </label>
              <input
                id="profile-email"
                type="email"
                disabled
                value={user?.email || ''}
                className="mt-1 block w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 shadow-sm sm:text-sm cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">Contact admin to update your primary student email.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-department" className="block text-sm font-medium text-gray-700">
                  Department
                </label>
                <div className="mt-1 relative">
                  <select
                    id="profile-department"
                    name="department"
                    value={profileData.department}
                    onChange={handleProfileChange}
                    className="block w-full px-4 py-2.5 rounded-xl border border-gray-300 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition sm:text-sm bg-white"
                  >
                    <option value="">Select department</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                {profileFieldErrors.department && (
                  <p className="mt-1 text-xs text-red-600">{profileFieldErrors.department}</p>
                )}
              </div>

              <div>
                <label htmlFor="profile-semester" className="block text-sm font-medium text-gray-700">
                  Semester
                </label>
                <div className="mt-1 relative">
                  <select
                    id="profile-semester"
                    name="semester"
                    value={profileData.semester}
                    onChange={handleProfileChange}
                    className="block w-full px-4 py-2.5 rounded-xl border border-gray-300 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition sm:text-sm bg-white"
                  >
                    <option value="">Select semester</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <option key={sem} value={String(sem)}>
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                </div>
                {profileFieldErrors.semester && (
                  <p className="mt-1 text-xs text-red-600">{profileFieldErrors.semester}</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  Profile Photo
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Upload a photo (JPEG, PNG or WebP, up to 2 MB).
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm transition disabled:opacity-50"
              >
                {avatarUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload New Photo</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="emailNotifications"
                  checked={profileData.emailNotifications}
                  onChange={handleProfileChange}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Receive email notifications for book exchange inquiries and updates
                </span>
              </label>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={profileSaving}
                className="inline-flex items-center justify-center gap-2 py-2.5 px-6 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {profileSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving changes...
                  </>
                ) : (
                  'Save Profile'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200 space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
            <Lock className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Security</h3>
          </div>

          {isGoogleOnly ? (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-sm text-gray-600">
              <p className="font-medium text-gray-900">Google Account</p>
              <p>
                You sign in with Google. To configure a local password for email/password login, use the forgot password flow.
              </p>
            </div>
          ) : (
            <>
              {passwordSuccess && (
                <div
                  role="alert"
                  className="flex items-center gap-2 p-3.5 bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div
                  role="alert"
                  className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleSavePassword} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                    Current Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className={`block w-full px-4 py-2.5 rounded-xl border text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition sm:text-sm pr-11 ${
                        passwordFieldErrors.currentPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordFieldErrors.currentPassword && (
                    <p className="mt-1 text-xs text-red-600">{passwordFieldErrors.currentPassword}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className={`block w-full px-4 py-2.5 rounded-xl border text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition sm:text-sm pr-11 ${
                        passwordFieldErrors.newPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordFieldErrors.newPassword && (
                    <p className="mt-1 text-xs text-red-600">{passwordFieldErrors.newPassword}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className={`mt-1 block w-full px-4 py-2.5 rounded-xl border text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition sm:text-sm ${
                      passwordFieldErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {passwordFieldErrors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-600">{passwordFieldErrors.confirmPassword}</p>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {passwordSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Data & Privacy Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-6">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">Data & Privacy</h3>
        </div>

        {exportError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{exportError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-1">Export Personal Data</h4>
              <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                Download a complete, machine-readable JSON archive of your textbook listings, messages, offers, and requests.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportData}
              disabled={exporting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating Archive...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Export My Data (JSON)
                </>
              )}
            </button>
          </div>

          <div className="p-5 bg-red-50/50 rounded-xl border border-red-100 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-red-950 mb-1">Delete Account</h4>
              <p className="text-xs text-red-700/80 mb-4 leading-relaxed">
                Permanently close your account, remove your active book listings, and anonymize all personal data.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete My Account
            </button>
          </div>
        </div>
      </div>

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};
