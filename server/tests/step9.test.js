import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Listing } from '../src/models/Listing.js';
import { Report } from '../src/models/Report.js';
import { Request } from '../src/models/Request.js';
import { Conversation } from '../src/models/Conversation.js';
import { Message } from '../src/models/Message.js';
import { Review } from '../src/models/Review.js';
import { Notification } from '../src/models/Notification.js';
import { runExpiryJob } from '../src/jobs/expiry.js';
import { env } from '../src/config/env.js';

const app = createApp();

const registerUser = async (name, email, password = 'Password123!', role = 'student') => {
  const user = await User.create({
    name,
    email,
    password,
    role,
    department: 'Computer Science',
    emailVerified: true,
    isVerified: true,
    authProviders: ['local'],
    sessionVersion: 0,
  });

  const res = await request(app).post('/api/auth/login').send({ email, password });
  const cookie = res.headers['set-cookie'];
  return { user, cookie };
};

const createListing = async (sellerId, overrides = {}) => {
  return await Listing.create({
    title: 'Operating System Concepts',
    titleNormalized: 'operating system concepts',
    author: 'Silberschatz',
    department: 'Computer Science',
    semester: 4,
    listingType: 'sell',
    condition: 'good',
    price: 350,
    seller: sellerId,
    status: 'available',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    ...overrides,
  });
};

