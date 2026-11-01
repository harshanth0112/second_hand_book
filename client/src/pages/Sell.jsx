import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ListingForm } from '../components/ListingForm';
import { ImageUploader } from '../components/ImageUploader';
import { createListing, uploadListingImages } from '../api/listings';
import { AlertCircle } from 'lucide-react';

export function Sell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);

  const handleSubmit = async (formData) => {
    setError('');
    setIsSubmitting(true);
    try {
      const created = await createListing(formData);

      // If user selected photos, upload them right after listing creation
      if (selectedPhotos.length > 0) {
        try {
          await uploadListingImages(created._id, selectedPhotos);
        } catch (uploadErr) {
          console.error('Failed to upload photos for listing:', uploadErr);
          // Still proceed to listing page even if photo upload failed
        }
      }

      navigate(`/listings/${created._id}`);
    } catch (err) {
      setError(err.message || 'Failed to create listing');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user.emailVerified) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
          <h2 className="text-lg font-semibold text-amber-900">Email Verification Required</h2>
          <p className="text-sm text-amber-700 max-w-md mx-auto">
            You must verify your college email address before listing books for sale or swap.
            Check your inbox for the verification link or use the resend button above.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">List a Textbook</h1>
        <p className="text-sm text-gray-600 mt-1">
          Share or sell books with fellow students on your campus.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Book Photos Uploader */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
        <ImageUploader
          existingImages={[]}
          onFilesSelected={setSelectedPhotos}
          uploading={isSubmitting}
        />
      </div>

      <ListingForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}

