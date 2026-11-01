import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Listing } from '../models/Listing.js';
import { MeetupPoint } from '../models/MeetupPoint.js';
import { Request } from '../models/Request.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Review } from '../models/Review.js';
import { env } from '../config/env.js';

export function assertDemoSeedAllowed(targetEnv = env.NODE_ENV, uri = env.MONGODB_URI) {
  if (targetEnv === 'production') {
    throw new Error('Cannot run demo seed in production mode');
  }

  if (uri) {
    const isLocalhost = uri.includes('localhost') || uri.includes('127.0.0.1');
    const isMemoryServer = uri.includes('memory') || uri.startsWith('mongodb-memory-server');
    const isRemoteAtlas = uri.includes('mongodb+srv://') || uri.includes('.mongodb.net');

    if (isRemoteAtlas || (!isLocalhost && !isMemoryServer)) {
      throw new Error(
        `[DemoSeed Safety Guard] Refusing to seed demo data. ` +
        `Target database appears to be a remote/Atlas cluster: "${uri}". ` +
        `Demo seeding is destructive and only permitted on local or in-memory MongoDB instances.`
      );
    }
  }
}

export async function seedDemoData() {
  assertDemoSeedAllowed();

  console.log('[DemoSeed] Clearing existing demo data...');
  await Promise.all([
    User.deleteMany({}),
    Listing.deleteMany({}),
    MeetupPoint.deleteMany({}),
    Request.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
    Review.deleteMany({}),
  ]);

  console.log('[DemoSeed] Creating users...');
  // 1 admin + 4 normal verified students
  const admin = await User.create({
    name: 'Campus Administrator',
    email: env.ADMIN_EMAIL || 'admin@college.edu',
    password: env.ADMIN_PASSWORD || 'Admin1234!',
    role: 'admin',
    department: 'Other',
    emailVerified: true,
    isVerified: true,
    authProviders: ['local'],
  });

  const alice = await User.create({
    name: 'Alice Johnson',
    email: 'alice@college.edu',
    password: 'Password123!',
    role: 'student',
    department: 'Computer Science',
    semester: 4,
    emailVerified: true,
    isVerified: true,
    authProviders: ['local'],
  });

  const bob = await User.create({
    name: 'Bob Smith',
    email: 'bob@college.edu',
    password: 'Password123!',
    role: 'student',
    department: 'Electronics',
    semester: 6,
    emailVerified: true,
    isVerified: true,
    authProviders: ['local'],
  });

  const charlie = await User.create({
    name: 'Charlie Davis',
    email: 'charlie@college.edu',
    password: 'Password123!',
    role: 'student',
    department: 'Mechanical',
    semester: 2,
    emailVerified: true,
    isVerified: true,
    authProviders: ['local'],
  });

  const diana = await User.create({
    name: 'Diana Prince',
    email: 'diana@college.edu',
    password: 'Password123!',
    role: 'student',
    department: 'Mathematics',
    semester: 5,
    emailVerified: true,
    isVerified: true,
    authProviders: ['local'],
  });

  console.log('[DemoSeed] Creating 5 meetup points...');
  const meetupPoints = await MeetupPoint.create([
    {
      name: 'Central Library Main Entrance',
      area: 'Central Campus',
      description: 'Under the main clock tower near the benches',
      active: true,
    },
    {
      name: 'Student Center Food Court',
      area: 'Student Union Building',
      description: 'Second floor dining area near coffee counter',
      active: true,
    },
    {
      name: 'Engineering Block A Lobby',
      area: 'North Campus',
      description: 'Ground floor atrium by the security desk',
      active: true,
    },
    {
      name: 'Sports Complex Entrance',
      area: 'South Campus',
      description: 'Outside the indoor badminton court pavilion',
      active: true,
    },
    {
      name: 'Science Quad Fountain',
      area: 'Central Campus',
      description: 'Beside the stone amphitheater seats',
      active: true,
    },
  ]);

  console.log('[DemoSeed] Creating 12 listings...');
  const futureExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // 7 sell listings (including 3 copies of "Database System Concepts" for price hint)
  const l1 = await Listing.create({
    title: 'Database System Concepts',
    titleNormalized: 'database system concepts',
    author: 'Silberschatz, Korth, Sudarshan',
    department: 'Computer Science',
    semester: 4,
    subject: 'DBMS',
    courseCode: 'CS401',
    listingType: 'sell',
    condition: 'like new',
    price: 450,
    seller: alice._id,
    expiresAt: futureExpiry,
    status: 'available',
    coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80'],
  });

  const l2 = await Listing.create({
    title: 'Database System Concepts',
    titleNormalized: 'database system concepts',
    author: 'Silberschatz, Korth, Sudarshan',
    department: 'Computer Science',
    semester: 4,
    subject: 'DBMS',
    courseCode: 'CS401',
    listingType: 'sell',
    condition: 'good',
    price: 400,
    seller: bob._id,
    expiresAt: futureExpiry,
    status: 'available',
    coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop&q=80'],
  });

  const l3 = await Listing.create({
    title: 'Database System Concepts',
    titleNormalized: 'database system concepts',
    author: 'Silberschatz, Korth, Sudarshan',
    department: 'Computer Science',
    semester: 4,
    subject: 'DBMS',
    courseCode: 'CS401',
    listingType: 'sell',
    condition: 'fair',
    price: 320,
    seller: charlie._id,
    expiresAt: futureExpiry,
    status: 'available',
    coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80'],
  });

  const l4 = await Listing.create({
    title: 'Introduction to Algorithms (CLRS)',
    titleNormalized: 'introduction to algorithms (clrs)',
    author: 'Cormen, Leiserson, Rivest, Stein',
    department: 'Computer Science',
    semester: 3,
    subject: 'Data Structures & Algorithms',
    courseCode: 'CS302',
    listingType: 'sell',
    condition: 'good',
    price: 550,
    seller: alice._id,
    expiresAt: futureExpiry,
    status: 'available',
    coverUrl: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777f?w=600&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1532012164546-f432f2e3777f?w=600&auto=format&fit=crop&q=80'],
  });

  const l5 = await Listing.create({
    title: 'Digital Signal Processing: Principles & Applications',
    titleNormalized: 'digital signal processing: principles & applications',
    author: 'Proakis, Manolakis',
    department: 'Electronics',
    semester: 6,
    subject: 'DSP',
    courseCode: 'EC601',
    listingType: 'sell',
    condition: 'like new',
    price: 380,
    seller: bob._id,
    expiresAt: futureExpiry,
    status: 'available',
    coverUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=600&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=600&auto=format&fit=crop&q=80'],
  });

  const l6 = await Listing.create({
    title: 'Thermodynamics: An Engineering Approach',
    titleNormalized: 'thermodynamics: an engineering approach',
    author: 'Yunus Cengel, Michael Boles',
    department: 'Mechanical',
    semester: 3,
    subject: 'Applied Thermodynamics',
    courseCode: 'ME303',
    listingType: 'sell',
    condition: 'fair',
    price: 280,
    seller: charlie._id,
    expiresAt: futureExpiry,
    status: 'available',
    coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80'],
  });

  const l7 = await Listing.create({
    title: 'Linear Algebra and Its Applications',
    titleNormalized: 'linear algebra and its applications',
    author: 'Gilbert Strang',
    department: 'Mathematics',
    semester: 2,
    subject: 'Linear Algebra',
    courseCode: 'MA201',
    listingType: 'sell',
    condition: 'good',
    price: 350,
    seller: diana._id,
    expiresAt: futureExpiry,
    status: 'sold',
    buyer: bob._id,
    soldAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    coverUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80'],
  });

  // 3 free giveaway listings
  const l8 = await Listing.create({
    title: 'Engineering Mathematics Formula Handbook',
    titleNormalized: 'engineering mathematics formula handbook',
    author: 'Erwin Kreyszig',
    department: 'Mathematics',
    semester: 1,
    subject: 'Engineering Math',
    courseCode: 'MA101',
    listingType: 'free',
    condition: 'fair',
    price: 0,
    seller: diana._id,
    expiresAt: futureExpiry,
    status: 'available',
    coverUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80'],
  });

  const l9 = await Listing.create({
    title: 'Workshop Practice Manual',
    titleNormalized: 'workshop practice manual',
    author: 'H.S. Bawa',
    department: 'Mechanical',
    semester: 1,
    subject: 'Mechanical Workshop',
    courseCode: 'ME102',
    listingType: 'free',
    condition: 'good',
    price: 0,
    seller: charlie._id,
    expiresAt: futureExpiry,
    status: 'available',
    coverUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=600&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=600&auto=format&fit=crop&q=80'],
  });

  const l10 = await Listing.create({
    title: 'Basic Electrical Engineering Notes & Solved Papers',
    titleNormalized: 'basic electrical engineering notes & solved papers',
    author: 'D.C. Kulshreshtha',
    department: 'Electrical',
    semester: 2,
    subject: 'BEE',
    courseCode: 'EE201',
    listingType: 'free',
    condition: 'fair',
    price: 0,
    seller: bob._id,
    expiresAt: futureExpiry,
    status: 'available',
    coverUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=80'],
  });

  // 2 swap listings
  const l11 = await Listing.create({
    title: 'Computer Networks: A Systems Approach',
    titleNormalized: 'computer networks: a systems approach',
    author: 'Peterson & Davie',
    department: 'Computer Science',
    semester: 5,
    subject: 'Networks',
    courseCode: 'CS501',
    listingType: 'swap',
    condition: 'good',
    price: 0,
    swapFor: 'Operating System Concepts (Silberschatz)',
    seller: alice._id,
    expiresAt: futureExpiry,
    status: 'available',
    coverUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&auto=format&fit=crop&q=80'],
  });

  const l12 = await Listing.create({
    title: 'Fluid Mechanics Fundamentals',
    titleNormalized: 'fluid mechanics fundamentals',
    author: 'Frank White',
    department: 'Mechanical',
    semester: 4,
    subject: 'Fluid Dynamics',
    courseCode: 'ME402',
    listingType: 'swap',
    condition: 'like new',
    price: 0,
    swapFor: 'Machine Design by Shigley',
    seller: charlie._id,
    expiresAt: futureExpiry,
    status: 'reserved',
    reservedFor: diana._id,
    coverUrl: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600&auto=format&fit=crop&q=80'],
  });

  console.log('[DemoSeed] Creating 4 requests in different states...');
  // Request 1: Completed
  const req1 = await Request.create({
    listing: l7._id,
    seller: diana._id,
    buyer: bob._id,
    status: 'completed',
    agreedPrice: 350,
    meetupPoint: meetupPoints[0]._id,
    dualConfirmedBy: [diana._id, bob._id],
    completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  });

  // Request 2: Completed (for Alice's sold listing l4)
  const req4 = await Request.create({
    listing: l4._id,
    seller: alice._id,
    buyer: diana._id,
    status: 'completed',
    agreedPrice: 500,
    meetupPoint: meetupPoints[0]._id,
    dualConfirmedBy: [alice._id, diana._id],
    completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  });

  // Request 3: Accepted / Reserved
  const req2 = await Request.create({
    listing: l12._id,
    seller: charlie._id,
    buyer: diana._id,
    status: 'accepted',
    offeredBook: 'Machine Design 10th Ed.',
    meetupPoint: meetupPoints[1]._id,
  });

  // Request 4: Pending
  const req3 = await Request.create({
    listing: l1._id,
    seller: alice._id,
    buyer: charlie._id,
    status: 'pending',
    message: 'Hi Alice, can we meet at the Central Library this Friday?',
    agreedPrice: 420,
    meetupPoint: meetupPoints[0]._id,
  });

  console.log('[DemoSeed] Creating 1 conversation with messages and offer...');
  const conv = await Conversation.create({
    listing: l1._id,
    buyer: charlie._id,
    seller: alice._id,
    lastMessage: 'I accept your offer of ₹420!',
    lastMessageAt: new Date(),
  });

  await Message.create([
    {
      conversation: conv._id,
      sender: charlie._id,
      type: 'text',
      text: 'Hi Alice, is this textbook still available?',
    },
    {
      conversation: conv._id,
      sender: charlie._id,
      type: 'offer',
      text: 'Offered ₹420',
      offerAmount: 420,
      offerStatus: 'accepted',
    },
    {
      conversation: conv._id,
      sender: alice._id,
      type: 'text',
      text: 'I accept your offer of ₹420! Feel free to send a request.',
    },
  ]);

  console.log('[DemoSeed] Creating 2 reviews...');
  await Review.create([
    {
      request: req1._id,
      listing: l7._id,
      seller: diana._id,
      reviewer: bob._id,
      rating: 5,
      comment: 'Excellent condition book, punctual handover at the Central Library!',
    },
    {
      request: req4._id,
      listing: l4._id,
      seller: alice._id,
      reviewer: diana._id,
      rating: 5,
      comment: 'Super helpful notes included inside, great seller to trade with.',
    },
  ]);

  console.log('[DemoSeed] Demo seed completed successfully!');
}

// Allow CLI execution: node src/seeds/demo.js
if (process.argv[1]?.endsWith('demo.js')) {
  mongoose
    .connect(env.MONGODB_URI)
    .then(async () => {
      await seedDemoData();
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[DemoSeed] Execution failed:', err);
      process.exit(1);
    });
}

