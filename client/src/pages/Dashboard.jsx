import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSellerDashboard } from '../api/trust';
import {
  BookOpen,
  Eye,
  Inbox,
  CheckCircle2,
  Gift,
  IndianRupee,
  Layers,
  Clock,
  ArrowRight
} from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const res = await getSellerDashboard();
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Seller Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Welcome back, <span className="font-semibold text-gray-800">{user?.name}</span>. Here is the summary of your book trades and campus impact.
          </p>
        </div>

        <Link
          to={`/users/${user?._id}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
        >
          View Public Profile & Ratings
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-500">Loading your seller metrics...</div>
      ) : !data ? (
        <div className="py-20 text-center text-gray-500">Could not load dashboard data</div>
      ) : (
        <>
          {/* Key Metric Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <span className="text-xs font-semibold uppercase">Active Listings</span>
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.activeListings}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <span className="text-xs font-semibold uppercase">Total Views</span>
                <Eye className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.totalViews}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <span className="text-xs font-semibold uppercase">Requests</span>
                <Inbox className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {data.requests?.received || 0}{' '}
                <span className="text-xs font-normal text-amber-600">
                  ({data.requests?.pending || 0} pending)
                </span>
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <span className="text-xs font-semibold uppercase">Books Sold</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.booksSold}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <span className="text-xs font-semibold uppercase">Given Away</span>
                <Gift className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.booksGivenAway}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs bg-emerald-50/40 border-emerald-200/60">
              <div className="flex items-center justify-between text-emerald-700 mb-2">
                <span className="text-xs font-semibold uppercase">Earnings</span>
                <IndianRupee className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-emerald-700">₹{data.earnings}</p>
            </div>
          </div>

          {/* Per Listing Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Recent Listings Performance</h2>
              <Link to="/my-listings" className="text-xs font-semibold text-blue-600 hover:underline">
                Manage All Listings
              </Link>
            </div>

            {(!data.perListing || data.perListing.length === 0) ? (
              <div className="p-8 text-center text-sm text-gray-500">
                You haven't posted any listings yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Title</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 font-semibold">Views</th>
                      <th className="px-6 py-3 font-semibold">Total Requests</th>
                      <th className="px-6 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.perListing.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50/60 transition">
                        <td className="px-6 py-4 font-medium text-gray-900 max-w-xs truncate">
                          {item.title}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                              item.status === 'available'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'reserved'
                                ? 'bg-amber-100 text-amber-800'
                                : item.status === 'sold'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{item.views}</td>
                        <td className="px-6 py-4 text-gray-600">{item.requests}</td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            to={`/listings/${item._id}`}
                            className="text-xs font-semibold text-blue-600 hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
