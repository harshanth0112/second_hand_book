import React, { useState, useEffect } from 'react';
import { X, Check, ShieldCheck, MapPin, Calendar } from 'lucide-react';
import { getMeetupPoints } from '../api/requests';

export function AcceptRequestModal({ request, isOpen, onClose, onAccept, accepting = false }) {
  const [points, setPoints] = useState([]);
  const [selectedPointId, setSelectedPointId] = useState('');
  const [meetupTime, setMeetupTime] = useState('');
  const [error, setError] = useState('');
  const [loadingPoints, setLoadingPoints] = useState(false);

  useEffect(() => {
    if (!isOpen || !request) return undefined;

    let cancelled = false;

    setPoints([]);
    setSelectedPointId('');
    setError('');
    setLoadingPoints(true);

    async function loadPoints() {
      try {
        const data = await getMeetupPoints();
        if (cancelled) return;

        const availablePoints = Array.isArray(data) ? data : [];
        setPoints(availablePoints);
        setSelectedPointId(availablePoints[0]?._id || '');

        if (availablePoints.length === 0) {
          setError('No active campus meetup points are available.');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load meetup points');
        }
      } finally {
        if (!cancelled) setLoadingPoints(false);
      }
    }

    loadPoints();

    // Default meetup time: tomorrow at 2:00 PM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setMeetupTime(localIso);

    return () => {
      cancelled = true;
    };
  }, [isOpen, request]);

  if (!isOpen || !request) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedPointId) {
      setError('Please choose a campus meetup point.');
      return;
    }

    const chosenDate = new Date(meetupTime);
    const maxFuture = Date.now() + 14 * 24 * 60 * 60 * 1000;
    if (
      Number.isNaN(chosenDate.getTime()) ||
      chosenDate.getTime() <= Date.now() ||
      chosenDate.getTime() > maxFuture
    ) {
      setError('Choose a future date within the next 14 days.');
      return;
    }

    try {
      const success = await onAccept(request._id, {
        action: 'accept',
        meetupPointId: selectedPointId,
        meetupTime: chosenDate.toISOString(),
      });
      if (success) {
        onClose();
      } else {
        setError('Failed to accept request. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Failed to accept request');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200 relative animate-in fade-in duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
          aria-label="Close modal"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-1">Accept Request & Arrange Meetup</h2>
        <p className="text-xs text-gray-500 mb-4">
          Buyer: <span className="font-semibold text-gray-800">{request.buyer?.name}</span> for{' '}
          <span className="font-semibold text-gray-800">{request.listing?.title}</span>
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              Campus Meetup Location
            </label>
            <select
              value={selectedPointId}
              onChange={(e) => setSelectedPointId(e.target.value)}
              disabled={loadingPoints || points.length === 0}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              {points.length === 0 && (
                <option value="">
                  {loadingPoints ? 'Loading meetup points...' : 'No meetup points available'}
                </option>
              )}
              {points.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.area})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Meetup Date & Time (Within 14 Days)
            </label>
            <input
              type="datetime-local"
              value={meetupTime}
              onChange={(e) => setMeetupTime(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Safety Tips Banner */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 leading-relaxed">
              <strong>Campus Safety Tip:</strong> Always meet at designated campus locations during daylight or busy hours. Inspect the textbook condition in person before confirming the handover.
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={accepting || loadingPoints || points.length === 0 || !selectedPointId}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {accepting ? 'Reserving...' : 'Accept & Reserve Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
