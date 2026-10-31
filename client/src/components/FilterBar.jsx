import React from 'react';
import { Search, X } from 'lucide-react';
import { DEPARTMENTS } from '../constants';

export function FilterBar({ filters, onChange, onClear }) {
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

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm space-y-4 mb-6">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-3 text-gray-400" />
        <input
          type="text"
          name="q"
          value={filters.q || ''}
          onChange={handleChange}
          placeholder="Search textbooks by title or author..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
        />
        {filters.q && (
          <button
            onClick={() => onChange({ q: '' })}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Row of Dropdowns: Department, Semester, Listing Type, Sort */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block text-gray-600 mb-1 font-medium">Department</label>
          <select
            name="department"
            value={filters.department || ''}
            onChange={handleChange}
            className="w-full px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
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
          <label className="block text-gray-600 mb-1 font-medium">Semester</label>
          <select
            name="semester"
            value={filters.semester || ''}
            onChange={handleChange}
            className="w-full px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
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
          <label className="block text-gray-600 mb-1 font-medium">Type</label>
          <select
            name="listingType"
            value={filters.listingType || ''}
            onChange={handleChange}
            className="w-full px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Types</option>
            <option value="sell">For Sale</option>
            <option value="free">Free Giveaway</option>
            <option value="swap">Swap</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-600 mb-1 font-medium">Sort By</label>
          <select
            name="sort"
            value={filters.sort || 'newest'}
            onChange={handleChange}
            className="w-full px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
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
                className={`px-2.5 py-1 rounded-full border capitalize transition ${
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

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-gray-500">₹</span>
            <input
              type="number"
              name="minPrice"
              placeholder="Min"
              value={filters.minPrice || ''}
              onChange={handleChange}
              className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <span className="text-gray-400">-</span>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">₹</span>
            <input
              type="number"
              name="maxPrice"
              placeholder="Max"
              value={filters.maxPrice || ''}
              onChange={handleChange}
              className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={onClear}
            className="ml-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear all
          </button>
        </div>
      </div>
    </div>
  );
}

