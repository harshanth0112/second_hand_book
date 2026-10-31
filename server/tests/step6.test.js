import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import http from 'http';
import { io as Client } from 'socket.io-client';
import { createApp } from '../src/app.js';
import { setupSocketServer } from '../src/socket/index.js';
import { User } from '../src/models/User.js';
import { Listing } from '../src/models/Listing.js';
import { Conversation } from '../src/models/Conversation.js';
import { Message } from '../src/models/Message.js';

const app = createApp();

let httpServer;
let serverPort;

beforeAll(async () => {
  httpServer = http.createServer(app);
  setupSocketServer(httpServer);
  await new Promise((resolve) => {
    httpServer.listen(0, () => {
      serverPort = httpServer.address().port;
      resolve();
    });
  });
});

afterAll(async () => {
  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
});

const BASE_USER = {
  name: 'Step6 Tester',
  email: 'step6@college.edu',
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

describe('Step 6: Chat (REST & Socket.IO)', () => {
  describe('REST Endpoints', () => {
    it('POST /api/conversations starts or returns existing conversation (upsert)', async () => {
      const { user: seller } = await createVerifiedUser();
      const { cookie: buyerCookie } = await createVerifiedUser();

      const listing = await Listing.create({
        title: 'Chat Test Book',
        titleNormalized: 'chat test book',
        author: 'Author',
        department: 'Computer Science',
        listingType: 'sell',
        condition: 'good',
        price: 350,
        seller: seller._id,
        status: 'available',
        expiresAt: new Date(Date.now() + 100000),
      });

      // 1. First call creates
      const res1 = await request(app)
        .post('/api/conversations')
        .set('Cookie', buyerCookie)
        .send({ listingId: listing._id.toString() });

      expect(res1.status).toBe(200);
      expect(res1.body.listing._id.toString()).toBe(listing._id.toString());
      const convId = res1.body._id;

      // 2. Second call returns the same conversation
      const res2 = await request(app)
        .post('/api/conversations')
        .set('Cookie', buyerCookie)
        .send({ listingId: listing._id.toString() });

      expect(res2.status).toBe(200);
      expect(res2.body._id).toBe(convId);
    });

    it('starting a chat on own listing returns 403', async () => {
      const { user, cookie } = await createVerifiedUser();

      const listing = await Listing.create({
        title: 'Own Book',
        titleNormalized: 'own book',
        author: 'Author',
        department: 'Computer Science',
        listingType: 'sell',
        condition: 'good',
        price: 250,
        seller: user._id,
        status: 'available',
        expiresAt: new Date(Date.now() + 100000),
      });

      const res = await request(app)
        .post('/api/conversations')
        .set('Cookie', cookie)
        .send({ listingId: listing._id.toString() });

      expect(res.status).toBe(403);
    });

    it('non-participants get 403 when trying to access conversation messages', async () => {
      const { user: seller } = await createVerifiedUser();
      const { cookie: buyerCookie } = await createVerifiedUser();
      const { cookie: strangerCookie } = await createVerifiedUser();

      const listing = await Listing.create({
        title: 'Secret Chat Book',
        titleNormalized: 'secret chat book',
        author: 'Author',
        department: 'Computer Science',
        listingType: 'sell',
        condition: 'good',
        price: 250,
        seller: seller._id,
        status: 'available',
        expiresAt: new Date(Date.now() + 100000),
      });

      const convRes = await request(app)
        .post('/api/conversations')
        .set('Cookie', buyerCookie)
        .send({ listingId: listing._id.toString() });

      const res = await request(app)
        .get(`/api/conversations/${convRes.body._id}/messages`)
        .set('Cookie', strangerCookie);

      expect(res.status).toBe(403);
    });

    it('calculates unreadCount accurately in GET /api/conversations inbox', async () => {
      const { user: seller, cookie: sellerCookie } = await createVerifiedUser();
      const { user: buyer, cookie: buyerCookie } = await createVerifiedUser();

      const listing = await Listing.create({
        title: 'Unread Book',
        titleNormalized: 'unread book',
        author: 'Author',
        department: 'Computer Science',
        listingType: 'sell',
        condition: 'good',
        price: 300,
        seller: seller._id,
        status: 'available',
        expiresAt: new Date(Date.now() + 100000),
      });

      const conv = await Conversation.create({
        listing: listing._id,
        seller: seller._id,
        buyer: buyer._id,
        lastMessage: 'Hello',
      });

      // Buyer sends 2 messages to seller
      await Message.create([
        {
          conversation: conv._id,
          sender: buyer._id,
          type: 'text',
          text: 'Message 1',
          readAt: null,
        },
        {
          conversation: conv._id,
          sender: buyer._id,
          type: 'text',
          text: 'Message 2',
          readAt: null,
        },
      ]);

      const inboxRes = await request(app)
        .get('/api/conversations')
        .set('Cookie', sellerCookie);

      expect(inboxRes.status).toBe(200);
      expect(inboxRes.body[0].unreadCount).toBe(2);

      // Seller marks as read
      const readRes = await request(app)
        .patch(`/api/conversations/${conv._id}/read`)
        .set('Cookie', sellerCookie);
      expect(readRes.status).toBe(204);

      // Inbox count becomes 0
      const inboxAfter = await request(app)
        .get('/api/conversations')
        .set('Cookie', sellerCookie);
      expect(inboxAfter.body[0].unreadCount).toBe(0);
    });

    it('seller can accept or decline offer; stores agreedPrice and posts system message', async () => {
      const { user: seller, cookie: sellerCookie } = await createVerifiedUser();
      const { user: buyer, cookie: buyerCookie } = await createVerifiedUser();

      const listing = await Listing.create({
        title: 'Offer Book',
        titleNormalized: 'offer book',
        author: 'Author',
        department: 'Computer Science',
        listingType: 'sell',
        condition: 'good',
        price: 500,
        seller: seller._id,
        status: 'available',
        expiresAt: new Date(Date.now() + 100000),
      });

      const conv = await Conversation.create({
        listing: listing._id,
        seller: seller._id,
        buyer: buyer._id,
      });

      const offerMsg = await Message.create({
        conversation: conv._id,
        sender: buyer._id,
        type: 'offer',
        offerAmount: 420,
        offerStatus: 'pending',
        text: 'Offered ₹420',
      });

      // Buyer cannot accept own offer
      const buyerAttempt = await request(app)
        .patch(`/api/messages/${offerMsg._id}/offer`)
        .set('Cookie', buyerCookie)
        .send({ action: 'accept' });
      expect(buyerAttempt.status).toBe(403);

      // Seller accepts
      const acceptRes = await request(app)
        .patch(`/api/messages/${offerMsg._id}/offer`)
        .set('Cookie', sellerCookie)
        .send({ action: 'accept' });

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.message.offerStatus).toBe('accepted');
      expect(acceptRes.body.agreedPrice).toBe(420);

      const inDbConv = await Conversation.findById(conv._id);
      expect(inDbConv.agreedPrice).toBe(420);

      // System message created
      const sysMsg = await Message.findOne({ conversation: conv._id, type: 'system' });
      expect(sysMsg).not.toBeNull();
      expect(sysMsg.text).toMatch(/accepted the offer of ₹420/i);
    });
  });

  describe('Socket.IO Events & Realtime Messaging', () => {
    it('connection without a cookie is rejected', async () => {
      const socket = Client(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        reconnection: false,
      });

      await new Promise((resolve) => {
        socket.on('connect_error', (err) => {
          expect(err.message).toMatch(/Authentication required/i);
          socket.disconnect();
          resolve();
        });
      });
    });

    it('authenticated user connects, joins room, exchanges live message', async () => {
      const { user: seller, cookie: sellerCookie } = await createVerifiedUser();
      const { user: buyer, cookie: buyerCookie } = await createVerifiedUser();

      const listing = await Listing.create({
        title: 'Socket Book',
        titleNormalized: 'socket book',
        author: 'Author',
        department: 'Computer Science',
        listingType: 'sell',
        condition: 'good',
        price: 300,
        seller: seller._id,
        status: 'available',
        expiresAt: new Date(Date.now() + 100000),
      });

      const conv = await Conversation.create({
        listing: listing._id,
        seller: seller._id,
        buyer: buyer._id,
      });

      // Connect seller client
      const sellerSocket = Client(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        extraHeaders: {
          Cookie: sellerCookie[0],
        },
      });

      // Connect buyer client
      const buyerSocket = Client(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        extraHeaders: {
          Cookie: buyerCookie[0],
        },
      });

      await new Promise((resolve) => {
        let connectedCount = 0;
        const checkDone = () => {
          connectedCount++;
          if (connectedCount === 2) resolve();
        };
        sellerSocket.on('connect', checkDone);
        buyerSocket.on('connect', checkDone);
      });

      // Both join conversation room
      await new Promise((resolve) => {
        sellerSocket.emit('conversation:join', { conversationId: conv._id.toString() }, (ack) => {
          expect(ack.ok).toBe(true);
          resolve();
        });
      });

      await new Promise((resolve) => {
        buyerSocket.emit('conversation:join', { conversationId: conv._id.toString() }, (ack) => {
          expect(ack.ok).toBe(true);
          resolve();
        });
      });

      // Buyer sends message and seller receives it in realtime
      const messagePromise = new Promise((resolve) => {
        sellerSocket.on('message:new', (msg) => {
          expect(msg.text).toBe('Hello from Socket.io buyer!');
          expect(msg.sender._id.toString()).toBe(buyer._id.toString());
          resolve();
        });
      });

      await new Promise((resolve) => {
        buyerSocket.emit(
          'message:send',
          {
            conversationId: conv._id.toString(),
            type: 'text',
            text: 'Hello from Socket.io buyer!',
          },
          (ack) => {
            expect(ack.ok).toBe(true);
            resolve();
          }
        );
      });

      await messagePromise;

      sellerSocket.disconnect();
      buyerSocket.disconnect();
    });

    it('rejects offer above listing price via socket', async () => {
      const { user: seller } = await createVerifiedUser();
      const { user: buyer, cookie: buyerCookie } = await createVerifiedUser();

      const listing = await Listing.create({
        title: 'Price Cap Book',
        titleNormalized: 'price cap book',
        author: 'Author',
        department: 'Computer Science',
        listingType: 'sell',
        condition: 'good',
        price: 200,
        seller: seller._id,
        status: 'available',
        expiresAt: new Date(Date.now() + 100000),
      });

      const conv = await Conversation.create({
        listing: listing._id,
        seller: seller._id,
        buyer: buyer._id,
      });

      const buyerSocket = Client(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        extraHeaders: {
          Cookie: buyerCookie[0],
        },
      });

      await new Promise((resolve) => buyerSocket.on('connect', resolve));

      await new Promise((resolve) => {
        buyerSocket.emit(
          'message:send',
          {
            conversationId: conv._id.toString(),
            type: 'offer',
            offerAmount: 350, // above ₹200 listing price
          },
          (ack) => {
            expect(ack.ok).toBe(false);
            expect(ack.error).toMatch(/between 1 and the listing price/i);
            resolve();
          }
        );
      });

      buyerSocket.disconnect();
    });
  });
});

