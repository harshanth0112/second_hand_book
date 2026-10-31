import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ListingForm } from '../components/ListingForm';
import { ImageUploader } from '../components/ImageUploader';
import { getListing, updateListing, uploadListingImages, removeListingImage } from '../api/listings';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export function EditListing() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const data = await getListing(id);
        if (!isMounted) return;

        // Must be the owner to edit
        if (data.seller._id !== user._id) {
          navigate('/my-listings');
          return;
        }

        setListing(data);
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load listing');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [id, user._id, navigate]);

  const handleSubmit = async (formData) => {
    setError('');
    setIsSubmitting(true);
    try {
      const updated = await updateListing(id, formData);
      navigate(`/listings/${updated._id}`);
    } catch (err) {
      setError(err.message || 'Failed to update listing');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadImages = async (files) => {
    setUploadingImages(true);
    try {
      const updated = await uploadListingImages(id, files);
      setListing(updated);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = async (index) => {
    try {
      const updated = await removeListingImage(id, index);
      setListing(updated);
    } catch (err) {
      setError(err.message || 'Failed to remove image');
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-gray-500">
        Loading listing details...
      </div>
    );
  }

  if (error && !listing) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/my-listings')}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to My Listings
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Listing</h1>
        <p className="text-sm text-gray-600 mt-1">Update book details or photos.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Image Uploader & Management */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
        <ImageUploader
          existingImages={listing?.images || []}
          onUpload={handleUploadImages}
          onRemoveExisting={handleRemoveImage}
          uploading={uploadingImages}
        />
      </div>

      {/* Main Listing Details Form */}
      <ListingForm
        initialValues={listing}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

