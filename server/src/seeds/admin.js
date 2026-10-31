import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { env } from '../config/env.js';

export async function seedAdmin() {
  const email = env.ADMIN_EMAIL || 'admin@college.edu';
  const password = env.ADMIN_PASSWORD || 'Admin1234!';

  let admin = await User.findOne({ email });
  if (admin) {
    if (admin.role !== 'admin') {
      admin.role = 'admin';
      await admin.save();
      console.log(`[SeedAdmin] Updated existing user ${email} to admin role.`);
    } else {
      console.log(`[SeedAdmin] Admin ${email} already exists.`);
    }
    return admin;
  }

  admin = await User.create({
    name: 'Platform Admin',
    email,
    password,
    role: 'admin',
    department: 'Other',
    emailVerified: true,
    isVerified: true,
    authProviders: ['local'],
    sessionVersion: 0,
  });

  console.log(`[SeedAdmin] Successfully created initial admin: ${email}`);
  return admin;
}

// Allow standalone execution: node src/seeds/admin.js
if (process.argv[1]?.endsWith('admin.js')) {
  mongoose
    .connect(env.MONGODB_URI)
    .then(async () => {
      await seedAdmin();
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[SeedAdmin] Failed:', err);
      process.exit(1);
    });
}

