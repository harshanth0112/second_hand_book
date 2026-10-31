import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { searchListings } from '../api/listings';
import { BookCard } from '../components/BookCard';
import { FilterBar } from '../components/FilterBar';
import { Pagination } from '../components/Pagination';
import { BookOpen, RefreshCw } from 'lucide-react';

export function Home() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Debounced input tracking
  const [localQuery, setLocalQuery] = useState(searchParams.get('q') || '');
  const abortControllerRef = useRef(null);

  // Sync state from URL
  const filters = {
    q: localQuery,
    department: searchParams.get('department') || (user?.department && !searchParams.toString() ? user.department : ''),
    semester: searchParams.get('semester') || (user?.semester && !searchParams.toString() ? String(user.semester) : ''),
    condition: searchParams.get('condition') || '',
    listingType: searchParams.get('listingType') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sort: searchParams.get('sort') || 'newest',
    page: parseInt(searchParams.get('page') || '1', 10),
  };

  const handleFilterChange = (newValues) => {
    const updated = { ...filters, ...newValues };
    if ('q' in newValues) {
      setLocalQuery(newValues.q);
    }

    const nextParams = new URLSearchParams();
    for (const [k, v] of Object.entries(updated)) {
      if (v !== '' && v !== null && v !== undefined) {
        if (k === 'page' && v === 1) continue; // omit default page 1
        if (k === 'sort' && v === 'newest') continue; // omit default sort
        nextParams.set(k, v);
      }
    }
    setSearchParams(nextParams);
  };

  const handleClearFilters = () => {
    setLocalQuery('');
    setSearchParams({});
  };

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');

      try {
        const queryParams = { ...filters };
        if (!queryParams.q) delete queryParams.q;

        const data = await searchListings(queryParams, controller.signal);
        setListings(data.items || []);
        setPagination({
          page: data.page,
          totalPages: data.totalPages,
          total: data.total,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to load listings');
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchParams, user]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Campus Textbook Exchange</h1>
        <p className="text-sm text-gray-600 mt-1 max-w-2xl">
          Buy, sell, swap, and give away course textbooks with verified students at your campus.
        </p>
      </div>

      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
      />

      {/* Catalog State */}
      {error ? (
        <div className="p-8 bg-red-50 border border-red-200 rounded-xl text-center space-y-3">
          <p className="text-sm text-red-700 font-medium">{error}</p>
          <button
            onClick={() => handleFilterChange({})}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 animate-pulse">
              <div className="aspect-[4/3] bg-gray-200 rounded-lg" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-1/4 mt-4" />
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900">No books found</h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            Try adjusting your search query or clearing some filters.
          </p>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
            <span>Showing {listings.length} of {pagination.total} textbooks</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {listings.map((book) => (
              <BookCard key={book._id} listing={book} />
            ))}
          </div>

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(nextPage) => handleFilterChange({ page: nextPage })}
          />
        </>
      )}
    </div>
  );
}
