import React, { useState, useEffect } from 'react';
import { DEPARTMENTS } from '../constants';
import { lookupIsbn, getPriceHint } from '../api/listings';
import { Sparkles, TrendingUp, AlertCircle } from 'lucide-react';

export function ListingForm({ initialValues = {}, onSubmit, isSubmitting = false }) {
  const [formData, setFormData] = useState({
    title: initialValues.title || '',
    author: initialValues.author || '',
    subject: initialValues.subject || '',
    isbn: initialValues.isbn || '',
    courseCode: initialValues.courseCode || '',
    department: initialValues.department || '',
    semester: initialValues.semester || '',
    listingType: initialValues.listingType || 'sell',
    condition: initialValues.condition || 'good',
    price: initialValues.price ?? 100,
    swapFor: initialValues.swapFor || '',
    note: initialValues.note || '',
    coverUrl: initialValues.coverUrl || '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [isbnLoading, setIsbnLoading] = useState(false);
  const [isbnMessage, setIsbnMessage] = useState({ text: '', isError: false });
  const [priceHint, setPriceHint] = useState(null);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseInt(value, 10)) : value,
    }));
  };

  // Debounced Price Hint lookup based on title or isbn
  useEffect(() => {
    if (formData.listingType !== 'sell') {
      setPriceHint(null);
      return;
    }

    if (!formData.isbn && !formData.title) {
      setPriceHint(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const hintRes = await getPriceHint({
          isbn: formData.isbn ? formData.isbn.replace(/[-\s]/g, '') : undefined,
          title: !formData.isbn ? formData.title : undefined,
        });
        if (hintRes?.hint) {
          setPriceHint(hintRes.hint);
        } else {
          setPriceHint(null);
        }
      } catch {
        setPriceHint(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.isbn, formData.title, formData.listingType]);

  const handleIsbnFill = async () => {
    if (!formData.isbn) {
      setIsbnMessage({ text: 'Please enter an ISBN first', isError: true });
      return;
    }

    setIsbnLoading(true);
    setIsbnMessage({ text: '', isError: false });

    try {
      const book = await lookupIsbn(formData.isbn);
      setFormData((prev) => ({
        ...prev,
        title: book.title || prev.title,
        author: book.author || prev.author,
        coverUrl: book.coverUrl || prev.coverUrl,
      }));
      setIsbnMessage({ text: 'Book details populated from Open Library!', isError: false });
    } catch (err) {
      setIsbnMessage({
        text: err.status === 404 ? 'Book not found for this ISBN' : (err.message || 'Lookup failed'),
        isError: true,
      });
    } finally {
      setIsbnLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    const payload = { ...formData };

    if (payload.semester === '' || payload.semester === null) {
      delete payload.semester;
    } else {
      payload.semester = Number(payload.semester);
    }

    if (payload.listingType === 'free') {
      payload.price = 0;
      delete payload.swapFor;
    } else if (payload.listingType === 'swap') {
      payload.price = 0;
    } else if (payload.listingType === 'sell') {
      payload.price = Number(payload.price);
      delete payload.swapFor;
    }

    if (!payload.department) delete payload.department;
    if (!payload.subject) delete payload.subject;
    if (!payload.isbn) delete payload.isbn;
    if (!payload.courseCode) delete payload.courseCode;
    if (!payload.note) delete payload.note;
    if (!payload.coverUrl) delete payload.coverUrl;

    try {
      await onSubmit(payload);
    } catch (err) {
      if (err.errors && Array.isArray(err.errors)) {
        const errorsMap = {};
        for (const errorItem of err.errors) {
          errorsMap[errorItem.field] = errorItem.message;
        }
        setFieldErrors(errorsMap);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      {/* ISBN Autofill Helper */}
      <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-lg">
        <label className="block text-xs font-semibold text-blue-900 mb-1.5 uppercase tracking-wider">
          Fast-Fill via ISBN (Optional)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            name="isbn"
            value={formData.isbn}
            onChange={handleChange}
            placeholder="Enter 10 or 13-digit ISBN (e.g. 9780132350884)"
            className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            type="button"
            onClick={handleIsbnFill}
            disabled={isbnLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isbnLoading ? 'Looking up...' : 'Fill Details'}
          </button>
        </div>

        {isbnMessage.text && (
          <p className={`text-xs mt-2 ${isbnMessage.isError ? 'text-red-600 font-medium' : 'text-emerald-700 font-medium'}`}>
            {isbnMessage.text}
          </p>
        )}
      </div>

      {/* Listing Type Radio Cards */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">Listing Type</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'sell', label: 'Sell', desc: 'Set a price in ₹' },
            { id: 'free', label: 'Give Away', desc: '100% free' },
            { id: 'swap', label: 'Swap', desc: 'Exchange for a book' },
          ].map((item) => (
            <label
              key={item.id}
              className={`flex flex-col p-3 border rounded-lg cursor-pointer transition text-center ${
                formData.listingType === item.id
                  ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500/20'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="listingType"
                value={item.id}
                checked={formData.listingType === item.id}
                onChange={handleChange}
                className="hidden"
              />
              <span className="font-medium text-sm">{item.label}</span>
              <span className="text-xs text-gray-500">{item.desc}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Book Title & Author */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Book Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            maxLength={150}
            placeholder="e.g. Introduction to Algorithms"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
          {fieldErrors.title && <p className="text-xs text-red-600 mt-1">{fieldErrors.title}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Author <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="author"
            value={formData.author}
            onChange={handleChange}
            required
            maxLength={100}
            placeholder="e.g. Thomas H. Cormen"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
          {fieldErrors.author && <p className="text-xs text-red-600 mt-1">{fieldErrors.author}</p>}
        </div>
      </div>

      {/* Pricing / Swap Field */}
      {formData.listingType === 'sell' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price (in ₹) <span className="text-red-500">*</span>
          </label>
          <div className="relative max-w-xs">
            <span className="absolute left-3 top-2 text-gray-500 font-medium">₹</span>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              min={1}
              max={100000}
              required
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          {fieldErrors.price && <p className="text-xs text-red-600 mt-1">{fieldErrors.price}</p>}

          {/* Dynamic Price Hint Line */}
          {priceHint && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100 max-w-md">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                Campus Price Hint: typically ₹{priceHint.average} (ranges between ₹{priceHint.min} – ₹{priceHint.max})
              </span>
            </div>
          )}
        </div>
      )}

      {formData.listingType === 'swap' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Swap For (Book requested) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="swapFor"
            value={formData.swapFor}
            onChange={handleChange}
            required
            maxLength={150}
            placeholder="e.g. Computer Networks by Tanenbaum"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
          {fieldErrors.swapFor && <p className="text-xs text-red-600 mt-1">{fieldErrors.swapFor}</p>}
        </div>
      )}

      {/* Condition & Academic Details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
          <select
            name="condition"
            value={formData.condition}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
          >
            <option value="like new">Like New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <select
            name="department"
            value={formData.department}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
          >
            <option value="">Select department</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
          <select
            name="semester"
            value={formData.semester}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
          >
            <option value="">Select semester</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Optional Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            maxLength={60}
            placeholder="e.g. Data Structures"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Course Code</label>
          <input
            type="text"
            name="courseCode"
            value={formData.courseCode}
            onChange={handleChange}
            maxLength={20}
            placeholder="e.g. CS201"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Seller Note */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Description</label>
        <textarea
          name="note"
          value={formData.note}
          onChange={handleChange}
          rows={3}
          maxLength={500}
          placeholder="Add any specifics about highlights, edition, or pickup details..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition disabled:opacity-50"
        >
          {isSubmitting ? 'Saving Listing...' : 'Publish Listing'}
        </button>
      </div>
    </form>
  );
}
