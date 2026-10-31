# Campus Book Exchange Platform

A modern, full-stack, peer-to-peer textbook exchange and marketplace designed specifically for university students. Students can list textbooks for **sale (in rupees)**, **free giveaway**, or **direct swap**, browse with department and semester filters, arrange on-campus meetups, negotiate price offers via real-time chat, confirm physical handovers, and rate sellers.

---

## Architecture & Technology Stack

- **Frontend**: React 18, Vite, React Router 6, Tailwind CSS, Lucide React icons
- **Backend API**: Node.js, Express, Mongoose (MongoDB)
- **Real-Time WebSockets**: Socket.IO for instant messaging, read receipts, and live price offers
- **Authentication**: JWT stored in secure `httpOnly` cookies with session versioning; local passwords hashed with `bcrypt`; Google OAuth 2.0 integration
- **Validation**: Schema-first input validation with Zod
- **Media Uploads**: Multer memory storage with Cloudinary image optimization
- **Background Jobs**: Automated cron tasks for listing expiration reminders and status transitions
- **Testing**: Vitest, Supertest, MongoMemoryServer (124+ automated tests covering all 9 build phases)

---

## Directory Structure

```text
├── client/                     # React + Vite frontend application
│   ├── src/
│   │   ├── api/                # API client functions (Axios/fetch wrappers)
│   │   ├── components/         # Reusable UI modals, banners, cards, navbar
│   │   ├── context/            # AuthContext, SocketContext
│   │   ├── pages/              # Route pages (Browse, ListingDetail, Chat, Admin, etc.)
│   │   └── App.jsx             # Main router & layout
├── server/                     # Express REST API & Socket.IO server
│   ├── src/
│   │   ├── config/             # Environment, database, passport configurations
│   │   ├── controllers/        # Express HTTP route controllers
│   │   ├── jobs/               # Expiry and notification cron jobs
│   │   ├── middleware/         # Auth, roles, error handlers, upload, zod validation
│   │   ├── models/             # Mongoose schemas (User, Listing, Request, Review, etc.)
│   │   ├── routes/             # REST route declarations
│   │   ├── seeds/              # Initial admin & demo data seeders
│   │   ├── services/           # Pure business logic and database queries
│   │   └── socket/             # Socket.IO connection & event handlers
│   └── tests/                  # Vitest integration test suites (step1 - step9)
└── package.json                # Workspace root orchestrator
```

---

## Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or later
- **MongoDB**: Local MongoDB instance or MongoDB Atlas cluster URI

### 2. Environment Configuration
Copy `.env.example` in `server/`:
```bash
cd server
cp .env.example .env
```

| Variable | Description | Default / Example |
|---|---|---|
| `PORT` | API server port | `5000` |
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` |
| `CLIENT_URL` | Frontend origin for CORS and cookie cookies | `http://localhost:5173` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/book_exchange` |
| `JWT_SECRET` | Secret key for signing tokens (minimum 32 characters) | `super_secret_jwt_key_at_least_32_characters_long` |
| `JWT_EXPIRES_IN` | Token expiration duration | `7d` |
| `COOKIE_NAME` | Name of the authentication cookie | `token` |
| `ADMIN_EMAIL` | Initial administrator email for seeding | `admin@college.edu` |
| `ADMIN_PASSWORD` | Initial administrator password | `Admin1234!` |
| `JOBS_ENABLED` | Enable background expiration cron jobs | `true` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud identifier (optional in dev) | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `your_api_key` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `your_api_secret` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID (optional in dev) | `your_google_client_id` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `your_google_client_secret` |

---

## Available Scripts

### Development
```bash
# Start backend server in watch mode (from server/)
npm --prefix server run dev

# Start frontend development server (from client/)
npm --prefix client run dev
```

### Seeding
```bash
# Seed the initial admin account
npm --prefix server run seed:admin

# Seed comprehensive demo dataset (4 verified students, 12 listings, meetups, chat)
npm --prefix server run seed:demo
```

### Testing & Build
```bash
# Run backend test suite (all 124 tests)
npm --prefix server test

# Build frontend production bundle
npm --prefix client run build
```

---

## API Endpoints Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new student account | No |
| `POST` | `/api/auth/login` | Log in and receive httpOnly cookie | No |
| `POST` | `/api/auth/logout` | Clear cookie and session | Yes |
| `POST` | `/api/auth/verify-email` | Verify email address with token | No |
| `POST` | `/api/auth/forgot-password` | Send password reset email | No |
| `POST` | `/api/auth/reset-password` | Reset password using token | No |
| `GET` | `/api/auth/google` | Initiate Google OAuth 2.0 flow | No |

