import React, { useState } from 'react';
import { Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { DEPARTMENTS } from '../constants';

export function FilterBar({ filters, onChange, onClear }) {
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({ [name]: value });
  };

  const handleConditionToggle = (cond) => {
    const current = filters.condition ? filters.condition.split(',').map((c) => c.trim()) : [];
    const next = current.includes(cond)
      ? current.filter((c) => c !== cond)
      : [...current, cond];
    onChange({ condition: next.join(',') });
  };

  const activeConditionList = filters.condition ? filters.condition.split(',').map((c) => c.trim()) : [];
  const activeFilterCount = [
    filters.q,
    filters.department,
    filters.semester,
    activeConditionList.length > 0,
    filters.listingType,
    filters.minPrice,
    filters.maxPrice,
    filters.sort && filters.sort !== 'newest',
  ].filter(Boolean).length;

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
      {/* Search Input */}
      <div className="relative mb-3 md:mb-4">
        <Search className="w-5 h-5 absolute left-3.5 top-3 text-gray-400" />
        <input
          id="filter-search"
          type="text"
          name="q"
          value={filters.q || ''}
          onChange={handleChange}
          placeholder="Search textbooks by title or author..."
          aria-label="Search textbooks by title or author"
          className="w-full min-h-11 lg:min-h-0 pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
        />
        {filters.q && (
          <button
            type="button"
            onClick={() => onChange({ q: '' })}
            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-gray-400 hover:text-gray-600"
            title="Clear search"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mb-3 flex items-center justify-between gap-3 md:mb-4 md:justify-end">
        <button
          type="button"
          onClick={() => setFiltersExpanded((expanded) => !expanded)}
          aria-expanded={filtersExpanded}
          aria-controls="filter-controls"
          aria-label={activeFilterCount ? `Filters, ${activeFilterCount} active` : 'Filters'}
          className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 md:hidden ${
            filtersExpanded
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-xs font-semibold text-white">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 transition-transform ${filtersExpanded ? 'rotate-180' : ''}`}
          />
        </button>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex min-h-11 items-center px-3 text-xs font-medium text-blue-600 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 md:hidden"
        >
          Clear all
        </button>
      </div>

      <div
        id="filter-controls"
        className={`${filtersExpanded ? 'block' : 'hidden'} space-y-4 md:block`}
      >
        {/* Row of Dropdowns: Department, Semester, Listing Type, Sort */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <label htmlFor="filter-department" className="block text-gray-600 mb-1 font-medium">Department</label>
          <select
            id="filter-department"
            name="department"
            value={filters.department || ''}
            onChange={handleChange}
            className="w-full min-h-11 lg:min-h-0 px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-semester" className="block text-gray-600 mb-1 font-medium">Semester</label>
          <select
            id="filter-semester"
            name="semester"
            value={filters.semester || ''}
            onChange={handleChange}
            className="w-full min-h-11 lg:min-h-0 px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-listing-type" className="block text-gray-600 mb-1 font-medium">Type</label>
          <select
            id="filter-listing-type"
            name="listingType"
            value={filters.listingType || ''}
            onChange={handleChange}
            className="w-full min-h-11 lg:min-h-0 px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Types</option>
            <option value="sell">For Sale</option>
            <option value="free">Free Giveaway</option>
            <option value="swap">Swap</option>
          </select>
        </div>

        <div>
          <label htmlFor="filter-sort" className="block text-gray-600 mb-1 font-medium">Sort By</label>
          <select
            id="filter-sort"
            name="sort"
            value={filters.sort || 'newest'}
            onChange={handleChange}
            className="w-full min-h-11 lg:min-h-0 px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            {filters.q && <option value="relevance">Most Relevant</option>}
          </select>
        </div>
        </div>

        {/* Row of Condition tags & Min/Max Price */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-gray-100 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-600">Condition:</span>
          {['like new', 'good', 'fair'].map((cond) => {
            const active = activeConditionList.includes(cond);
            return (
              <button
                key={cond}
                type="button"
                onClick={() => handleConditionToggle(cond)}
                className={`min-h-11 lg:min-h-0 px-2.5 py-1 rounded-full border capitalize transition ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600 font-medium'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {cond}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-gray-500">₹</span>
            <label htmlFor="filter-min-price" className="sr-only">Minimum price</label>
            <input
              id="filter-min-price"
              type="number"
              name="minPrice"
              placeholder="Min"
              value={filters.minPrice || ''}
              onChange={handleChange}
              className="min-h-11 lg:min-h-0 w-16 px-2 py-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <span className="text-gray-400">-</span>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">₹</span>
            <label htmlFor="filter-max-price" className="sr-only">Maximum price</label>
            <input
              id="filter-max-price"
              type="number"
              name="maxPrice"
              placeholder="Max"
              value={filters.maxPrice || ''}
              onChange={handleChange}
              className="min-h-11 lg:min-h-0 w-16 px-2 py-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={onClear}
            className="hidden min-h-11 items-center px-3 text-xs font-medium text-blue-600 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 md:inline-flex"
          >
            Clear all
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
