import React from 'react';
import { Shield, Lock, FileText, Database, Trash2, Mail } from 'lucide-react';

export function Privacy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">
          Last updated: November 2026 • Respecting and protecting your campus data
        </p>
      </div>

      <div className="space-y-8 bg-white border border-gray-200 rounded-2xl p-6 sm:p-10 shadow-sm leading-relaxed text-gray-700">
        {/* Section 1 */}
        <section>
          <div className="flex items-center gap-2.5 mb-3">
            <Database className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">1. What Information We Collect</h2>
          </div>
          <p className="text-sm">
            To provide the Campus Book Exchange service, we collect only information essential to coordinating book sharing:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm space-y-1 text-gray-600 pl-2">
            <li><strong>Account profile:</strong> Your name, college email address, academic department, and semester.</li>
            <li><strong>Listings & Photos:</strong> Book titles, authors, course codes, prices, conditions, and textbook images you upload.</li>
            <li><strong>Exchanges & Requests:</strong> Handover requests, agreed meetup points, and dual confirmations.</li>
            <li><strong>Direct Messages:</strong> In-app messages and price offers exchanged with other students.</li>
            <li><strong>Preferences:</strong> Wishlist items, wanted requests, notification settings, and block lists.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section>
          <div className="flex items-center gap-2.5 mb-3">
            <Lock className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">2. Why We Collect It</h2>
          </div>
          <p className="text-sm">
            We use your data solely to operate a safe peer-to-peer textbook marketplace for students:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm space-y-1 text-gray-600 pl-2">
            <li>Matching students looking for required course textbooks with those selling or giving them away.</li>
            <li>Facilitating on-campus meetup scheduling at verified safe zones.</li>
            <li>Sending transactional alerts for requests, offers, price drops, and expiring listings.</li>
            <li>Preventing fraud, harassment, and off-campus commercial spam.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section>
          <div className="flex items-center gap-2.5 mb-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">3. Who Processes Your Data</h2>
          </div>
          <p className="text-sm">
            We never sell or rent your personal information to third parties or advertisers. We rely only on trusted infrastructure providers:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm space-y-1 text-gray-600 pl-2">
            <li><strong>MongoDB Atlas:</strong> Managed database storage located in regional secure cloud facilities.</li>
            <li><strong>Cloudinary:</strong> Content delivery network used to securely store and optimize textbook cover images.</li>
            <li><strong>Google Sign-In:</strong> Optional OAuth provider for secure one-click student login.</li>
            <li><strong>Transactional Email Provider:</strong> Used exclusively to deliver verification links, password resets, and notifications.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section>
          <div className="flex items-center gap-2.5 mb-3">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">4. How Long Data Is Kept</h2>
          </div>
          <p className="text-sm text-gray-600">
            Your data is retained only while your account remains active. When you delete your account, your personal identifiers are immediately removed or anonymized.
          </p>
        </section>

        {/* Section 5 */}
        <section>
          <div className="flex items-center gap-2.5 mb-3">
            <Trash2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">5. How to Export and Delete Your Data</h2>
          </div>
          <p className="text-sm text-gray-600">
            You maintain full ownership of your data at all times:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm space-y-1 text-gray-600 pl-2">
            <li><strong>Export:</strong> Download a complete JSON export of all your listings, chat messages, requests, and reviews directly from your Account Profile settings.</li>
            <li><strong>Self-Service Account Deletion:</strong> You can delete your account at any time from your settings page. Deletion immediately removes your active listings, cancels pending transactions, and permanently scrubs your email, password, and identity.</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2.5 mb-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">6. Contact Our Privacy Team</h2>
          </div>
          <p className="text-sm text-gray-600">
            For questions about your data privacy or student rights on the platform, contact us at{' '}
            <a href="mailto:privacy@bookexchange.campus" className="text-blue-600 hover:underline font-medium">
              privacy@bookexchange.campus
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}

