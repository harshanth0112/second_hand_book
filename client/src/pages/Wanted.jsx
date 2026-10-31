import React, { useState, useEffect } from 'react';
import { getWanted, createWanted, deleteWanted } from '../api/wanted';
import { Search, Plus, Trash2, BookMarked, AlertCircle } from 'lucide-react';

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics',
  'Electrical',
  'Mechanical',
  'Civil',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Commerce',
  'Management',
  'Arts',
  'Other',
];

export function Wanted() {
  const [wantedItems, setWantedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    department: '',
    maxPrice: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getWanted();
      setWantedItems(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim() && !formData.subject.trim()) {
      setError('Please provide at least a title or a subject.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: formData.title.trim() || undefined,
        subject: formData.subject.trim() || undefined,
        department: formData.department || undefined,
        maxPrice: formData.maxPrice ? Number(formData.maxPrice) : undefined,
      };

      await createWanted(payload);
      setFormData({ title: '', subject: '', department: '', maxPrice: '' });
      setFormOpen(false);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this wanted item?')) return;
    try {
      await deleteWanted(id);
      setWantedItems((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-blue-600" />
            Wanted Book Requests
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Looking for a specific book? Post a wanted request and get notified instantly when another student lists it!
          </p>
        </div>

        {wantedItems.length < 10 && (
          <button
            onClick={() => setFormOpen(!formOpen)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Post Wanted
          </button>
        )}
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs mb-6 space-y-4"
        >
          <h3 className="font-semibold text-gray-900 text-base">New Wanted Request (Max 10)</h3>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Book Title
              </label>
              <input
                type="text"
                placeholder="e.g. Operating System Concepts"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Subject
              </label>
              <input
                type="text"
                placeholder="e.g. Computer Science / Math"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Department
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="">Any Department</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Max Price (₹)
              </label>
              <input
                type="number"
                min="0"
                placeholder="Optional budget cap"
                value={formData.maxPrice}
                onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Posting...' : 'Create Alert'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-500">Loading your wanted list...</div>
      ) : wantedItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 p-8">
          <BookMarked className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-gray-800">No active wanted requests</h3>
          <p className="text-sm text-gray-500 mt-1">
            Click "Post Wanted" above to request a textbook and get notified as soon as someone lists it.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {wantedItems.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs flex items-center justify-between"
            >
              <div>
                <h4 className="font-semibold text-gray-900 text-base">
                  {item.title || item.subject}
                </h4>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1">
                  {item.title && item.subject && (
                    <span className="bg-gray-100 px-2 py-0.5 rounded">
                      Subject: {item.subject}
                    </span>
                  )}
                  {item.department && (
                    <span className="bg-gray-100 px-2 py-0.5 rounded">
                      Dept: {item.department}
                    </span>
                  )}
                  {item.maxPrice !== null && item.maxPrice !== undefined && (
                    <span className="bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded">
                      Max: ₹{item.maxPrice}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleDelete(item._id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Remove alert"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
