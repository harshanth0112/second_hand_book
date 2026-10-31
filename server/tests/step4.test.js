import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Listing } from '../src/models/Listing.js';
import { IsbnService } from '../src/services/isbn.service.js';

const app = createApp();

const BASE_USER = {
  name: 'Step4 Tester',
  email: 'step4@college.edu',
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

describe('Step 4: Search, Filters, Price Hint, ISBN Lookup', () => {
  beforeEach(() => {
    IsbnService.getCache().clear();
    vi.restoreAllMocks();
  });

  describe('Search & Filter (GET /api/listings)', () => {
    it('returns only available listings and enforces card fields projection', async () => {
      const { user } = await createVerifiedUser();

      // Create an available book and a reserved/sold/removed book
      await Listing.create({
        title: 'Algorithms in C++',
        titleNormalized: 'algorithms in c++',
        author: 'Robert Sedgewick',
        subject: 'Algorithms',
        department: 'Computer Science',
        semester: 3,
        listingType: 'sell',
        condition: 'good',
        price: 350,
        seller: user._id,
        status: 'available',
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });

      await Listing.create({
        title: 'Hidden Sold Book',
        titleNormalized: 'hidden sold book',
        author: 'Unknown Author',
        department: 'Computer Science',
        listingType: 'sell',
        condition: 'good',
        price: 300,
        seller: user._id,
        status: 'sold',
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });

      const res = await request(app).get('/api/listings');
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].title).toBe('Algorithms in C++');
      expect(res.body.items[0].seller).toHaveProperty('name', user.name);
      expect(res.body.items[0].note).toBeUndefined(); // Note is not part of card fields
    });

    it('filters by department, semester, and condition list', async () => {
      const { user } = await createVerifiedUser();

      await Listing.create([
        {
          title: 'Mechanical Design',
          titleNormalized: 'mechanical design',
          author: 'Shigley',
          department: 'Mechanical',
          semester: 5,
          listingType: 'sell',
          condition: 'good',
          price: 500,
          seller: user._id,
          status: 'available',
          expiresAt: new Date(Date.now() + 100000),
        },
        {
          title: 'Thermodynamics',
          titleNormalized: 'thermodynamics',
          author: 'Cengel',
          department: 'Mechanical',
          semester: 3,
          listingType: 'sell',
          condition: 'fair',
          price: 400,
          seller: user._id,
          status: 'available',
          expiresAt: new Date(Date.now() + 100000),
        },
        {
          title: 'Database Systems',
          titleNormalized: 'database systems',
          author: 'Navathe',
          department: 'Computer Science',
          semester: 4,
          listingType: 'sell',
          condition: 'like new',
          price: 600,
          seller: user._id,
          status: 'available',
          expiresAt: new Date(Date.now() + 100000),
        },
      ]);

      const res = await request(app).get('/api/listings').query({
        department: 'Mechanical',
        condition: 'fair,like new',
      });

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].title).toBe('Thermodynamics');
    });

    it('filters by price range and rejects minPrice > maxPrice with 400', async () => {
      const { user } = await createVerifiedUser();

      await Listing.create([
        {
          title: 'Book 100',
          titleNormalized: 'book 100',
          author: 'Author A',
          department: 'Physics',
          listingType: 'sell',
          condition: 'good',
          price: 100,
          seller: user._id,
          status: 'available',
          expiresAt: new Date(Date.now() + 100000),
        },
        {
          title: 'Book 500',
          titleNormalized: 'book 500',
          author: 'Author B',
          department: 'Physics',
          listingType: 'sell',
          condition: 'good',
          price: 500,
          seller: user._id,
          status: 'available',
          expiresAt: new Date(Date.now() + 100000),
        },
      ]);

      // Valid price range
      const validRes = await request(app).get('/api/listings').query({
        minPrice: 50,
        maxPrice: 200,
      });
      expect(validRes.status).toBe(200);
      expect(validRes.body.items.length).toBe(1);
      expect(validRes.body.items[0].price).toBe(100);

      // Invalid price range
      const invalidRes = await request(app).get('/api/listings').query({
        minPrice: 300,
        maxPrice: 100,
      });
      expect(invalidRes.status).toBe(400);
      expect(invalidRes.body.errors.some((e) => e.field === 'minPrice')).toBe(true);
    });

    it('sorts by price_asc, price_desc, and rejects relevance without q', async () => {
      const { user } = await createVerifiedUser();

      await Listing.create([
        {
          title: 'Cheap Book',
          titleNormalized: 'cheap book',
          author: 'Author A',
          department: 'Mathematics',
          listingType: 'sell',
          condition: 'good',
          price: 150,
          seller: user._id,
          status: 'available',
          expiresAt: new Date(Date.now() + 100000),
        },
        {
          title: 'Expensive Book',
          titleNormalized: 'expensive book',
          author: 'Author B',
          department: 'Mathematics',
          listingType: 'sell',
          condition: 'good',
          price: 850,
          seller: user._id,
          status: 'available',
          expiresAt: new Date(Date.now() + 100000),
        },
      ]);

      const ascRes = await request(app).get('/api/listings').query({ sort: 'price_asc' });
      expect(ascRes.status).toBe(200);
      expect(ascRes.body.items[0].price).toBe(150);

      const descRes = await request(app).get('/api/listings').query({ sort: 'price_desc' });
      expect(descRes.status).toBe(200);
      expect(descRes.body.items[0].price).toBe(850);

      const relRes = await request(app).get('/api/listings').query({ sort: 'relevance' });
      expect(relRes.status).toBe(400);
    });

    it('handles text search query q on title and author', async () => {
      const { user } = await createVerifiedUser();

      await Listing.create([
        {
          title: 'Discrete Mathematics and Its Applications',
          titleNormalized: 'discrete mathematics and its applications',
          author: 'Kenneth Rosen',
          department: 'Mathematics',
          listingType: 'sell',
          condition: 'good',
          price: 400,
          seller: user._id,
          status: 'available',
          expiresAt: new Date(Date.now() + 100000),
        },
        {
          title: 'Calculus Early Transcendentals',
          titleNormalized: 'calculus early transcendentals',
          author: 'James Stewart',
          department: 'Mathematics',
          listingType: 'sell',
          condition: 'fair',
          price: 350,
          seller: user._id,
          status: 'available',
          expiresAt: new Date(Date.now() + 100000),
        },
      ]);

      const res = await request(app).get('/api/listings').query({ q: 'Rosen' });
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].author).toBe('Kenneth Rosen');
    });
  });

  describe('Price Hint (GET /api/listings/price-hint)', () => {
    it('returns null hint when count < 3', async () => {
      const { user: seller } = await createVerifiedUser();
      const { cookie: buyerCookie } = await createVerifiedUser();

      await Listing.create([
        {
          title: 'Operating System Concepts',
          titleNormalized: 'operating system concepts',
          author: 'Silberschatz',
          isbn: '9781118063330',
          listingType: 'sell',
          condition: 'good',
          price: 400,
          seller: seller._id,
          status: 'sold',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 100000),
        },
        {
          title: 'Operating System Concepts',
          titleNormalized: 'operating system concepts',
          author: 'Silberschatz',
          isbn: '9781118063330',
          listingType: 'sell',
          condition: 'fair',
          price: 350,
          seller: seller._id,
          status: 'available',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 100000),
        },
      ]);

      const res = await request(app)
        .get('/api/listings/price-hint')
        .set('Cookie', buyerCookie)
        .query({ isbn: '9781118063330' });

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.hint).toBeNull();
    });

    it('returns calculated average, min, max when count >= 3, excluding requesting user own listings', async () => {
      const { user: sellerA } = await createVerifiedUser();
      const { user: sellerB } = await createVerifiedUser();
      const { user: requester, cookie: requesterCookie } = await createVerifiedUser();

      await Listing.create([
        {
          title: 'Computer Networks',
          titleNormalized: 'computer networks',
          author: 'Tanenbaum',
          isbn: '9780132126953',
          listingType: 'sell',
          condition: 'good',
          price: 300,
          seller: sellerA._id,
          status: 'available',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 100000),
        },
        {
          title: 'Computer Networks',
          titleNormalized: 'computer networks',
          author: 'Tanenbaum',
          isbn: '9780132126953',
          listingType: 'sell',
          condition: 'like new',
          price: 500,
          seller: sellerB._id,
          status: 'sold',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 100000),
        },
        {
          title: 'Computer Networks',
          titleNormalized: 'computer networks',
          author: 'Tanenbaum',
          isbn: '9780132126953',
          listingType: 'sell',
          condition: 'fair',
          price: 400,
          seller: sellerA._id,
          status: 'available',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 100000),
        },
        // Requester's own listing - must be excluded
        {
          title: 'Computer Networks',
          titleNormalized: 'computer networks',
          author: 'Tanenbaum',
          isbn: '9780132126953',
          listingType: 'sell',
          condition: 'fair',
          price: 10000,
          seller: requester._id,
          status: 'available',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 100000),
        },
        // Free listing - must be excluded
        {
          title: 'Computer Networks',
          titleNormalized: 'computer networks',
          author: 'Tanenbaum',
          isbn: '9780132126953',
          listingType: 'free',
          condition: 'fair',
          price: 0,
          seller: sellerB._id,
          status: 'available',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 100000),
        },
      ]);

      const res = await request(app)
        .get('/api/listings/price-hint')
        .set('Cookie', requesterCookie)
        .query({ isbn: '9780132126953' });

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(3);
      expect(res.body.hint).not.toBeNull();
      expect(res.body.hint.min).toBe(300);
      expect(res.body.hint.max).toBe(500);
      expect(res.body.hint.average).toBe(400);
    });
  });

  describe('ISBN Lookup (GET /api/listings/isbn/:isbn)', () => {
    it('rejects invalid ISBN format with 400', async () => {
      const { cookie } = await createVerifiedUser();

      const res = await request(app)
        .get('/api/listings/isbn/123-abc')
        .set('Cookie', cookie);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });

    it('successfully maps upstream Open Library response and caches result', async () => {
      const { cookie } = await createVerifiedUser();
      const isbn = '9780132350884';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          [`ISBN:${isbn}`]: {
            title: 'Clean Code',
            authors: [{ name: 'Robert C. Martin' }],
            cover: { medium: 'https://covers.openlibrary.org/b/id/123-M.jpg' },
          },
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      // First call (fetches from API)
      const res1 = await request(app)
        .get(`/api/listings/isbn/${isbn}`)
        .set('Cookie', cookie);

      expect(res1.status).toBe(200);
      expect(res1.body.title).toBe('Clean Code');
      expect(res1.body.author).toBe('Robert C. Martin');
      expect(res1.body.coverUrl).toBe('https://covers.openlibrary.org/b/id/123-M.jpg');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call (served from memory cache)
      const res2 = await request(app)
        .get(`/api/listings/isbn/${isbn}`)
        .set('Cookie', cookie);

      expect(res2.status).toBe(200);
      expect(res2.body.title).toBe('Clean Code');
      expect(mockFetch).toHaveBeenCalledTimes(1); // not called again
    });

    it('returns 404 when book is not found in Open Library', async () => {
      const { cookie } = await createVerifiedUser();
      const isbn = '9780000000000';

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }));

      const res = await request(app)
        .get(`/api/listings/isbn/${isbn}`)
        .set('Cookie', cookie);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('returns 502 when upstream service fails or times out', async () => {
      const { cookie } = await createVerifiedUser();
      const isbn = '9780132350884';

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network timeout')));

      const res = await request(app)
        .get(`/api/listings/isbn/${isbn}`)
        .set('Cookie', cookie);

      expect(res.status).toBe(502);
      expect(res.body.message).toMatch(/Upstream ISBN service/i);
    });
  });
});

