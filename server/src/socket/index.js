import { Server } from 'socket.io';
import cookie from 'cookie';
import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Listing } from '../models/Listing.js';
import { env } from '../config/env.js';

let ioInstance = null;

export function getIO() {
  return ioInstance;
}

export function setupSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  ioInstance = io;

  // Socket authentication middleware via token cookie
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error('Authentication required'));
      }

      const parsedCookies = cookie.parse(cookieHeader);
      const token = parsedCookies[env.COOKIE_NAME];
      if (!token) {
        return next(new Error('Authentication required'));
      }

      let decoded;
      try {
        decoded = verifyToken(token);
      } catch {
        return next(new Error('Invalid or expired token'));
      }

      const user = await User.findById(decoded.sub);
      if (!user) {
        return next(new Error('User no longer exists'));
      }

      const dbVersion = user.sessionVersion ?? 0;
      if (decoded.sessionVersion !== dbVersion) {
        return next(new Error('Session invalidated'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    socket.join(`user:${user._id.toString()}`);
    const rateLimitMap = {
      count: 0,
      windowStart: Date.now(),
    };

    // Join conversation room
    socket.on('conversation:join', async (payload, ack) => {
      try {
        const { conversationId } = payload || {};
        if (!conversationId) {
          if (ack) ack({ ok: false, error: 'conversationId is required' });
          return;
        }

        const conv = await Conversation.findById(conversationId);
        if (!conv) {
          if (ack) ack({ ok: false, error: 'Conversation not found' });
          return;
        }

        const isParticipant = conv.buyer.equals(user._id) || conv.seller.equals(user._id);
        if (!isParticipant) {
          if (ack) ack({ ok: false, error: 'Not authorized to join this conversation' });
          return;
        }

        socket.join(`conversation:${conversationId}`);
        if (ack) ack({ ok: true });
      } catch (err) {
        if (ack) ack({ ok: false, error: 'Failed to join conversation' });
      }
    });

    // Send message (text or offer)
    socket.on('message:send', async (payload, ack) => {
      try {
        // Enforce rate limit: max 20 messages per 10 seconds per socket
        const now = Date.now();
        if (now - rateLimitMap.windowStart > 10000) {
          rateLimitMap.count = 0;
          rateLimitMap.windowStart = now;
        }
        rateLimitMap.count += 1;
        if (rateLimitMap.count > 20) {
          if (ack) ack({ ok: false, error: 'Rate limit exceeded. Please wait.' });
          return;
        }

        const { conversationId, type = 'text', text, offerAmount } = payload || {};
        if (!conversationId) {
          if (ack) ack({ ok: false, error: 'conversationId is required' });
          return;
        }

        // Users cannot send system messages
        if (type === 'system') {
          if (ack) ack({ ok: false, error: 'Users cannot send system messages' });
          return;
        }

        const conv = await Conversation.findById(conversationId);
        if (!conv) {
          if (ack) ack({ ok: false, error: 'Conversation not found' });
          return;
        }

        const isBuyer = conv.buyer.equals(user._id);
        const isSeller = conv.seller.equals(user._id);

        if (!isBuyer && !isSeller) {
          if (ack) ack({ ok: false, error: 'Not authorized to send messages in this conversation' });
          return;
        }

        let messageData = {
          conversation: conv._id,
          sender: user._id,
          type,
        };

        if (type === 'text') {
          const trimmed = (text || '').trim();
          if (!trimmed || trimmed.length > 1000) {
            if (ack) ack({ ok: false, error: 'Message must be between 1 and 1000 characters' });
            return;
          }
          messageData.text = trimmed;
          conv.lastMessage = trimmed;
        } else if (type === 'offer') {
          // Only buyer can make offers, and only on 'sell' listings
          if (!isBuyer) {
            if (ack) ack({ ok: false, error: 'Only the buyer can make an offer' });
            return;
          }

          const listing = await Listing.findById(conv.listing);
          if (!listing || listing.listingType !== 'sell') {
            if (ack) ack({ ok: false, error: 'Offers can only be made on sell listings' });
            return;
          }

          const amount = parseInt(offerAmount, 10);
          if (isNaN(amount) || amount < 1 || amount > listing.price) {
            if (ack) ack({ ok: false, error: `Offer must be an integer between 1 and the listing price (₹${listing.price})` });
            return;
          }

          messageData.offerAmount = amount;
          messageData.offerStatus = 'pending';
          messageData.text = `Offered ₹${amount}`;
          conv.lastMessage = `Offer: ₹${amount}`;
        } else {
          if (ack) ack({ ok: false, error: 'Invalid message type' });
          return;
        }

        conv.lastMessageAt = new Date();
        await conv.save();

        const createdMessage = await Message.create(messageData);
        await createdMessage.populate('sender', '_id name avatar');

        // Broadcast to the conversation room
        io.to(`conversation:${conversationId}`).emit('message:new', createdMessage);

        if (ack) ack({ ok: true, message: createdMessage });
      } catch (err) {
        if (ack) ack({ ok: false, error: err.message || 'Failed to send message' });
      }
    });

    // Typing notification
    socket.on('typing', ({ conversationId, isTyping }) => {
      socket.to(`conversation:${conversationId}`).emit('typing', {
        conversationId,
        userId: user._id.toString(),
        isTyping: Boolean(isTyping),
      });
    });

    // Mark read
    socket.on('message:read', async ({ conversationId }) => {
      try {
        await Message.updateMany(
          {
            conversation: conversationId,
            sender: { $ne: user._id },
            readAt: null,
          },
          {
            $set: { readAt: new Date() },
          }
        );

        io.to(`conversation:${conversationId}`).emit('message:read', {
          conversationId,
          readerId: user._id.toString(),
        });
      } catch (err) {
        console.error('[Socket] Mark read failed:', err.message);
      }
    });
  });

  return io;
}

