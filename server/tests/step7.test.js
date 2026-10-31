import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Listing } from '../src/models/Listing.js';
import { Wanted } from '../src/models/Wanted.js';
import { Notification } from '../src/models/Notification.js';

const app = createApp();

const BASE_USER = {
  name: 'Step7 Tester',
  email: 'step7@college.edu',
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
  await User.updateOne({ email }, { emailVerified: true, emailNotifications: true });
  const user = await User.findOne({ email });
  return { user, cookie };
}

describe('Step 7: Wishlist, Wanted list, Notifications and Email', () => {
  describe('Wishlist', () => {
    it('allows authenticated users to add, list, and remove listings from wishlist', async () => {
      const { user, cookie } = await createVerifiedUser();
      const { user: seller } = await createVerifiedUser();

      const listing = await Listing.create({
        title: 'Discrete Math',
        titleNormalized: 'discrete math',
        author: 'Rosen',
        department: 'Computer Science',
        listingType: 'sell',
        condition: 'good',
        price: 300,
        seller: seller._id,
        status: 'available',
        expiresAt: new Date(Date.now() + 100000),
      });

      // Add to wishlist
      const addRes = await request(app)
        .post(`/api/me/wishlist/${listing._id}`)
        .set('Cookie', cookie)
        .expect(200);

      expect(addRes.body.ok).toBe(true);
      expect(addRes.body.data.length).toBe(1);

      // Verify in DB
      const userInDb = await User.findById(user._id);
      expect(userInDb.wishlist.map(id => id.toString())).toContain(listing._id.toString());

      // Get wishlist
      const getRes = await request(app)
        .get('/api/me/wishlist')
        .set('Cookie', cookie)
        .expect(200);

      expect(getRes.body.ok).toBe(true);
      expect(getRes.body.data.length).toBe(1);
      expect(getRes.body.data[0]._id.toString()).toBe(listing._id.toString());

      // Remove from wishlist
      const removeRes = await request(app)
        .delete(`/api/me/wishlist/${listing._id}`)
        .set('Cookie', cookie)
        .expect(200);

      expect(removeRes.body.ok).toBe(true);
      expect(removeRes.body.data.length).toBe(0);

      const userAfterRemove = await User.findById(user._id);
      expect(userAfterRemove.wishlist.length).toBe(0);
    });

    it('returns 404 when adding non-existent listing to wishlist', async () => {
      const { cookie } = await createVerifiedUser();

      await request(app)
        .post('/api/me/wishlist/507f1f77bcf86cd799439011')
        .set('Cookie', cookie)
        .expect(404);
    });
  });

  describe('Price Drop Notifications', () => {
    it('notifies wishlisted users when listing price decreases', async () => {
      const { user: seller, cookie: sellerCookie } = await createVerifiedUser();
      const { user: buyer, cookie: buyerCookie } = await createVerifiedUser();

      const listing = await Listing.create({
        title: 'Operating System Concepts',
        titleNormalized: 'operating system concepts',
        author: 'Silberschatz',
        department: 'Computer Science',
        listingType: 'sell',
        condition: 'good',
        price: 500,
        seller: seller._id,
        status: 'available',
        expiresAt: new Date(Date.now() + 100000),
      });

      // Buyer adds to wishlist
      await request(app)
        .post(`/api/me/wishlist/${listing._id}`)
        .set('Cookie', buyerCookie)
        .expect(200);

      // Seller lowers price to 350
      const updateRes = await request(app)
        .put(`/api/listings/${listing._id}`)
        .set('Cookie', sellerCookie)
        .send({
          title: 'Operating System Concepts',
          author: 'Silberschatz',
          subject: 'Computer Science',
          department: 'Computer Science',
          condition: 'good',
          listingType: 'sell',
          price: 350
        })
        .expect(200);

      expect(updateRes.body.price).toBe(350);

      // Buyer should have a price_drop notification
      await new Promise((r) => setTimeout(r, 100));

      const buyerNotifs = await Notification.find({ user: buyer._id });
      expect(buyerNotifs.length).toBe(1);
      expect(buyerNotifs[0].type).toBe('price_drop');
      expect(buyerNotifs[0].message).toContain('Price dropped for "Operating System Concepts" from $500 to $350');
    });
  });

  describe('Wanted List & Matching', () => {
    it('enforces max 10 active wanted items per user', async () => {
      const { user, cookie } = await createVerifiedUser();

      // Create 10 items
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/wanted')
          .set('Cookie', cookie)
          .send({ title: `Book ${i}`, department: 'Computer Science' })
          .expect(201);
      }

      // 11th creation attempt should fail with 400
      const failedRes = await request(app)
        .post('/api/wanted')
        .set('Cookie', cookie)
        .send({ title: 'Book 11' })
        .expect(400);

      expect(failedRes.body.message).toContain('more than 10');
    });

    it('matches newly created listing with active wanted request and notifies user', async () => {
      const { user: buyer, cookie: buyerCookie } = await createVerifiedUser();
      const { user: seller, cookie: sellerCookie } = await createVerifiedUser();

      // Buyer posts wanted for "Algorithms"
      await request(app)
        .post('/api/wanted')
        .set('Cookie', buyerCookie)
        .send({ title: 'Algorithms', department: 'Computer Science', maxPrice: 400 })
        .expect(201);

      // Seller creates listing matching "Introduction to Algorithms"
      await request(app)
        .post('/api/listings')
        .set('Cookie', sellerCookie)
        .send({
          title: 'Algorithms 4th Edition',
          author: 'Sedgewick',
          subject: 'Computer Science',
          department: 'Computer Science',
          condition: 'good',
          listingType: 'sell',
          price: 300
        })
        .expect(201);

      // Allow async matching to execute
      await new Promise((r) => setTimeout(r, 100));

      const buyerNotifs = await Notification.find({ user: buyer._id });
      expect(buyerNotifs.length).toBe(1);
      expect(buyerNotifs[0].type).toBe('wanted_match');
      expect(buyerNotifs[0].message).toContain('matching your wanted request');
    });

    it('can list and delete a wanted item', async () => {
      const { user, cookie } = await createVerifiedUser();

      const createRes = await request(app)
        .post('/api/wanted')
        .set('Cookie', cookie)
        .send({ title: 'Linear Algebra', department: 'Mathematics' })
        .expect(201);

      const wantedId = createRes.body.data._id;

      const listRes = await request(app)
        .get('/api/wanted')
        .set('Cookie', cookie)
        .expect(200);

      expect(listRes.body.data.length).toBe(1);
      expect(listRes.body.data[0]._id.toString()).toBe(wantedId.toString());

      await request(app)
        .delete(`/api/wanted/${wantedId}`)
        .set('Cookie', cookie)
        .expect(200);

      const count = await Wanted.countDocuments({ user: user._id });
      expect(count).toBe(0);
    });
  });

  describe('Notifications inbox', () => {
    it('allows querying, filtering unread, and marking notifications as read', async () => {
      const { user, cookie } = await createVerifiedUser();

      const n1 = await Notification.create({
        user: user._id,
        type: 'request_received',
        message: 'Notification 1',
        read: false
      });
      const n2 = await Notification.create({
        user: user._id,
        type: 'request_accepted',
        message: 'Notification 2',
        read: false
      });

      // Get inbox
      const getRes = await request(app)
        .get('/api/notifications')
        .set('Cookie', cookie)
        .expect(200);

      expect(getRes.body.ok).toBe(true);
      expect(getRes.body.data.length).toBe(2);
      expect(getRes.body.unreadCount).toBe(2);

      // Mark single notification read
      await request(app)
        .patch(`/api/notifications/${n1._id}`)
        .set('Cookie', cookie)
        .send({ read: true })
        .expect(200);

      const unreadRes = await request(app)
        .get('/api/notifications?unread=true')
        .set('Cookie', cookie)
        .expect(200);

      expect(unreadRes.body.data.length).toBe(1);
      expect(unreadRes.body.unreadCount).toBe(1);

      // Mark all read
      await request(app)
        .post('/api/notifications/mark-all-read')
        .set('Cookie', cookie)
        .expect(200);

      const allReadRes = await request(app)
        .get('/api/notifications?unread=true')
        .set('Cookie', cookie)
        .expect(200);

      expect(allReadRes.body.data.length).toBe(0);
      expect(allReadRes.body.unreadCount).toBe(0);
    });
  });
});
