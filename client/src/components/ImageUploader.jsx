import React, { useState } from 'react';
import { Upload, X, AlertCircle } from 'lucide-react';

const MAX_FILES = 4;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ImageUploader({
  existingImages = [],
  onUpload,
  onRemoveExisting,
  uploading = false,
  onFilesSelected,
}) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState('');

  const totalImagesCount = existingImages.length + selectedFiles.length;

  const handleFileChange = (e) => {
    setError('');
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (existingImages.length + selectedFiles.length + files.length > MAX_FILES) {
      setError(`A listing can have at most ${MAX_FILES} images in total.`);
      return;
    }

    const validFiles = [];
    const newPreviews = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Only JPEG, PNG and WebP images are allowed.');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" exceeds the 2 MB maximum size.`);
        return;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    const updatedFiles = [...selectedFiles, ...validFiles];
    setSelectedFiles(updatedFiles);
    setPreviews((prev) => [...prev, ...newPreviews]);
    if (onFilesSelected) {
      onFilesSelected(updatedFiles);
    }
  };

  const removeSelected = (idx) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== idx);
    setSelectedFiles(updatedFiles);
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
    if (onFilesSelected) {
      onFilesSelected(updatedFiles);
    }
  };

  const handleUploadClick = async () => {
    if (!selectedFiles.length) return;
    try {
      setError('');
      await onUpload(selectedFiles);
      setSelectedFiles([]);
      setPreviews([]);
    } catch (err) {
      setError(err.message || 'Failed to upload images');
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Photos (up to 4 images, max 2 MB each)
      </label>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of images (existing + newly selected) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {existingImages.map((imgItem, idx) => {
          const url = typeof imgItem === 'object' && imgItem?.url ? imgItem.url : imgItem;
          return (
            <div key={`existing-${idx}`} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              <img src={url} alt={`Listing photo ${idx + 1}`} className="w-full h-full object-cover" />
              {onRemoveExisting && (
                <button
                  type="button"
                  onClick={() => onRemoveExisting(idx)}
                  className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition"
                  title="Remove photo"
                  aria-label="Remove photo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}

        {previews.map((previewUrl, idx) => (
          <div key={`preview-${idx}`} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-dashed border-blue-300 bg-blue-50/30">
            <img src={previewUrl} alt="Pending preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeSelected(idx)}
              className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 transition"
              title="Cancel selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {totalImagesCount < MAX_FILES && (
          <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50/20 rounded-lg cursor-pointer transition p-2 text-center">
            <Upload className="w-6 h-6 text-gray-400 mb-1" />
            <span className="text-xs font-medium text-gray-600">Add Photo</span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        )}
      </div>

      {selectedFiles.length > 0 && onUpload && (
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={uploading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 transition shadow-sm"
        >
          {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} New Photo${selectedFiles.length > 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  );
}

