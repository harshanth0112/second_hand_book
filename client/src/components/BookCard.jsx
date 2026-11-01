import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { addToWishlist, removeFromWishlist } from '../api/wanted';

export function BookCard({ listing, isWishlisted: initialWishlisted, onWishlistChange }) {
  const { user } = useAuth();
  const [isWishlisted, setIsWishlisted] = useState(
    Boolean(initialWishlisted || user?.wishlist?.includes?.(listing._id))
  );
  const [loading, setLoading] = useState(false);

  const firstImg = listing.images && listing.images.length > 0 ? listing.images[0] : null;
  const thumbnail = (typeof firstImg === 'object' && firstImg?.url ? firstImg.url : firstImg) || listing.coverUrl;

  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    try {
      setLoading(true);
      if (isWishlisted) {
        await removeFromWishlist(listing._id);
        setIsWishlisted(false);
        if (onWishlistChange) onWishlistChange(listing._id, false);
      } else {
        await addToWishlist(listing._id);
        setIsWishlisted(true);
        if (onWishlistChange) onWishlistChange(listing._id, true);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const getTypeBadge = () => {
    if (listing.listingType === 'free') {
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800">Free</span>;
    }
    if (listing.listingType === 'swap') {
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-100 text-purple-800">Swap</span>;
    }
    return <span className="text-base font-bold text-gray-900">₹{listing.price}</span>;
  };

  return (
    <Link
      to={`/listings/${listing._id}`}
      className="group bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md hover:border-blue-300 transition flex flex-col justify-between"
    >
      <div>
        <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden flex items-center justify-center border-b border-gray-100">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            />
          ) : (
            <BookOpen className="w-12 h-12 text-gray-300" />
          )}

          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            {user && (
              <button
                type="button"
                onClick={handleToggleWishlist}
                disabled={loading}
                className="p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-700 hover:text-red-500 shadow-sm transition"
                title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                aria-label={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'
                  }`}
                />
              </button>
            )}
            <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded bg-black/60 text-white backdrop-blur-xs">
              {listing.condition}
            </span>
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition text-sm mb-0.5">
            {listing.title}
          </h3>
          <p className="text-xs text-gray-500 line-clamp-1 mb-2">by {listing.author}</p>

          <div className="flex flex-wrap gap-1 mb-3">
            {listing.department && (
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                {listing.department}
              </span>
            )}
            {listing.semester && (
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                Sem {listing.semester}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 pt-1 flex items-center justify-between border-t border-gray-100">
        <div className="flex items-center gap-1">{getTypeBadge()}</div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">
            {listing.seller?.name ? listing.seller.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <span className="text-xs text-gray-500 truncate max-w-[80px]">
            {listing.seller?.name?.split(' ')[0] || 'Student'}
          </span>
        </div>
      </div>
    </Link>
  );
}

