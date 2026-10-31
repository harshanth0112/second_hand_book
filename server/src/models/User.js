import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics',
  'Electrical',
  'Mechanical',
  'Civil',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Commerce',
  'Management',
  'Arts',
  'Other',
];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address',
      ],
    },
    // Password is optional for Google-only users
    password: {
      type: String,
      minlength: [8, 'Password must be at least 8 characters'],
      default: null,
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    // Keep for backward compatibility with Step 1
    college: {
      type: String,
      trim: true,
      default: '',
    },
    department: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator: function (v) {
          return !v || DEPARTMENTS.includes(v);
        },
        message: (props) => `${props.value} is not a valid department`,
      },
    },
    semester: {
      type: Number,
      min: [1, 'Semester must be between 1 and 8'],
      max: [8, 'Semester must be between 1 and 8'],
      default: null,
    },
    avatar: {
      type: String,
      default: '',
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    wishlist: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Listing',
      default: [],
    },
    blockedUsers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    // Authentication providers
    authProviders: {
      type: [String],
      default: ['local'],
    },
    // Google OAuth
    googleId: {
      type: String,
      sparse: true,
      index: true,
      default: null,
    },
    // Session versioning for invalidating old JWTs on password change/reset
    sessionVersion: {
      type: Number,
      default: 0,
    },
    // Audit timestamp for password changes (not used for session invalidation)
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    // Email verification
    emailVerified: {
      type: Boolean,
      default: false,
    },
    // isVerified kept for backward compatibility with Step 1
    isVerified: {
      type: Boolean,
      default: false,
    },
    // Stored as SHA-256 hash; raw token is never persisted
    emailVerificationTokenHash: {
      type: String,
      default: null,
      index: { sparse: true },
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
    },
    // Password reset — stored as SHA-256 hash; raw token is never persisted
    passwordResetTokenHash: {
      type: String,
      default: null,
      index: { sparse: true },
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before save (only when modified and non-null)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || this.password == null) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Compare a candidate password against the stored hash.
 * Returns false for Google-only users who have no password.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Returns the "Me" projection — fields the authenticated user can see about themselves.
 * Never includes: password, googleId, sessionVersion, token hashes.
 */
userSchema.methods.toMeJSON = function () {
  return {
    _id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    // Step 1 backward compat fields
    college: this.college,
    isVerified: this.isVerified,
    // Step 2 fields
    emailVerified: this.emailVerified,
    authProviders: this.authProviders,
    department: this.department,
    semester: this.semester,
    avatar: this.avatar,
    emailNotifications: this.emailNotifications,
    createdAt: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
  };
};

/**
 * Returns the public projection — fields visible to other users.
 */
userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id.toString(),
    name: this.name,
    avatar: this.avatar,
    department: this.department,
    semester: this.semester,
    createdAt: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
  };
};

export const User = mongoose.model('User', userSchema);
export { DEPARTMENTS };