### Profile & Privacy (`/api/me`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/me` | Fetch authenticated student profile | Yes |
| `PUT` | `/api/me` | Update department, semester, avatar, settings | Yes |
| `PUT` | `/api/me/password` | Change password (invalidates other sessions) | Yes |
| `GET` | `/api/me/dashboard` | Seller dashboard analytics & recent stats | Yes |
| `GET` | `/api/me/listings` | Paginated list of student's own listings | Yes |
| `GET` | `/api/me/wishlist` | View wishlisted textbooks | Yes |
| `POST` | `/api/me/wishlist/:id` | Add listing to wishlist | Yes |
| `DELETE` | `/api/me/wishlist/:id` | Remove listing from wishlist | Yes |
| `GET` | `/api/me/export` | Download GDPR/Privacy machine-readable JSON archive | Yes |
| `DELETE` | `/api/me` | Permanently anonymize and delete student account | Yes |

### Listings (`/api/listings`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/listings` | Search and filter listings (with price hints) | Optional |
| `POST` | `/api/listings` | Create a new textbook listing (with image upload) | Yes |
| `GET` | `/api/listings/:id` | Get single listing details | Optional |
| `PUT` | `/api/listings/:id` | Update an existing listing | Yes (Owner) |
| `DELETE` | `/api/listings/:id` | Remove a listing | Yes (Owner) |
| `POST` | `/api/listings/:id/report` | Report a listing for moderation | Yes |

### Requests & Handover (`/api/requests`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/requests/:listingId` | Submit book exchange/purchase request | Yes |
| `GET` | `/api/requests` | List incoming and outgoing requests | Yes |
| `PATCH` | `/api/requests/:id/accept` | Accept request & reserve listing with meetup point | Yes (Seller) |
| `PATCH` | `/api/requests/:id/reject` | Reject request | Yes (Seller) |
| `PATCH` | `/api/requests/:id/cancel` | Cancel pending request | Yes |
| `POST` | `/api/requests/:id/confirm` | Dual physical handover confirmation | Yes |

### Real-Time Chat & Offers (`/api/conversations` & `/api/messages`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/conversations` | List active chat conversations | Yes |
| `POST` | `/api/conversations` | Start conversation for a listing | Yes |
| `GET` | `/api/messages/:convId` | Paginated message history with read receipts | Yes |
| `POST` | `/api/messages/:convId` | Send text message or price offer | Yes |
| `PATCH` | `/api/messages/:id/offer` | Accept or decline negotiated price offer | Yes |

### Reviews, Reports & Trust (`/api/reviews` & `/api/users`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/reviews` | Review seller after completed exchange | Yes (Buyer) |
| `GET` | `/api/users/:id` | Public profile with ratings & review count | No |
| `GET` | `/api/users/:id/reviews` | Paginated reviews received by a seller | No |
| `POST` | `/api/users/:id/report` | Report student user for misconduct | Yes |
| `POST` | `/api/users/:id/block` | Block abusive user from search/chat | Yes |
| `DELETE` | `/api/users/:id/block` | Unblock user | Yes |

### Administration (`/api/admin`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/admin/reports` | View moderation reports queue | Admin |
| `PATCH` | `/api/admin/reports/:id` | Resolve or dismiss report | Admin |
| `DELETE` | `/api/admin/listings/:id` | Remove inappropriate listing & notify seller | Admin |
| `PATCH` | `/api/admin/users/:id/ban` | Ban abusive user and de-list their books | Admin |
| `GET` | `/api/admin/meetup-points` | List campus meetup locations | Admin |
| `POST` | `/api/admin/meetup-points` | Create designated campus exchange zone | Admin |
| `PATCH` | `/api/admin/meetup-points/:id` | Edit or toggle active status of meetup zone | Admin |

---

## Production Deployment Guide

### 1. Database (MongoDB Atlas)
- Create an M0/M10 MongoDB Atlas cluster.
- Whitelist host IP addresses (`0.0.0.0/0` with secure user authentication).
- Set `MONGODB_URI` in server environment.

### 2. Backend API (Render / Railway / Fly.io)
- Set build command: `npm install`
- Set start command: `npm start`
- Configure `PORT`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `JOBS_ENABLED=true`.
- Health check path: `GET /api/health`.
- If behind a reverse proxy (Render/Railway), `app.set('trust proxy', 1)` ensures secure cookies function properly.

### 3. Frontend Client (Vercel / Netlify)
- Set root directory: `client`
- Set build command: `npm run build`
- Set publish directory: `dist`
- Configure SPA rewrite redirect rule in `client/public/_redirects`:
  ```text
  /*    /index.html   200
  ```
- Set `VITE_API_BASE_URL` pointing to the deployed API origin.

---

## License
MIT © Campus Book Exchange
