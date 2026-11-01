import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getListing } from '../api/listings';
import { createBookRequest } from '../api/requests';
import { startConversation } from '../api/chat';
import { addToWishlist, removeFromWishlist } from '../api/wanted';
import { reportListing } from '../api/trust';
import { RequestModal } from '../components/RequestModal';
import { ReportModal } from '../components/ReportModal';
import { useNavigate } from 'react-router-dom';
import { Eye, Calendar, BookOpen, AlertCircle, ArrowLeft, Tag, Layers, GraduationCap, CheckCircle, Heart, Flag } from 'lucide-react';

export function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Request modal state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isRequestSubmitting, setIsRequestSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const data = await getListing(id);
        if (isMounted) {
          setListing(data);
          if (user?.wishlist?.includes?.(data._id)) {
            setIsWishlisted(true);
          }
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Listing not found');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">Loading textbook...</div>;
  }

  if (error || !listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Listing Unavailable</h2>
        <p className="text-sm text-gray-600 mb-6">{error || 'This listing does not exist or has been removed.'}</p>
        <Link to="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          ← Return to Browse
        </Link>
      </div>
    );
  }

  const handleCreateRequest = async (payload) => {
    setIsRequestSubmitting(true);
    try {
      await createBookRequest(listing._id, payload);
      setRequestSuccess(true);
    } finally {
      setIsRequestSubmitting(false);
    }
  };

  const isOwner = user && listing.seller?._id === user._id;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 mb-6 transition">
        <ArrowLeft className="w-4 h-4" />
        Back to Browse
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 p-6 sm:p-8">
        {/* Left column: Images */}
        <div className="space-y-4">
          <div className="aspect-[4/5] bg-gray-100 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center">
            {listing.images && listing.images.length > 0 ? (
              <img
                src={typeof (listing.images[activeImageIdx] || listing.images[0]) === 'object' ? (listing.images[activeImageIdx]?.url || listing.images[0]?.url) : (listing.images[activeImageIdx] || listing.images[0])}
                alt={listing.title}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-6 text-gray-400">
                <BookOpen className="w-16 h-16 mx-auto mb-2 opacity-50" />
                <span className="text-sm">No photos provided</span>
              </div>
            )}
          </div>

          {listing.images && listing.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {listing.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImageIdx(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                    activeImageIdx === i ? 'border-blue-600 ring-2 ring-blue-500/20' : 'border-gray-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={typeof img === 'object' ? img.url : img}
                    alt={`Thumbnail ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Book Details */}
        <div className="flex flex-col justify-between">
          <div>
            {/* Type & Status Badges */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-md uppercase tracking-wider ${
                listing.listingType === 'free'
                  ? 'bg-emerald-100 text-emerald-800'
                  : listing.listingType === 'swap'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {listing.listingType}
              </span>

              <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700 capitalize">
                Condition: {listing.condition}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-1 leading-snug">{listing.title}</h1>
            <p className="text-base text-gray-600 mb-4">by <span className="font-medium text-gray-800">{listing.author}</span></p>

            {/* Price or Swap Details */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
              {listing.listingType === 'sell' && (
                <div>
                  <span className="text-xs text-gray-500 uppercase font-semibold">Price</span>
                  <div className="text-3xl font-extrabold text-gray-900 mt-0.5">₹{listing.price}</div>
                </div>
              )}
              {listing.listingType === 'free' && (
                <div>
                  <span className="text-xs text-emerald-700 uppercase font-semibold">Free Giveaway</span>
                  <p className="text-sm text-gray-700 mt-1">This book is offered for free by the student.</p>
                </div>
              )}
              {listing.listingType === 'swap' && (
                <div>
                  <span className="text-xs text-purple-700 uppercase font-semibold">Looking to Swap For</span>
                  <div className="text-lg font-bold text-purple-950 mt-0.5">{listing.swapFor}</div>
                </div>
              )}
            </div>

            {/* Academic Tags */}
            <div className="grid grid-cols-2 gap-3 text-xs mb-6">
              {listing.department && (
                <div className="flex items-center gap-2 text-gray-600">
                  <GraduationCap className="w-4 h-4 text-gray-400" />
                  <span>Dept: <strong className="text-gray-900 font-medium">{listing.department}</strong></span>
                </div>
              )}
              {listing.semester && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Layers className="w-4 h-4 text-gray-400" />
                  <span>Semester: <strong className="text-gray-900 font-medium">{listing.semester}</strong></span>
                </div>
              )}
              {listing.subject && (
                <div className="flex items-center gap-2 text-gray-600">
                  <BookOpen className="w-4 h-4 text-gray-400" />
                  <span>Subject: <strong className="text-gray-900 font-medium">{listing.subject}</strong></span>
                </div>
              )}
              {listing.courseCode && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <span>Course: <strong className="text-gray-900 font-medium">{listing.courseCode}</strong></span>
                </div>
              )}
            </div>

            {listing.note && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Seller Notes</h3>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 whitespace-pre-line">
                  {listing.note}
                </p>
              </div>
            )}
          </div>

          {/* Seller Profile & Interaction Footers */}
          <div className="border-t border-gray-200 pt-6 mt-4">
            <div className="flex flex-wrap items-center justify-between gap-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm border border-blue-200">
                  {listing.seller?.name ? listing.seller.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <Link
                    to={`/users/${listing.seller?._id}`}
                    className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition"
                  >
                    {listing.seller?.name || 'Fellow Student'}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {listing.seller?.department ? `${listing.seller.department}` : 'Student'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {user && !isOwner && (
                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="inline-flex min-h-11 lg:min-h-0 items-center gap-1 px-3 py-2 lg:px-0 lg:py-0 text-xs text-gray-400 hover:text-red-500 transition"
                    title="Report this listing"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    Report
                  </button>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {listing.views}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(listing.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex flex-col gap-3">
              {requestSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-200 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Request sent successfully! You can track it in your Requests dashboard.</span>
                </div>
              )}

              <div className="flex gap-3">
                {isOwner ? (
                  <Link
                    to={`/listings/${listing._id}/edit`}
                    className="w-full text-center py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold rounded-lg transition"
                  >
                    Edit This Listing
                  </Link>
                ) : (
                  <>
                    {user ? (
                      <button
                        onClick={() => setIsRequestModalOpen(true)}
                        disabled={listing.status !== 'available' || requestSuccess}
                        className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
                      >
                        {listing.status !== 'available' ? 'Not Available' : 'Request Book'}
                      </button>
                    ) : (
                      <Link
                        to="/login"
                        className="flex-1 text-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
                      >
                        Sign in to Request
                      </Link>
                    )}

                    <button
                      onClick={async () => {
                        try {
                          const conv = await startConversation(listing._id);
                          navigate(`/chat/${conv._id}`);
                        } catch (err) {
                          alert(err.message || 'Failed to start chat');
                        }
                      }}
                      className="px-4 py-2.5 border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-semibold rounded-lg transition"
                    >
                      Chat with Seller
                    </button>

                    {user && (
                      <button
                        onClick={async () => {
                          try {
                            setWishlistLoading(true);
                            if (isWishlisted) {
                              await removeFromWishlist(listing._id);
                              setIsWishlisted(false);
                            } else {
                              await addToWishlist(listing._id);
                              setIsWishlisted(true);
                            }
                          } catch {
                            // ignore
                          } finally {
                            setWishlistLoading(false);
                          }
                        }}
                        disabled={wishlistLoading}
                        className="px-3 py-2.5 border border-gray-300 hover:border-red-300 text-gray-700 hover:text-red-500 rounded-lg transition flex items-center justify-center"
                        title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'
                          }`}
                        />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <RequestModal
        listing={listing}
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSubmit={handleCreateRequest}
        submitting={isRequestSubmitting}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetType="listing"
        targetId={listing._id}
        onSubmit={reportListing}
      />
    </div>
  );
}
