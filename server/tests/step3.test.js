import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Listing } from '../src/models/Listing.js';

vi.mock('../src/services/image.service.js', () => {
  return {
    ImageService: {
      uploadImage: vi.fn().mockResolvedValue({
        url: 'https://res.cloudinary.com/test/image/upload/v12345/book-exchange/listings/mock1.jpg',
        publicId: 'book-exchange/listings/mock1',
      }),
      deleteImage: vi.fn().mockResolvedValue(),
    },
  };
});

const app = createApp();

const BASE_USER = {
  name: 'Listing Tester',
  email: 'listingtest@college.edu',
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

async function createUnverifiedUser(overrides = {}) {
  const email = overrides.email || `unverified_${Date.now()}@college.edu`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ ...BASE_USER, email, ...overrides });
  
  const cookie = res.headers['set-cookie'];
  const user = await User.findOne({ email });
  return { user, cookie };
}

const SAMPLE_SELL_BOOK = {
  title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
  author: 'Robert C. Martin',
  subject: 'Software Engineering',
  department: 'Computer Science',
  semester: 4,
  listingType: 'sell',
  condition: 'good',
  price: 450,
  note: 'Minor highlighting on first chapter',
};

describe('Step 3: Listing Management', () => {
  describe('Listing Creation & Validation', () => {
    it('unverified user gets 403 when creating a listing', async () => {
      const { cookie } = await createUnverifiedUser();

      const res = await request(app)
        .post('/api/listings')
        .set('Cookie', cookie)
        .send(SAMPLE_SELL_BOOK);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Email verification required/i);
    });

    it('free listing with price > 0 returns 400', async () => {
      const { cookie } = await createVerifiedUser();

      const res = await request(app)
        .post('/api/listings')
        .set('Cookie', cookie)
        .send({
          ...SAMPLE_SELL_BOOK,
          listingType: 'free',
          price: 50,
        });

      expect(res.status).toBe(400);
      expect(res.body.errors.some((e) => e.field === 'price')).toBe(true);
    });

    it('swap listing without swapFor returns 400', async () => {
      const { cookie } = await createVerifiedUser();

      const res = await request(app)
        .post('/api/listings')
        .set('Cookie', cookie)
        .send({
          ...SAMPLE_SELL_BOOK,
          listingType: 'swap',
        });

      expect(res.status).toBe(400);
      expect(res.body.errors.some((e) => e.field === 'swapFor')).toBe(true);
    });

    it('sell listing with price 0 returns 400', async () => {
      const { cookie } = await createVerifiedUser();

      const res = await request(app)
        .post('/api/listings')
        .set('Cookie', cookie)
        .send({
          ...SAMPLE_SELL_BOOK,
          listingType: 'sell',
          price: 0,
        });

      expect(res.status).toBe(400);
      expect(res.body.errors.some((e) => e.field === 'price')).toBe(true);
    });

    it('rejects client-sent server fields (status, seller, views, etc.) with 400', async () => {
      const { cookie } = await createVerifiedUser();

      const res = await request(app)
        .post('/api/listings')
        .set('Cookie', cookie)
        .send({
          ...SAMPLE_SELL_BOOK,
          status: 'sold',
          views: 999,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });

    it('successfully creates a valid sell, free, and swap listing with correct server-set fields', async () => {
      const { user, cookie } = await createVerifiedUser();

      // 1. Sell
      const sellRes = await request(app)
        .post('/api/listings')
        .set('Cookie', cookie)
        .send(SAMPLE_SELL_BOOK);

      expect(sellRes.status).toBe(201);
      expect(sellRes.body.seller).toBe(user._id.toString());
      expect(sellRes.body.status).toBe('available');
      expect(sellRes.body.views).toBe(0);
      expect(sellRes.body.titleNormalized).toBe('clean code: a handbook of agile software craftsmanship');
      expect(new Date(sellRes.body.expiresAt).getTime()).toBeGreaterThan(Date.now() + 50 * 24 * 60 * 60 * 1000);

      // 2. Free
      const freeRes = await request(app)
        .post('/api/listings')
        .set('Cookie', cookie)
        .send({
          ...SAMPLE_SELL_BOOK,
          title: 'Free Algorithms Book',
          listingType: 'free',
          price: 0,
        });

      expect(freeRes.status).toBe(201);
      expect(freeRes.body.price).toBe(0);

      // 3. Swap
      const swapRes = await request(app)
        .post('/api/listings')
        .set('Cookie', cookie)
        .send({
          ...SAMPLE_SELL_BOOK,
          title: 'Operating Systems Concepts',
          listingType: 'swap',
          swapFor: 'Computer Networks 5th Edition',
        });

      expect(swapRes.status).toBe(201);
      expect(swapRes.body.price).toBe(0);
      expect(swapRes.body.swapFor).toBe('Computer Networks 5th Edition');
    });
  });

  describe('Edit & Delete Operations', () => {
    it('non-owner cannot edit a listing (returns 403)', async () => {
      const { cookie: ownerCookie } = await createVerifiedUser();
      const { cookie: strangerCookie } = await createVerifiedUser();

      const createRes = await request(app)
        .post('/api/listings')
        .set('Cookie', ownerCookie)
        .send(SAMPLE_SELL_BOOK);

      const res = await request(app)
        .put(`/api/listings/${createRes.body._id}`)
        .set('Cookie', strangerCookie)
        .send({
          ...SAMPLE_SELL_BOOK,
          title: 'Hacked Title',
        });

      expect(res.status).toBe(403);
    });

    it('edit of a reserved or sold listing returns 409', async () => {
      const { cookie } = await createVerifiedUser();

      const createRes = await request(app)
        .post('/api/listings')
        .set('Cookie', cookie)
        .send(SAMPLE_SELL_BOOK);

      // Simulate status reserved
      await Listing.findByIdAndUpdate(createRes.body._id, { status: 'reserved' });

      const res = await request(app)
        .put(`/api/listings/${createRes.body._id}`)
        .set('Cookie', cookie)
        .send({
          ...SAMPLE_SELL_BOOK,
          price: 500,
        });

      expect(res.status).toBe(409);
    });

    it('successful edit updates fields and recalculates titleNormalized', async () => {
      const { cookie } = await createVerifiedUser();

      const createRes = await request(app)
        .post('/api/listings')
        .set('Cookie', cookie)
        .send(SAMPLE_SELL_BOOK);

      const res = await request(app)
        .put(`/api/listings/${createRes.body._id}`)
        .set('Cookie', cookie)
        .send({
          ...SAMPLE_SELL_BOOK,
          title: 'Clean Architecture in Practice',
          price: 600,
        });

      expect(res.status).toBe(200);
      expect(res.body.price).toBe(600);
      expect(res.body.titleNormalized).toBe('clean architecture in practice');
    });

    it('delete marks listing as removed and returns 204', async () => {
      const { cookie } = await createVerifiedUser();

      const createRes = await request(app)
        .post('/api/listings')
        .set('Cookie', cookie)
        .send(SAMPLE_SELL_BOOK);

      const delRes = await request(app)
        .delete(`/api/listings/${createRes.body._id}`)
        .set('Cookie', cookie);

      expect(delRes.status).toBe(204);

      const inDb = await Listing.findById(createRes.body._id);
      expect(inDb.status).toBe('removed');
    });

    it('deleting a reserved listing returns 409', async () => {
      const { cookie } = await createVerifiedUser();

      const createRes = await request(app)
        .post('/api/listings')
        .set('Cookie', cookie)
        .send(SAMPLE_SELL_BOOK);

      await Listing.findByIdAndUpdate(createRes.body._id, { status: 'reserved' });

      const delRes = await request(app)
        .delete(`/api/listings/${createRes.body._id}`)
        .set('Cookie', cookie);

      expect(delRes.status).toBe(409);
      expect(delRes.body.message).toMatch(/reservation/i);
    });

    it('removed listing returns 404 for public, but 200 for owner', async () => {
      const { cookie: ownerCookie } = await createVerifiedUser();
      const { cookie: strangerCookie } = await createVerifiedUser();

      const createRes = await request(app)
        .post('/api/listings')
        .set('Cookie', ownerCookie)
        .send(SAMPLE_SELL_BOOK);

      await request(app)
        .delete(`/api/listings/${createRes.body._id}`)
        .set('Cookie', ownerCookie);

      // Public / stranger access
      const publicRes = await request(app)
        .get(`/api/listings/${createRes.body._id}`)
        .set('Cookie', strangerCookie);
      expect(publicRes.status).toBe(404);

      // Owner access
      const ownerRes = await request(app)
        .get(`/api/listings/${createRes.body._id}`)
        .set('Cookie', ownerCookie);
      expect(ownerRes.status).toBe(200);
      expect(ownerRes.body.status).toBe('removed');
    });
  });

  describe('Views and Read Operations', () => {
    it('viewing own listing does not increment views, but visitor view does', async () => {
      const { cookie: ownerCookie } = await createVerifiedUser();
      const { cookie: visitorCookie } = await createVerifiedUser();

      const createRes = await request(app)
        .post('/api/listings')
        .set('Cookie', ownerCookie)
        .send(SAMPLE_SELL_BOOK);

      const listingId = createRes.body._id;

      // Owner views
      await request(app).get(`/api/listings/${listingId}`).set('Cookie', ownerCookie);
      let inDb = await Listing.findById(listingId);
      expect(inDb.views).toBe(0);

      // Visitor views
      await request(app).get(`/api/listings/${listingId}`).set('Cookie', visitorCookie);
      // Wait slightly for fire-and-forget
      await new Promise((r) => setTimeout(r, 50));
      inDb = await Listing.findById(listingId);
      expect(inDb.views).toBe(1);
    });

    it('GET /api/me/listings returns user listings and excludes removed', async () => {
      const { cookie } = await createVerifiedUser();

      const l1 = await request(app).post('/api/listings').set('Cookie', cookie).send(SAMPLE_SELL_BOOK);
      await request(app).post('/api/listings').set('Cookie', cookie).send({ ...SAMPLE_SELL_BOOK, title: 'Book 2' });

      // Remove l1
      await request(app).delete(`/api/listings/${l1.body._id}`).set('Cookie', cookie);

      const res = await request(app).get('/api/me/listings').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].title).toBe('Book 2');
    });
  });

  describe('Image Management & Multer Limits', () => {
    it('uploads images and associates them with the listing', async () => {
      const { cookie } = await createVerifiedUser();

      const createRes = await request(app)
        .post('/api/listings')
        .set('Cookie', cookie)
        .send(SAMPLE_SELL_BOOK);

      const uploadRes = await request(app)
        .post(`/api/listings/${createRes.body._id}/images`)
        .set('Cookie', cookie)
        .attach('images', Buffer.from('fake-image-bytes'), 'test.jpg');

      expect(uploadRes.status).toBe(200);
      expect(uploadRes.body.images.length).toBe(1);
    });

    it('rejects upload of unsupported file format (e.g. text/plain)', async () => {
      const { cookie } = await createVerifiedUser();

      const createRes = await request(app)
        .post('/api/listings')
        .set('Cookie', cookie)
        .send(SAMPLE_SELL_BOOK);

      const uploadRes = await request(app)
        .post(`/api/listings/${createRes.body._id}/images`)
        .set('Cookie', cookie)
        .attach('images', Buffer.from('not an image'), 'test.txt');

      expect(uploadRes.status).toBe(400);
      expect(uploadRes.body.message).toMatch(/Only JPEG, PNG and WebP/i);
    });

    it('rejects adding beyond 4 images total with 409', async () => {
      const { cookie } = await createVerifiedUser();

      const createRes = await request(app)
        .post('/api/listings')
        .set('Cookie', cookie)
        .send(SAMPLE_SELL_BOOK);

      // Pre-fill 3 images in DB
      await Listing.findByIdAndUpdate(createRes.body._id, {
        images: ['img1.jpg', 'img2.jpg', 'img3.jpg'],
      });

      // Try uploading 2 more images (3 + 2 > 4)
      const uploadRes = await request(app)
        .post(`/api/listings/${createRes.body._id}/images`)
        .set('Cookie', cookie)
        .attach('images', Buffer.from('img4'), 'test4.png')
        .attach('images', Buffer.from('img5'), 'test5.png');

      expect(uploadRes.status).toBe(409);
      expect(uploadRes.body.message).toMatch(/maximum number of images/i);
    });

    it('removes an image by index', async () => {
      const { cookie } = await createVerifiedUser();

      const createRes = await request(app)
        .post('/api/listings')
        .set('Cookie', cookie)
        .send(SAMPLE_SELL_BOOK);

      await Listing.findByIdAndUpdate(createRes.body._id, {
        images: ['https://res.cloudinary.com/test/image/upload/v1/mock.jpg'],
      });

      const removeRes = await request(app)
        .delete(`/api/listings/${createRes.body._id}/images/0`)
        .set('Cookie', cookie);

      expect(removeRes.status).toBe(200);
      expect(removeRes.body.images.length).toBe(0);
    });
  });

  describe('Relist Functionality', () => {
    it('relist succeeds only when status is expired', async () => {
      const { cookie } = await createVerifiedUser();

      const createRes = await request(app)
        .post('/api/listings')
        .set('Cookie', cookie)
        .send(SAMPLE_SELL_BOOK);

      // 1. Relist when available -> 409
      const earlyRelist = await request(app)
        .post(`/api/listings/${createRes.body._id}/relist`)
        .set('Cookie', cookie);
      expect(earlyRelist.status).toBe(409);

      // 2. Mark as expired -> Relist succeeds
      await Listing.findByIdAndUpdate(createRes.body._id, { status: 'expired' });
      const relistRes = await request(app)
        .post(`/api/listings/${createRes.body._id}/relist`)
        .set('Cookie', cookie);

      expect(relistRes.status).toBe(200);
      expect(relistRes.body.status).toBe('available');
      expect(new Date(relistRes.body.expiresAt).getTime()).toBeGreaterThan(Date.now() + 50 * 24 * 60 * 60 * 1000);
    });
  });
});