describe('Step 9: Admin, Expiry Job, Privacy, Export and Deletion', () => {
  let admin, adminCookie;
  let admin2, admin2Cookie;
  let student1, student1Cookie;
  let student2, student2Cookie;

  beforeEach(async () => {
    const a1 = await registerUser('Admin Alpha', 'admin1@college.edu', 'Admin1234!', 'admin');
    admin = a1.user;
    adminCookie = a1.cookie;

    const a2 = await registerUser('Admin Beta', 'admin2@college.edu', 'Admin1234!', 'admin');
    admin2 = a2.user;
    admin2Cookie = a2.cookie;

    const s1 = await registerUser('Alice Student', 'alice@college.edu', 'Password123!');
    student1 = s1.user;
    student1Cookie = s1.cookie;

    const s2 = await registerUser('Bob Student', 'bob@college.edu', 'Password123!');
    student2 = s2.user;
    student2Cookie = s2.cookie;
  });

  describe('9.1 Admin Controls', () => {
    it('normal user gets 403 on admin routes', async () => {
      const res = await request(app)
        .get('/api/admin/reports')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });

    it('admin can list and resolve reports', async () => {
      const listing = await createListing(student1._id);

      const report = await Report.create({
        reporter: student2._id,
        targetType: 'listing',
        targetListing: listing._id,
        reason: 'spam',
        details: 'Duplicate listing',
      });

      const listRes = await request(app)
        .get('/api/admin/reports?status=open')
        .set('Cookie', adminCookie);

      expect(listRes.status).toBe(200);
      expect(listRes.body.reports.length).toBe(1);
      expect(listRes.body.reports[0].targetListing.title).toBe('Operating System Concepts');

      const patchRes = await request(app)
        .patch(`/api/admin/reports/${report._id}`)
        .set('Cookie', adminCookie)
        .send({ status: 'resolved' });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.status).toBe('resolved');
    });

    it('admin can remove a listing and seller gets notified', async () => {
      const listing = await createListing(student1._id);

      const delRes = await request(app)
        .delete(`/api/admin/listings/${listing._id}`)
        .set('Cookie', adminCookie);

      expect(delRes.status).toBe(200);

      const updated = await Listing.findById(listing._id);
      expect(updated.status).toBe('removed');

      const notif = await Notification.findOne({
        user: student1._id,
        type: 'listing_removed',
      });
      expect(notif).toBeTruthy();
      expect(notif.message).toContain('removed by an administrator');
    });

    it('admin cannot ban themselves or another admin', async () => {
      // Self ban attempt
      const selfRes = await request(app)
        .patch(`/api/admin/users/${admin._id}/ban`)
        .set('Cookie', adminCookie)
        .send({ banned: true });

      expect(selfRes.status).toBe(400);

      // Other admin ban attempt
      const otherAdminRes = await request(app)
        .patch(`/api/admin/users/${admin2._id}/ban`)
        .set('Cookie', adminCookie)
        .send({ banned: true });

      expect(otherAdminRes.status).toBe(403);
    });

    it('banning a student hides listings and prevents login and session', async () => {
      const l1 = await createListing(student1._id, { title: 'Book 1', titleNormalized: 'book 1' });
      const l2 = await createListing(student1._id, { title: 'Book 2', titleNormalized: 'book 2' });

      const banRes = await request(app)
        .patch(`/api/admin/users/${student1._id}/ban`)
        .set('Cookie', adminCookie)
        .send({ banned: true });

      expect(banRes.status).toBe(200);

      // Listings marked removed
      const checkL1 = await Listing.findById(l1._id);
      const checkL2 = await Listing.findById(l2._id);
      expect(checkL1.status).toBe('removed');
      expect(checkL2.status).toBe('removed');

      // Banned student cannot login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@college.edu', password: 'Password123!' });

      expect(loginRes.status).toBe(403);

      // Existing cookie is rejected
      const meRes = await request(app)
        .get('/api/me')
        .set('Cookie', student1Cookie);

      expect(meRes.status).toBe(403);
    });

    it('admin can create and update meetup points', async () => {
      const createRes = await request(app)
        .post('/api/admin/meetup-points')
        .set('Cookie', adminCookie)
        .send({
          name: 'Main Gate Security Post',
          description: 'Near north gate entrance',
          area: 'North Campus',
          active: true,
        });

      expect(createRes.status).toBe(201);
      const pointId = createRes.body._id;

      const patchRes = await request(app)
        .patch(`/api/admin/meetup-points/${pointId}`)
        .set('Cookie', adminCookie)
        .send({ active: false });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.active).toBe(false);
    });
  });

  describe('9.2 Jobs (Expiry and Reminder)', () => {
    it('marks due listings expired and sends reminders once', async () => {
      const now = Date.now();

      // Expired listing (expires in the past)
      const pastListing = await createListing(student1._id, {
        title: 'Old Book',
        titleNormalized: 'old book',
        expiresAt: new Date(now - 10000),
      });

      // Listing expiring in 6.5 days (between 6 and 7 days)
      const expiringListing = await createListing(student1._id, {
        title: 'Expiring Book',
        titleNormalized: 'expiring book',
        expiresAt: new Date(now + 6.5 * 24 * 60 * 60 * 1000),
      });

      // Listing expiring in 20 days (not due)
      const futureListing = await createListing(student1._id, {
        title: 'Fresh Book',
        titleNormalized: 'fresh book',
        expiresAt: new Date(now + 20 * 24 * 60 * 60 * 1000),
      });

      // First run
      const run1 = await runExpiryJob();
      expect(run1.expiredCount).toBe(1);
      expect(run1.remindersSent).toBe(1);

      const checkPast = await Listing.findById(pastListing._id);
      expect(checkPast.status).toBe('expired');

      const checkExpiring = await Listing.findById(expiringListing._id);
      expect(checkExpiring.status).toBe('available');
      expect(checkExpiring.reminderSentAt).toBeTruthy();

      const notifCount1 = await Notification.countDocuments({
        user: student1._id,
        type: 'listing_expiring',
      });
      expect(notifCount1).toBe(1);

      // Second run: must be idempotent (no extra reminders or expiries)
      const run2 = await runExpiryJob();
      expect(run2.expiredCount).toBe(0);
      expect(run2.remindersSent).toBe(0);

      const notifCount2 = await Notification.countDocuments({
        user: student1._id,
        type: 'listing_expiring',
      });
      expect(notifCount2).toBe(1);
    });
  });

  describe('9.3 Export and Deletion', () => {
    it('GET /api/me/export returns user data without hashes or sensitive secrets', async () => {
      await createListing(student1._id);

      const exportRes = await request(app)
        .get('/api/me/export')
        .set('Cookie', student1Cookie);

      expect(exportRes.status).toBe(200);
      expect(exportRes.body.profile).toBeTruthy();
      expect(exportRes.body.profile.email).toBe('alice@college.edu');
      expect(exportRes.body.listings.length).toBe(1);

      // Ensure no passwords or hashes leak
      const stringified = JSON.stringify(exportRes.body);
      expect(stringified).not.toContain('passwordResetTokenHash');
      expect(stringified).not.toContain('emailVerificationTokenHash');
      expect(stringified).not.toContain('Password123!');
      expect(exportRes.body.profile.password).toBeUndefined();
    });

    it('DELETE /api/me requires confirm: "DELETE" and valid password', async () => {
      // Wrong confirmation
      const res1 = await request(app)
        .delete('/api/me')
        .set('Cookie', student1Cookie)
        .send({ confirm: 'delete', password: 'Password123!' });

      expect(res1.status).toBe(400);

      // Wrong password
      const res2 = await request(app)
        .delete('/api/me')
        .set('Cookie', student1Cookie)
        .send({ confirm: 'DELETE', password: 'WrongPassword' });

      expect(res2.status).toBe(401);
    });

    it('DELETE /api/me anonymizes user, cancels requests, removes listings, and blocks login', async () => {
      // Alice creates a listing
      const aliceListing = await createListing(student1._id);

      // Bob creates a listing and Alice requests it
      const bobListing = await createListing(student2._id, {
        title: 'Bob Book',
        titleNormalized: 'bob book',
        status: 'reserved',
        reservedFor: student1._id,
      });

      const aliceReq = await Request.create({
        listing: bobListing._id,
        seller: student2._id,
        buyer: student1._id,
        status: 'accepted',
      });

      // Alice deletes her account
      const delRes = await request(app)
        .delete('/api/me')
        .set('Cookie', student1Cookie)
        .send({ confirm: 'DELETE', password: 'Password123!' });

      expect(delRes.status).toBe(200);
      expect(delRes.body.message).toContain('Account deleted successfully');

      // Alice's own listing is removed
      const checkAliceListing = await Listing.findById(aliceListing._id);
      expect(checkAliceListing.status).toBe('removed');

      // Bob's listing is restored to available
      const checkBobListing = await Listing.findById(bobListing._id);
      expect(checkBobListing.status).toBe('available');
      expect(checkBobListing.reservedFor).toBeNull();

      // Alice's request is cancelled
      const checkReq = await Request.findById(aliceReq._id);
      expect(checkReq.status).toBe('cancelled');

      // Bob got a cancellation notification
      const bobNotif = await Notification.findOne({
        user: student2._id,
        type: 'request_cancelled',
      });
      expect(bobNotif).toBeTruthy();

      // Alice document is anonymized
      const aliceUser = await User.findById(student1._id);
      expect(aliceUser.name).toBe('Deleted user');
      expect(aliceUser.email).toBe(`deleted-${student1._id}@invalid`);
      expect(aliceUser.deletedAt).toBeTruthy();
      expect(aliceUser.password).toBeNull();

      // Alice cannot log in
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@college.edu', password: 'Password123!' });

      expect(loginRes.status).toBe(401);

      // Old cookie is rejected
      const oldSessionRes = await request(app)
        .get('/api/me')
        .set('Cookie', student1Cookie);

      expect(oldSessionRes.status).toBe(401);
    });
  });
});
