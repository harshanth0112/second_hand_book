import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getWishlist, removeFromWishlist } from '../api/wanted';
import { BookCard } from '../components/BookCard';
import { Heart, BookOpen } from 'lucide-react';

export function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const fetchWishlist = async (p = 1) => {
    try {
      setLoading(true);
      const res = await getWishlist({ page: p, limit: 12 });
      setItems(res.data || []);
      setPagination(res.pagination || null);
      setPage(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist(1);
  }, []);

  const handleWishlistChange = (id, isAdded) => {
    if (!isAdded) {
      setItems((prev) => prev.filter((item) => item._id !== id));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Heart className="w-6 h-6 text-red-500 fill-red-500" />
        <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-500">Loading your wishlist...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 p-8 shadow-xs">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Your wishlist is empty</h2>
          <p className="text-sm text-gray-500 mb-5">
            Save books you are interested in to monitor price drops and availability.
          </p>
          <Link
            to="/search"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-xs transition"
          >
            Explore Textbooks
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {items.map((listing) => (
              <BookCard
                key={listing._id}
                listing={listing}
                isWishlisted={true}
                onWishlistChange={handleWishlistChange}
              />
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => fetchWishlist(page - 1)}
                className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-600">
                Page {page} of {pagination.pages}
              </span>
              <button
                disabled={page >= pagination.pages}
                onClick={() => fetchWishlist(page + 1)}
                className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

