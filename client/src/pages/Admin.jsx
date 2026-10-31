import React, { useEffect, useState } from 'react';
import {
  getAdminReports,
  updateReportStatus,
  removeAdminListing,
  setAdminUserBan,
  getAdminMeetupPoints,
  createAdminMeetupPoint,
  updateAdminMeetupPoint,
} from '../api/admin';
import {
  ShieldAlert,
  Flag,
  MapPin,
  CheckCircle,
  XCircle,
  Trash2,
  Ban,
  Plus,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function Admin() {
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'meetups'
  const [reportStatus, setReportStatus] = useState('open');
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState('');

  // Meetup points state
  const [meetupPoints, setMeetupPoints] = useState([]);
  const [meetupLoading, setMeetupLoading] = useState(false);
  const [meetupError, setMeetupError] = useState('');
  const [isMeetupModalOpen, setIsMeetupModalOpen] = useState(false);
  const [newPoint, setNewPoint] = useState({ name: '', area: '', description: '' });
  const [creatingPoint, setCreatingPoint] = useState(false);

  // Load Reports
  const loadReports = async () => {
    setReportsLoading(true);
    setReportsError('');
    try {
      const data = await getAdminReports({ status: reportStatus });
      setReports(data.reports || []);
    } catch (err) {
      setReportsError(err.message || 'Failed to load reports');
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      loadReports();
    }
  }, [activeTab, reportStatus]);

  // Load Meetup Points
  const loadMeetupPoints = async () => {
    setMeetupLoading(true);
    setMeetupError('');
    try {
      const data = await getAdminMeetupPoints();
      setMeetupPoints(data || []);
    } catch (err) {
      setMeetupError(err.message || 'Failed to load meetup points');
    } finally {
      setMeetupLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'meetups') {
      loadMeetupPoints();
    }
  }, [activeTab]);

  // Report actions
  const handleResolveReport = async (reportId, status) => {
    try {
      await updateReportStatus(reportId, status);
      setReports((prev) => prev.filter((r) => r._id !== reportId));
    } catch (err) {
      alert(err.message || 'Failed to update report');
    }
  };

  const handleRemoveListing = async (listingId, reportId) => {
    if (!window.confirm('Are you sure you want to remove this listing? The seller will be notified.')) return;
    try {
      await removeAdminListing(listingId);
      if (reportId) {
        await updateReportStatus(reportId, 'resolved');
        setReports((prev) => prev.filter((r) => r._id !== reportId));
      } else {
        loadReports();
      }
    } catch (err) {
      alert(err.message || 'Failed to remove listing');
    }
  };

  const handleBanUser = async (userId, banned, reportId) => {
    const action = banned ? 'ban' : 'unban';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      await setAdminUserBan(userId, banned);
      if (reportId && banned) {
        await updateReportStatus(reportId, 'resolved');
        setReports((prev) => prev.filter((r) => r._id !== reportId));
      } else {
        loadReports();
      }
    } catch (err) {
      alert(err.message || `Failed to ${action} user`);
    }
  };

  // Meetup actions
  const handleToggleMeetupActive = async (point) => {
    try {
      const updated = await updateAdminMeetupPoint(point._id, { active: !point.active });
      setMeetupPoints((prev) => prev.map((p) => (p._id === point._id ? updated : p)));
    } catch (err) {
      alert(err.message || 'Failed to update meetup point');
    }
  };

  const handleCreateMeetupPoint = async (e) => {
    e.preventDefault();
    if (!newPoint.name.trim()) return;
    setCreatingPoint(true);
    try {
      const created = await createAdminMeetupPoint(newPoint);
      setMeetupPoints((prev) => [created, ...prev]);
      setNewPoint({ name: '', area: '', description: '' });
      setIsMeetupModalOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to create meetup point');
    } finally {
      setCreatingPoint(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-red-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <ShieldAlert className="w-4 h-4" />
            Admin Operations
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Administration Console</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage student reports, moderate listings, and configure campus handover safe zones.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex p-1 bg-gray-100 rounded-xl border border-gray-200">
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'reports'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Flag className="w-4 h-4" />
            Reports Queue
          </button>
          <button
            onClick={() => setActiveTab('meetups')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'meetups'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Meetup Points
          </button>
        </div>
      </div>

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Sub-filter by report status */}
          <div className="flex gap-2 border-b border-gray-200 pb-3">
            {['open', 'resolved', 'dismissed'].map((status) => (
              <button
                key={status}
                onClick={() => setReportStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                  reportStatus === status
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status} Reports
              </button>
            ))}
          </div>

          {reportsLoading && (
            <div className="py-16 text-center text-gray-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading moderation reports...
            </div>
          )}

          {reportsError && (
            <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{reportsError}</span>
            </div>
          )}

          {!reportsLoading && !reportsError && reports.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 p-8">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900">All Clear!</h3>
              <p className="text-sm text-gray-500 mt-1">
                There are no {reportStatus} reports in the moderation queue.
              </p>
            </div>
          )}

          {!reportsLoading && reports.length > 0 && (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report._id}
                  className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700 uppercase">
                        {report.reason.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-400">
                        Reported by <strong>{report.reporter?.name}</strong> •{' '}
                        {new Date(report.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {report.details && (
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        "{report.details}"
                      </p>
                    )}

                    {/* Target Summaries */}
                    {report.targetType === 'listing' && report.targetListing && (
                      <div className="flex items-center gap-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                        {report.targetListing.coverUrl && (
                          <img
                            src={report.targetListing.coverUrl}
                            alt=""
                            className="w-12 h-16 object-cover rounded shadow-sm shrink-0"
                          />
                        )}
                        <div className="text-xs">
                          <span className="font-bold text-gray-900 text-sm block">
                            {report.targetListing.title}
                          </span>
                          <span className="text-gray-500">
                            by {report.targetListing.author} • ₹{report.targetListing.price} • Status:{' '}
                            <strong className="capitalize">{report.targetListing.status}</strong>
                          </span>
                          <div className="mt-1">
                            <Link
                              to={`/listings/${report.targetListing._id}`}
                              className="text-blue-600 hover:underline inline-flex items-center gap-1 font-medium"
                              target="_blank"
                            >
                              View Listing <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}

                    {report.targetType === 'user' && report.targetUser && (
                      <div className="flex items-center gap-3 p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-xs">
                        <div className="w-10 h-10 rounded-full bg-purple-200 text-purple-800 font-bold flex items-center justify-center shrink-0">
                          {report.targetUser.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-gray-900 text-sm block">
                            {report.targetUser.name}
                          </span>
                          <span className="text-gray-500">
                            {report.targetUser.email} • {report.targetUser.department || 'Student'} •{' '}
                            {report.targetUser.isBanned ? (
                              <strong className="text-red-600">Currently Banned</strong>
                            ) : (
                              <strong className="text-emerald-600">Active</strong>
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap sm:flex-col gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-6">
                    {report.status === 'open' && (
                      <>
                        <button
                          onClick={() => handleResolveReport(report._id, 'resolved')}
                          className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Resolve
                        </button>
                        <button
                          onClick={() => handleResolveReport(report._id, 'dismissed')}
                          className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Dismiss
                        </button>
                      </>
                    )}

                    {report.targetType === 'listing' &&
                      report.targetListing &&
                      report.targetListing.status !== 'removed' && (
                        <button
                          onClick={() => handleRemoveListing(report.targetListing._id, report._id)}
                          className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold transition border border-red-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove Listing
                        </button>
                      )}

                    {report.targetType === 'user' && report.targetUser && (
                      <button
                        onClick={() =>
                          handleBanUser(
                            report.targetUser._id,
                            !report.targetUser.isBanned,
                            report._id
                          )
                        }
                        className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition border ${
                          report.targetUser.isBanned
                            ? 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                            : 'bg-red-600 text-white border-transparent hover:bg-red-700'
                        }`}
                      >
                        <Ban className="w-3.5 h-3.5" />
                        {report.targetUser.isBanned ? 'Unban User' : 'Ban User'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Meetup Points Tab */}
      {activeTab === 'meetups' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Campus Meetup Points</h2>
              <p className="text-xs text-gray-500">
                Designated public locations for student textbook exchanges.
              </p>
            </div>
            <button
              onClick={() => setIsMeetupModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Add Location
            </button>
          </div>

          {meetupLoading && (
            <div className="py-16 text-center text-gray-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading meetup points...
            </div>
          )}

          {meetupError && (
            <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200">
              {meetupError}
            </div>
          )}

          {!meetupLoading && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Area / Campus</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {meetupPoints.map((point) => (
                      <tr key={point._id} className="hover:bg-gray-50/50 transition">
                        <td className="px-6 py-4 font-semibold text-gray-900">{point.name}</td>
                        <td className="px-6 py-4 text-xs">{point.area || '—'}</td>
                        <td className="px-6 py-4 text-xs max-w-xs truncate text-gray-500">
                          {point.description || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              point.active
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {point.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleToggleMeetupActive(point)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                          >
                            {point.active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {meetupPoints.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-400 text-xs">
                          No meetup points found. Click "Add Location" to create one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Meetup Point Modal */}
      {isMeetupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Meetup Point</h3>
            <form onSubmit={handleCreateMeetupPoint} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Location Name *
                </label>
                <input
                  type="text"
                  required
                  value={newPoint.name}
                  onChange={(e) => setNewPoint({ ...newPoint, name: e.target.value })}
                  placeholder="e.g. Central Library Front Steps"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Campus Area
                </label>
                <input
                  type="text"
                  value={newPoint.area}
                  onChange={(e) => setNewPoint({ ...newPoint, area: e.target.value })}
                  placeholder="e.g. North Campus / Quad"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Description / Directions
                </label>
                <textarea
                  rows="3"
                  value={newPoint.description}
                  onChange={(e) => setNewPoint({ ...newPoint, description: e.target.value })}
                  placeholder="e.g. Under the clock tower near bench #4"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMeetupModalOpen(false)}
                  disabled={creatingPoint}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPoint || !newPoint.name.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creatingPoint ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Point'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

