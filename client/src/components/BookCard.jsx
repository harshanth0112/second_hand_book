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

  const handleToggleWishlist = async () => {
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
    <article className="relative">
      <Link
        to={`/listings/${listing._id}`}
        className="group flex h-full flex-col justify-between overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
      >
        <div>
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden border-b border-gray-100 bg-gray-100">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={listing.title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            ) : (
              <BookOpen className="h-12 w-12 text-gray-300" />
            )}

            <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-xs">
              {listing.condition}
            </span>
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

      {user && (
        <button
          type="button"
          onClick={handleToggleWishlist}
          disabled={loading}
          className="absolute right-2 top-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-sm transition hover:bg-white hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
          aria-label={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
          aria-pressed={isWishlisted}
          aria-busy={loading}
        >
          <Heart
            className={`h-3.5 w-3.5 ${
              isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'
            }`}
          />
        </button>
      )}
    </article>
  );
}
