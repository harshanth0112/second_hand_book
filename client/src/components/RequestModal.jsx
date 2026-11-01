import React, { useState } from 'react';
import { X, Send } from 'lucide-react';

export function RequestModal({ listing, isOpen, onClose, onSubmit, submitting = false }) {
  if (!isOpen || !listing) return null;

  const [message, setMessage] = useState('');
  const [offeredBook, setOfferedBook] = useState('');
  const [error, setError] = useState('');

  const isSwap = listing.listingType === 'swap';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isSwap && !offeredBook.trim()) {
      setError('Please specify which book you are offering to swap.');
      return;
    }

    try {
      await onSubmit({
        message: message.trim(),
        offeredBook: isSwap ? offeredBook.trim() : undefined,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit request');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200 relative animate-in fade-in duration-200 motion-reduce:animate-none">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
          aria-label="Close modal"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-1">Request This Textbook</h2>
        <p className="text-xs text-gray-500 mb-4 line-clamp-1">
          {listing.title} by {listing.author}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSwap && (
            <div>
              <label htmlFor="request-offered-book" className="block text-xs font-semibold text-gray-800 mb-1">
                Your Offered Book <span className="text-red-500">*</span>
              </label>
              <input
                id="request-offered-book"
                type="text"
                value={offeredBook}
                onChange={(e) => setOfferedBook(e.target.value)}
                placeholder="e.g. Operating System Concepts 9th Ed."
                maxLength={150}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          )}

          <div>
            <label htmlFor="request-message" className="block text-xs font-semibold text-gray-800 mb-1">
              Note to Seller (Optional)
            </label>
            <textarea
              id="request-message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Let the seller know when you are free to meet up on campus..."
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
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
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Sending Request...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
