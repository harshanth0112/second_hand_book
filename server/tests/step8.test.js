import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Listing } from '../src/models/Listing.js';
import { Request } from '../src/models/Request.js';
import { Review } from '../src/models/Review.js';
import { Report } from '../src/models/Report.js';

const app = createApp();

const BASE_USER = {
  name: 'Step8 Tester',
  email: 'step8@college.edu',
  password: 'Password123!',
  college: 'Engineering College',
  department: 'Computer Science',
};

async function createVerifiedUser(overrides = {}) {
  const email = overrides.email || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@college.edu`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ ...BASE_USER, email, ...overrides });

  const cookie = res.headers['set-cookie'];
  await User.updateOne({ email }, { emailVerified: true });
  const user = await User.findOne({ email });
  return { user, cookie };
}

async function createListingHelper(sellerId, overrides = {}) {
  return Listing.create({
    title: 'Test Book',
    titleNormalized: 'test book',
    author: 'Tester',
    department: 'Computer Science',
    listingType: 'sell',
    condition: 'good',
    price: 300,
    seller: sellerId,
    status: 'available',
    expiresAt: new Date(Date.now() + 1000000),
    ...overrides,
  });
}

describe('Step 8: Reviews, Reports, Blocking and Seller Dashboard', () => {
  describe('Reviews (POST /api/reviews & GET /api/users/:id/reviews)', () => {
    it('only buyer of completed request can review; duplicate review returns 409', async () => {
      const { user: seller } = await createVerifiedUser();
      const { user: buyer, cookie: buyerCookie } = await createVerifiedUser();
      const { user: stranger, cookie: strangerCookie } = await createVerifiedUser();

      const listing = await createListingHelper(seller._id, {
        title: 'Review Test Book',
        titleNormalized: 'review test book',
        status: 'sold',
        buyer: buyer._id,
      });

      const req = await Request.create({
        listing: listing._id,
        seller: seller._id,
        buyer: buyer._id,
        status: 'completed',
      });

      // Stranger trying to review returns 403
      await request(app)
        .post('/api/reviews')
        .set('Cookie', strangerCookie)
        .send({
          requestId: req._id.toString(),
          rating: 5,
          comment: 'Great seller!',
        })
        .expect(403);

      // Buyer review succeeds with 201
      const revRes = await request(app)
        .post('/api/reviews')
        .set('Cookie', buyerCookie)
        .send({
          requestId: req._id.toString(),
          rating: 5,
          comment: 'Smooth handover, book in great condition!',
        })
        .expect(201);

      expect(revRes.body.rating).toBe(5);
      expect(revRes.body.comment).toBe('Smooth handover, book in great condition!');

      // Second review returns 409
      await request(app)
        .post('/api/reviews')
        .set('Cookie', buyerCookie)
        .send({
          requestId: req._id.toString(),
          rating: 4,
        })
        .expect(409);

      // Public profile includes ratingAverage & ratingCount
      const profileRes = await request(app)
        .get(`/api/users/${seller._id}`)
        .expect(200);

      expect(profileRes.body.ratingAverage).toBe(5);
      expect(profileRes.body.ratingCount).toBe(1);

      // Get reviews pagination
      const listRes = await request(app)
        .get(`/api/users/${seller._id}/reviews`)
        .expect(200);

      expect(listRes.body.items.length).toBe(1);
      expect(listRes.body.total).toBe(1);
    });

    it('rejects review on incomplete request with 409', async () => {
      const { user: seller } = await createVerifiedUser();
      const { user: buyer, cookie: buyerCookie } = await createVerifiedUser();

      const listing = await createListingHelper(seller._id, {
        title: 'Pending Book',
        titleNormalized: 'pending book',
        price: 200,
        status: 'reserved',
      });

      const req = await Request.create({
        listing: listing._id,
        seller: seller._id,
        buyer: buyer._id,
        status: 'accepted',
      });

      await request(app)
        .post('/api/reviews')
        .set('Cookie', buyerCookie)
        .send({
          requestId: req._id.toString(),
          rating: 4,
        })
        .expect(409);
    });
  });

  describe('Reports (POST /api/listings/:id/report & POST /api/users/:id/report)', () => {
    it('reporting own listing returns 400; duplicate open report returns 409', async () => {
      const { user: seller, cookie: sellerCookie } = await createVerifiedUser();
      const { user: reporter, cookie: reporterCookie } = await createVerifiedUser();

      const listing = await createListingHelper(seller._id, {
        title: 'Report Test Book',
        titleNormalized: 'report test book',
        price: 150,
      });

      // Own listing report
      await request(app)
        .post(`/api/listings/${listing._id}/report`)
        .set('Cookie', sellerCookie)
        .send({ reason: 'spam' })
        .expect(400);

      // Reporter reports listing
      await request(app)
        .post(`/api/listings/${listing._id}/report`)
        .set('Cookie', reporterCookie)
        .send({ reason: 'spam', details: 'Advertises external Telegram group' })
        .expect(201);

      // Duplicate report returns 409
      await request(app)
        .post(`/api/listings/${listing._id}/report`)
        .set('Cookie', reporterCookie)
        .send({ reason: 'spam' })
        .expect(409);
    });

    it('reporting user works and prevents self-reporting', async () => {
      const { user, cookie } = await createVerifiedUser();
      const { user: otherUser } = await createVerifiedUser();

      // Self-report
      await request(app)
        .post(`/api/users/${user._id}/report`)
        .set('Cookie', cookie)
        .send({ reason: 'harassment' })
        .expect(400);

      // Report other user
      await request(app)
        .post(`/api/users/${otherUser._id}/report`)
        .set('Cookie', cookie)
        .send({ reason: 'harassment', details: 'Rude language' })
        .expect(201);
    });
  });

  describe('Blocking (POST & DELETE /api/users/:id/block)', () => {
    it('blocked user listings disappear from search and actions are refused', async () => {
      const { user: seller } = await createVerifiedUser();
      const { user: buyer, cookie: buyerCookie } = await createVerifiedUser();

      const listing = await createListingHelper(seller._id, {
        title: 'Calculus Early Transcendentals',
        titleNormalized: 'calculus early transcendentals',
        author: 'Stewart',
        department: 'Mathematics',
        price: 450,
      });

      // Search before block shows the listing
      const res1 = await request(app)
        .get('/api/listings?q=Calculus')
        .set('Cookie', buyerCookie)
        .expect(200);

      expect(res1.body.items.length).toBe(1);

      // Buyer blocks seller
      await request(app)
        .post(`/api/users/${seller._id}/block`)
        .set('Cookie', buyerCookie)
        .expect(200);

      // Search after block excludes seller's listing
      const res2 = await request(app)
        .get('/api/listings?q=Calculus')
        .set('Cookie', buyerCookie)
        .expect(200);

      expect(res2.body.items.length).toBe(0);

      // Sending a request is refused with 403
      await request(app)
        .post(`/api/listings/${listing._id}/requests`)
        .set('Cookie', buyerCookie)
        .send({ message: 'Can I get this?' })
        .expect(403);

      // Starting a chat is refused with 403
      await request(app)
        .post('/api/conversations')
        .set('Cookie', buyerCookie)
        .send({ listingId: listing._id.toString() })
        .expect(403);

      // Unblock restores search visibility
      await request(app)
        .delete(`/api/users/${seller._id}/block`)
        .set('Cookie', buyerCookie)
        .expect(200);

      const res3 = await request(app)
        .get('/api/listings?q=Calculus')
        .set('Cookie', buyerCookie)
        .expect(200);

      expect(res3.body.items.length).toBe(1);
    });
  });

  describe('Seller Dashboard (GET /api/me/dashboard)', () => {
    it('aggregates stats and calculates earnings correctly including agreedPrice', async () => {
      const { user: seller, cookie: sellerCookie } = await createVerifiedUser();
      const { user: buyer } = await createVerifiedUser();

      // 1 available listing with 20 views
      await createListingHelper(seller._id, {
        title: 'Active Book 1',
        titleNormalized: 'active book 1',
        price: 250,
        views: 20,
      });

      // 1 sold sell listing with agreedPrice = 400 (original 500)
      const soldListing1 = await createListingHelper(seller._id, {
        title: 'Sold Book 1',
        titleNormalized: 'sold book 1',
        price: 500,
        status: 'sold',
        views: 15,
        buyer: buyer._id,
      });

      await Request.create({
        listing: soldListing1._id,
        seller: seller._id,
        buyer: buyer._id,
        status: 'completed',
        agreedPrice: 400,
      });

      // 1 sold free listing
      const freeListing = await createListingHelper(seller._id, {
        title: 'Free Book',
        titleNormalized: 'free book',
        listingType: 'free',
        price: 0,
        status: 'sold',
        views: 10,
        buyer: buyer._id,
      });

      await Request.create({
        listing: freeListing._id,
        seller: seller._id,
        buyer: buyer._id,
        status: 'completed',
      });

      const dashRes = await request(app)
        .get('/api/me/dashboard')
        .set('Cookie', sellerCookie)
        .expect(200);

      expect(dashRes.body.activeListings).toBe(1);
      expect(dashRes.body.totalViews).toBe(45);
      expect(dashRes.body.booksSold).toBe(1);
      expect(dashRes.body.booksGivenAway).toBe(1);
      expect(dashRes.body.earnings).toBe(400);
      expect(dashRes.body.requests.received).toBe(2);
      expect(dashRes.body.requests.pending).toBe(0);
      expect(dashRes.body.perListing.length).toBe(3);
    });
  });
});
