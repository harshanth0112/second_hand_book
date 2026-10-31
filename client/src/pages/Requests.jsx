import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSentRequests, getReceivedRequests, patchRequestAction } from '../api/requests';
import { AcceptRequestModal } from '../components/AcceptRequestModal';
import {
  Inbox,
  Send,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  BookOpen,
} from 'lucide-react';

export function Requests() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'sent'
  const [statusFilter, setStatusFilter] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Accept modal state
  const [acceptingRequest, setAcceptingRequest] = useState(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const fetchFn = activeTab === 'received' ? getReceivedRequests : getSentRequests;
      const res = await fetchFn({ status: statusFilter || undefined });
      setRequests(res.items || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [activeTab, statusFilter]);

  const handleAction = async (requestId, payload) => {
    setSubmittingAction(true);
    try {
      await patchRequestAction(requestId, payload);
      await loadRequests();
    } catch (err) {
      alert(err.message || 'Action failed');
    } finally {
      setSubmittingAction(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: 'bg-amber-100 text-amber-800 border-amber-200',
      accepted: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return (
      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border capitalize ${map[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Book Requests</h1>
        <p className="text-sm text-gray-600 mt-1">Manage textbook purchase requests, meetups, and handovers.</p>
      </div>

      {/* Primary Tab Navigation: Received vs Sent */}
      <div className="flex items-center gap-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => {
            setActiveTab('received');
            setStatusFilter('');
          }}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'received'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Inbox className="w-4 h-4" />
          Received Requests
        </button>

        <button
          onClick={() => {
            setActiveTab('sent');
            setStatusFilter('');
          }}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'sent'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Send className="w-4 h-4" />
          Sent Requests
        </button>
      </div>

      {/* Sub-status Filter Buttons */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 text-xs">
        {['', 'pending', 'accepted', 'completed', 'cancelled', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg capitalize font-medium transition ${
              statusFilter === s
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {s || 'All Statuses'}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-500 text-sm">Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900">No requests found</h3>
          <p className="text-sm text-gray-500 mt-1">
            {activeTab === 'received'
              ? 'You have not received any requests yet.'
              : 'You have not sent any requests yet. Browse the catalog to find textbooks!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((item) => {
            const counterparty = activeTab === 'received' ? item.buyer : item.seller;
            const isSeller = user._id === item.seller?._id;
            const isBuyer = user._id === item.buyer?._id;

            return (
              <div
                key={item._id}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0 border border-blue-200">
                      {counterparty?.name ? counterparty.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 text-sm">
                          {activeTab === 'received' ? `Buyer: ${counterparty?.name}` : `Seller: ${counterparty?.name}`}
                        </span>
                        {getStatusBadge(item.status)}
                      </div>
                      <p className="text-xs text-gray-500">
                        {counterparty?.department ? `${counterparty.department}` : 'Student'} • Requested on{' '}
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Textbook info */}
                  <div className="text-right sm:self-center">
                    <Link
                      to={`/listings/${item.listing?._id}`}
                      className="font-medium text-gray-900 hover:text-blue-600 transition text-sm line-clamp-1"
                    >
                      {item.listing?.title}
                    </Link>
                    <span className="text-xs font-semibold text-gray-700">
                      {item.listing?.listingType === 'free'
                        ? 'Free'
                        : item.listing?.listingType === 'swap'
                        ? 'Swap'
                        : `₹${item.listing?.price}`}
                    </span>
                  </div>
                </div>

                {/* Message and Offered Book */}
                {(item.message || item.offeredBook) && (
                  <div className="py-3 text-xs text-gray-700 space-y-1">
                    {item.offeredBook && (
                      <p>
                        <strong className="text-purple-700">Offered Book to Swap:</strong> {item.offeredBook}
                      </p>
                    )}
                    {item.message && (
                      <p className="text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                        "{item.message}"
                      </p>
                    )}
                  </div>
                )}

                {/* Meetup Details if Accepted */}
                {item.status === 'accepted' && item.meetupPoint && (
                  <div className="my-3 p-3 bg-blue-50/70 border border-blue-100 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-950">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Meetup Point: <strong>{item.meetupPoint.name} ({item.meetupPoint.area})</strong></span>
                    </div>
                    {item.meetupTime && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Scheduled: <strong>{new Date(item.meetupTime).toLocaleString()}</strong></span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Toolbar */}
                <div className="flex items-center justify-end gap-2 pt-3">
                  {/* Seller actions for pending */}
                  {isSeller && item.status === 'pending' && (
                    <>
                      <button
                        onClick={() => setAcceptingRequest(item)}
                        disabled={submittingAction}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Accept & Schedule Meetup
                      </button>
                      <button
                        onClick={() => handleAction(item._id, { action: 'reject' })}
                        disabled={submittingAction}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-gray-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </>
                  )}

                  {/* Buyer action for pending */}
                  {isBuyer && item.status === 'pending' && (
                    <button
                      onClick={() => handleAction(item._id, { action: 'cancel' })}
                      disabled={submittingAction}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-xs font-medium transition"
                    >
                      Cancel Request
                    </button>
                  )}

                  {/* Actions for accepted requests */}
                  {item.status === 'accepted' && (
                    <>
                      <button
                        onClick={() => handleAction(item._id, { action: 'confirmHandover' })}
                        disabled={submittingAction}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirm Handover
                      </button>
                      <button
                        onClick={() => handleAction(item._id, { action: 'cancel' })}
                        disabled={submittingAction}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-xs font-medium transition"
                      >
                        Cancel Reservation
                      </button>
                    </>
                  )}

                  {item.status === 'completed' && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Handover Complete & Book Sold
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Accept Request Modal */}
      {acceptingRequest && (
        <AcceptRequestModal
          request={acceptingRequest}
          isOpen={Boolean(acceptingRequest)}
          onClose={() => setAcceptingRequest(null)}
          onAccept={handleAction}
          accepting={submittingAction}
        />
      )}
    </div>
  );
}

