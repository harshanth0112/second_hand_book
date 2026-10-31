import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Listing } from '../src/models/Listing.js';
import { Request } from '../src/models/Request.js';
import { MeetupPoint } from '../src/models/MeetupPoint.js';
import { seedMeetupPoints } from '../src/seeds/meetupPoints.js';

const app = createApp();

const BASE_USER = {
  name: 'Step5 Tester',
  email: 'step5@college.edu',
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

describe('Step 5: Requests, Reservation, Meetups and Handover', () => {
  let activeMeetupPoint;

  beforeEach(async () => {
    await seedMeetupPoints();
    activeMeetupPoint = await MeetupPoint.findOne({ active: true });
  });

  describe('Create Request (POST /api/listings/:id/requests)', () => {
    it('requesting own listing returns 403', async () => {
      const { user, cookie } = await createVerifiedUser();

      const listing = await Listing.create({
        title: 'Own Book',
        titleNormalized: 'own book',
        author: 'Me',
        department: 'Computer Science',
        listingType: 'sell',
        condition: 'good',
        price: 200,
        seller: user._id,
        status: 'available',
        expiresAt: new Date(Date.now() + 100000),
      });

      const res = await request(app)
        .post(`/api/listings/${listing._id}/requests`)
        .set('Cookie', cookie)
        .send({ message: 'I want my own book' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/own listing/i);
    });

    it('requesting non-available listing returns 409', async () => {
      const { user: seller } = await createVerifiedUser();
      const { cookie: buyerCookie } = await createVerifiedUser();

      const listing = await Listing.create({
        title: 'Reserved Book',
        titleNormalized: 'reserved book',
        author: 'Author',
        department: 'Computer Science',
        listingType: 'sell',
        condition: 'good',
        price: 200,
        seller: seller._id,
        status: 'reserved',
        expiresAt: new Date(Date.now() + 100000),
      });

      const res = await request(app)
        .post(`/api/listings/${listing._id}/requests`)
        .set('Cookie', buyerCookie)
        .send({ message: 'Can I have it?' });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/no longer available/i);
    });

    it('swap listing without offeredBook returns 400', async () => {
      const { user: seller } = await createVerifiedUser();
      const { cookie: buyerCookie } = await createVerifiedUser();

      const listing = await Listing.create({
        title: 'Swap Book',
        titleNormalized: 'swap book',
        author: 'Author',
        department: 'Computer Science',
        listingType: 'swap',
        swapFor: 'Physics Book',
        condition: 'good',
        price: 0,
        seller: seller._id,
        status: 'available',
        expiresAt: new Date(Date.now() + 100000),
      });

      const res = await request(app)
        .post(`/api/listings/${listing._id}/requests`)
        .set('Cookie', buyerCookie)
        .send({ message: 'Swap please' });

      expect(res.status).toBe(400);
      expect(res.body.errors.some((e) => e.field === 'offeredBook')).toBe(true);
    });

    it('creates request and rejects duplicate pending request from same buyer with 409', async () => {
      const { user: seller } = await createVerifiedUser();
      const { cookie: buyerCookie } = await createVerifiedUser();

      const listing = await Listing.create({
        title: 'Available Book',
        titleNormalized: 'available book',
        author: 'Author',
        department: 'Computer Science',
        listingType: 'sell',
        condition: 'good',
        price: 300,
        seller: seller._id,
        status: 'available',
        expiresAt: new Date(Date.now() + 100000),
      });

      const firstRes = await request(app)
        .post(`/api/listings/${listing._id}/requests`)
        .set('Cookie', buyerCookie)
        .send({ message: 'Hello seller' });

      expect(firstRes.status).toBe(201);
      expect(firstRes.body.status).toBe('pending');

      const dupRes = await request(app)
        .post(`/api/listings/${listing._id}/requests`)
        .set('Cookie', buyerCookie)
        .send({ message: 'Second attempt' });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.message).toMatch(/already have a pending request/i);
    });
  });

  describe('Accept Request (PATCH /api/requests/:id action: accept)', () => {
    it('only seller can accept; sets listing to reserved and rejects other pending requests', async () => {
      const { user: seller, cookie: sellerCookie } = await createVerifiedUser();
      const { user: buyerA, cookie: buyerACookie } = await createVerifiedUser();
      const { user: buyerB, cookie: buyerBCookie } = await createVerifiedUser();

      const listing = await Listing.create({
        title: 'Popular Textbook',
        titleNormalized: 'popular textbook',
        author: 'Author',
        department: 'Mathematics',
        listingType: 'sell',
        condition: 'good',
        price: 400,
        seller: seller._id,
        status: 'available',
        expiresAt: new Date(Date.now() + 100000),
      });

      const reqA = await request(app)
        .post(`/api/listings/${listing._id}/requests`)
        .set('Cookie', buyerACookie)
        .send({ message: 'Buyer A' });

      const reqB = await request(app)
        .post(`/api/listings/${listing._id}/requests`)
        .set('Cookie', buyerBCookie)
        .send({ message: 'Buyer B' });

      // Non-seller cannot accept
      const nonSellerAttempt = await request(app)
        .patch(`/api/requests/${reqA.body._id}`)
        .set('Cookie', buyerACookie)
        .send({
          action: 'accept',
          meetupPointId: activeMeetupPoint._id.toString(),
          meetupTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        });
      expect(nonSellerAttempt.status).toBe(403);

      // Seller accepts Buyer A's request
      const acceptRes = await request(app)
        .patch(`/api/requests/${reqA.body._id}`)
        .set('Cookie', sellerCookie)
        .send({
          action: 'accept',
          meetupPointId: activeMeetupPoint._id.toString(),
          meetupTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        });

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.status).toBe('accepted');

      // Listing must now be reserved for Buyer A
      const updatedListing = await Listing.findById(listing._id);
      expect(updatedListing.status).toBe('reserved');
      expect(updatedListing.reservedFor.toString()).toBe(buyerA._id.toString());

      // Buyer B's request must now be rejected automatically
      const updatedReqB = await Request.findById(reqB.body._id);
      expect(updatedReqB.status).toBe('rejected');
    });

    it('rejects past meetupTime or meetupTime > 14 days with 400', async () => {
      const { user: seller, cookie: sellerCookie } = await createVerifiedUser();
      const { cookie: buyerCookie } = await createVerifiedUser();

      const listing = await Listing.create({
        title: 'Math Book',
        titleNormalized: 'math book',
        author: 'Author',
        department: 'Mathematics',
        listingType: 'sell',
        condition: 'good',
        price: 250,
        seller: seller._id,
        status: 'available',
        expiresAt: new Date(Date.now() + 100000),
      });

      const req = await request(app)
        .post(`/api/listings/${listing._id}/requests`)
        .set('Cookie', buyerCookie)
        .send({ message: 'Hi' });

      // Past time
      const pastRes = await request(app)
        .patch(`/api/requests/${req.body._id}`)
        .set('Cookie', sellerCookie)
        .send({
          action: 'accept',
          meetupPointId: activeMeetupPoint._id.toString(),
          meetupTime: new Date(Date.now() - 3600000).toISOString(),
        });
      expect(pastRes.status).toBe(400);

      // > 14 days time
      const farFutureRes = await request(app)
        .patch(`/api/requests/${req.body._id}`)
        .set('Cookie', sellerCookie)
        .send({
          action: 'accept',
          meetupPointId: activeMeetupPoint._id.toString(),
          meetupTime: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        });
      expect(farFutureRes.status).toBe(400);
    });

    it('concurrent acceptance on same listing: exactly one succeeds and the other gets 409', async () => {
      const { user: seller, cookie: sellerCookie } = await createVerifiedUser();
      const { cookie: buyer1Cookie } = await createVerifiedUser();
      const { cookie: buyer2Cookie } = await createVerifiedUser();

      const listing = await Listing.create({
        title: 'Rare Book',
        titleNormalized: 'rare book',
        author: 'Author',
        department: 'Computer Science',
        listingType: 'sell',
        condition: 'like new',
        price: 500,
        seller: seller._id,
        status: 'available',
        expiresAt: new Date(Date.now() + 100000),
      });

      const req1 = await request(app)
        .post(`/api/listings/${listing._id}/requests`)
        .set('Cookie', buyer1Cookie)
        .send({ message: 'Me first' });

      const req2 = await request(app)
        .post(`/api/listings/${listing._id}/requests`)
        .set('Cookie', buyer2Cookie)
        .send({ message: 'No me' });

      const meetupPayload = {
        action: 'accept',
        meetupPointId: activeMeetupPoint._id.toString(),
        meetupTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      // Concurrent accept via Promise.all
      const [res1, res2] = await Promise.all([
        request(app).patch(`/api/requests/${req1.body._id}`).set('Cookie', sellerCookie).send(meetupPayload),
        request(app).patch(`/api/requests/${req2.body._id}`).set('Cookie', sellerCookie).send(meetupPayload),
      ]);

      const statuses = [res1.status, res2.status];
      expect(statuses).toContain(200);
      expect(statuses).toContain(409);

      const inDb = await Listing.findById(listing._id);
      expect(inDb.status).toBe('reserved');
      expect(inDb.reservedFor).not.toBeNull();
    });
  });

  describe('Confirm Handover (PATCH /api/requests/:id action: confirmHandover)', () => {
    it('two confirmations required to complete request and mark listing as sold', async () => {
      const { user: seller, cookie: sellerCookie } = await createVerifiedUser();
      const { user: buyer, cookie: buyerCookie } = await createVerifiedUser();

      const listing = await Listing.create({
        title: 'Handover Book',
        titleNormalized: 'handover book',
        author: 'Author',
        department: 'Civil',
        listingType: 'sell',
        condition: 'good',
        price: 350,
        seller: seller._id,
        status: 'available',
        expiresAt: new Date(Date.now() + 100000),
      });

      const req = await request(app)
        .post(`/api/listings/${listing._id}/requests`)
        .set('Cookie', buyerCookie)
        .send({ message: 'Ready' });

      await request(app)
        .patch(`/api/requests/${req.body._id}`)
        .set('Cookie', sellerCookie)
        .send({
          action: 'accept',
          meetupPointId: activeMeetupPoint._id.toString(),
          meetupTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

      // 1st Confirmation (Seller)
      const conf1 = await request(app)
        .patch(`/api/requests/${req.body._id}`)
        .set('Cookie', sellerCookie)
        .send({ action: 'confirmHandover' });

      expect(conf1.status).toBe(200);
      expect(conf1.body.completed).toBe(false);

      let inDbListing = await Listing.findById(listing._id);
      expect(inDbListing.status).toBe('reserved');
      expect(inDbListing.handoverConfirmedBy.length).toBe(1);

      // Seller confirming twice returns 409
      const dupConf = await request(app)
        .patch(`/api/requests/${req.body._id}`)
        .set('Cookie', sellerCookie)
        .send({ action: 'confirmHandover' });
      expect(dupConf.status).toBe(409);

      // 2nd Confirmation (Buyer) -> Handover completed
      const conf2 = await request(app)
        .patch(`/api/requests/${req.body._id}`)
        .set('Cookie', buyerCookie)
        .send({ action: 'confirmHandover' });

      expect(conf2.status).toBe(200);
      expect(conf2.body.completed).toBe(true);

      inDbListing = await Listing.findById(listing._id);
      expect(inDbListing.status).toBe('sold');
      expect(inDbListing.buyer.toString()).toBe(buyer._id.toString());
      expect(inDbListing.soldAt).not.toBeNull();

      const inDbRequest = await Request.findById(req.body._id);
      expect(inDbRequest.status).toBe('completed');
    });
  });

  describe('Cancel Request', () => {
    it('cancelling an accepted request restores listing to available', async () => {
      const { user: seller, cookie: sellerCookie } = await createVerifiedUser();
      const { cookie: buyerCookie } = await createVerifiedUser();

      const listing = await Listing.create({
        title: 'Cancel Me Book',
        titleNormalized: 'cancel me book',
        author: 'Author',
        department: 'Electronics',
        listingType: 'sell',
        condition: 'good',
        price: 200,
        seller: seller._id,
        status: 'available',
        expiresAt: new Date(Date.now() + 100000),
      });

      const req = await request(app)
        .post(`/api/listings/${listing._id}/requests`)
        .set('Cookie', buyerCookie)
        .send({ message: 'Requesting' });

      await request(app)
        .patch(`/api/requests/${req.body._id}`)
        .set('Cookie', sellerCookie)
        .send({
          action: 'accept',
          meetupPointId: activeMeetupPoint._id.toString(),
          meetupTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

      // Buyer cancels accepted request
      const cancelRes = await request(app)
        .patch(`/api/requests/${req.body._id}`)
        .set('Cookie', buyerCookie)
        .send({ action: 'cancel' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe('cancelled');

      const restoredListing = await Listing.findById(listing._id);
      expect(restoredListing.status).toBe('available');
      expect(restoredListing.reservedFor).toBeNull();
      expect(restoredListing.handoverConfirmedBy.length).toBe(0);
    });
  });
});

