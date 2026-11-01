import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyListings, deleteListing, relistListing } from '../api/listings';
import { Plus, Edit2, Trash2, RefreshCw, Eye, BookOpen, AlertCircle } from 'lucide-react';

const getImageUrl = (image) => (
  typeof image === 'object' && image !== null ? image.url : image
) || '';

export function MyListings() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const loadListings = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMyListings({ status: statusFilter || undefined });
      setListings(data.items || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, [statusFilter]);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to remove "${title}"?`)) return;

    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await deleteListing(id);
      setListings((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete listing');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleRelist = async (id) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const updated = await relistListing(id);
      setListings((prev) => prev.map((item) => (item._id === id ? updated : item)));
    } catch (err) {
      alert(err.message || 'Failed to relist');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      available: 'bg-green-100 text-green-800 border-green-200',
      reserved: 'bg-amber-100 text-amber-800 border-amber-200',
      sold: 'bg-gray-100 text-gray-700 border-gray-200',
      expired: 'bg-red-100 text-red-800 border-red-200',
    };
    return (
      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border capitalize ${map[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
          <p className="text-sm text-gray-600 mt-1">Manage, edit, or relist your books.</p>
        </div>

        <Link
          to="/sell"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          List a Book
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 border-b border-gray-200 text-sm">
        {[
          { label: 'All', value: '' },
          { label: 'Available', value: 'available' },
          { label: 'Reserved', value: 'reserved' },
          { label: 'Sold', value: 'sold' },
          { label: 'Expired', value: 'expired' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === tab.value
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-500 text-sm">Loading your listings...</div>
      ) : listings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900">No listings found</h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            {statusFilter
              ? `You don't have any ${statusFilter} listings.`
              : 'You have not listed any textbooks yet.'}
          </p>
          <Link
            to="/sell"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Sell Your First Book
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm divide-y divide-gray-200">
          {listings.map((item) => (
            <div key={item._id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition">
              <div className="flex items-start gap-4">
                <div className="w-16 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center">
                  {getImageUrl(item.images?.[0]) ? (
                    <img src={getImageUrl(item.images?.[0])} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="w-6 h-6 text-gray-400" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Link
                      to={`/listings/${item._id}`}
                      className="font-semibold text-gray-900 hover:text-blue-600 transition text-base"
                    >
                      {item.title}
                    </Link>
                    {getStatusBadge(item.status)}
                  </div>
                  <p className="text-xs text-gray-500">by {item.author}</p>
                  
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-600 font-medium">
                    <span>
                      {item.listingType === 'free'
                        ? 'Free Giveaway'
                        : item.listingType === 'swap'
                        ? `Swap: ${item.swapFor}`
                        : `₹${item.price}`}
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <Eye className="w-3.5 h-3.5" />
                      {item.views} {item.views === 1 ? 'view' : 'views'}
                    </span>
                    <span className="text-gray-400">
                      Expires: {new Date(item.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {item.status === 'expired' && (
                  <button
                    onClick={() => handleRelist(item._id)}
                    disabled={actionLoading[item._id]}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Relist
                  </button>
                )}

                {item.status === 'available' && (
                  <button
                    onClick={() => navigate(`/listings/${item._id}/edit`)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}

                <button
                  onClick={() => handleDelete(item._id, item.title)}
                  disabled={actionLoading[item._id] || item.status === 'reserved'}
                  title={item.status === 'reserved' ? 'Cannot delete reserved listing' : 'Delete listing'}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-white hover:bg-red-50 rounded-lg border border-gray-200 hover:border-red-200 transition disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
