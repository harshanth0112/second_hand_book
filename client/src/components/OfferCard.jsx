import React from 'react';
import { Tag, Check, X } from 'lucide-react';

export function OfferCard({ message, isSeller, onAction, disabled = false }) {
  const isPending = message.offerStatus === 'pending';

  return (
    <div className="p-3 rounded-lg border bg-amber-50/80 border-amber-200 text-amber-950 text-xs space-y-2 max-w-xs shadow-xs">
      <div className="flex items-center gap-1.5 font-bold text-sm text-amber-900">
        <Tag className="w-4 h-4 text-amber-600" />
        <span>Price Offer: ₹{message.offerAmount}</span>
      </div>

      <div className="text-[11px] text-amber-800">
        Status:{' '}
        <span
          className={`font-semibold capitalize ${
            message.offerStatus === 'accepted'
              ? 'text-emerald-700'
              : message.offerStatus === 'declined'
              ? 'text-red-700'
              : 'text-amber-700'
          }`}
        >
          {message.offerStatus}
        </span>
      </div>

      {isSeller && isPending && (
        <div className="flex gap-2 pt-1 border-t border-amber-200/60">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAction(message._id, 'accept')}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-[11px] transition disabled:opacity-50"
          >
            <Check className="w-3 h-3" />
            Accept
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAction(message._id, 'decline')}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded font-medium text-[11px] transition disabled:opacity-50"
          >
            <X className="w-3 h-3" />
            Decline
          </button>
        </div>
      )}
    </div>
  );
}

