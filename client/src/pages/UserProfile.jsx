import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getUserProfile, getUserReviews, blockUser, unblockUser } from '../api/trust';
import { useAuth } from '../context/AuthContext';
import { ReportModal } from '../components/ReportModal';
import { Star, ShieldAlert, Flag, User, Ban, Check } from 'lucide-react';

export function UserProfile() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [profData, revData] = await Promise.all([
          getUserProfile(id),
          getUserReviews(id),
        ]);
        setProfile(profData);
        setReviews(revData.items || []);
        if (currentUser?.blockedUsers?.includes(id)) {
          setIsBlocked(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, currentUser]);

  const handleToggleBlock = async () => {
    try {
      setBlockLoading(true);
      if (isBlocked) {
        await unblockUser(id);
        setIsBlocked(false);
      } else {
        await blockUser(id);
        setIsBlocked(true);
      }
    } catch (err) {
      alert(err.message || 'Block action failed');
    } finally {
      setBlockLoading(false);
    }
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">Loading student profile...</div>;
  }

  if (!profile) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">User not found</div>;
  }

  const isSelf = currentUser?._id === id;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-xs mb-8 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-700 font-bold text-2xl flex items-center justify-center border-2 border-blue-200">
            {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {profile.department ? `${profile.department}` : 'Student'}
              {profile.semester ? ` • Semester ${profile.semester}` : ''}
            </p>

            {/* Ratings summary */}
            <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <span className="font-bold text-gray-900 text-base">
                  {profile.ratingAverage ? profile.ratingAverage.toFixed(1) : 'New'}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                ({profile.ratingCount} {profile.ratingCount === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          </div>
        </div>

        {!isSelf && currentUser && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setReportOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-red-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1 transition"
            >
              <Flag className="w-3.5 h-3.5" />
              Report
            </button>

            <button
              onClick={handleToggleBlock}
              disabled={blockLoading}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1 transition ${
                isBlocked
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              {isBlocked ? 'Blocked' : 'Block User'}
            </button>
          </div>
        )}
      </div>

      {/* Reviews section */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Seller Reviews</h2>

        {reviews.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500 shadow-2xs">
            No reviews yet for this student.
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((rev) => (
              <div
                key={rev._id}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            rev.rating >= s
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-gray-700">
                      {rev.reviewer?.name || 'Buyer'}
                    </span>
                  </div>

                  <span className="text-xs text-gray-400">
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {rev.listing?.title && (
                  <p className="text-xs text-gray-400 italic">Book: {rev.listing.title}</p>
                )}

                {rev.comment && (
                  <p className="text-sm text-gray-800 leading-relaxed">{rev.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="user"
        targetId={id}
        title={profile.name}
      />
    </div>
  );
}

