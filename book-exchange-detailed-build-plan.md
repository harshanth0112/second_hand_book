# Book Exchange: Detailed Build Plan

Companion to `book-exchange-ide-instructions.md`.

- The instructions file says what the app is and how to write code for it.
- This file says exactly what to build in each step, what each endpoint accepts and returns, and how to prove it works.
- If the two files disagree, the step contents in this file win, and everything else in the instructions file still applies. If something is still unclear, ask before coding.

## 0. How to use this file

1. Read the instructions file, then section 1 of this file. Section 1 applies to every step.
2. Build one step at a time, in order. Do not start a step before the previous step's acceptance list passes.
3. For each step: list the files you will touch, write the code, write the tests, run everything, then report using the format in section 12.
4. Do not build anything that belongs to a later step, even if it looks easy. Leave a `// TODO(step N)` comment instead.

---

## 1. Global contracts (apply to every step)

### 1.1 Conventions

| Topic | Rule |
|---|---|
| Base path | All API routes start with `/api`. JSON only. |
| Field names | `camelCase`. Ids are 24-character hex strings in a field called `_id`. |
| Dates | ISO 8601 strings in UTC. |
| Money | Whole rupees as integers. No decimals, no currency symbol in data. |
| Auth cookie | Name `token`. `httpOnly: true`, `sameSite: "lax"`, `secure: true` in production, `maxAge` equal to the JWT lifetime. |
| JWT payload | `{ sub: <userId>, role }`, signed with `JWT_SECRET`, lifetime from `JWT_EXPIRES_IN`. |
| Client requests | Always `credentials: "include"`. |
| Unknown body fields | Rejected with 400 (use `zod` `.strict()`). |

### 1.2 Success responses

| Case | Status | Body |
|---|---|---|
| Read one | 200 | The object itself |
| Read many | 200 | `{ "items": [...], "page": 1, "limit": 12, "total": 40, "totalPages": 4 }` |
| Create | 201 | The created object |
| Update | 200 | The updated object |
| Delete, logout, mark read | 204 | No body |

### 1.3 Error responses

Every error has this shape. `errors` appears only for validation failures.

```json
{ "message": "Validation failed", "errors": [{ "field": "email", "message": "Enter a valid email" }] }
```

| Status | Use for |
|---|---|
| 400 | Validation failure, malformed id, bad query |
| 401 | Missing, invalid or expired token; wrong credentials |
| 403 | Logged in but not allowed (not owner, wrong role, banned, email not verified) |
| 404 | Not found, or hidden from this user (removed listing) |
| 409 | Conflict: duplicate, or the state no longer allows the action |
| 429 | Rate limit |
| 500 | Unexpected error. Message is always "Something went wrong", no stack trace |

Login failures always return 401 with the message `Invalid email or password`, whether the email is unknown, the password is wrong, or the account only uses Google. This avoids revealing which emails exist.

### 1.4 Shared enums (one constants file per side, same values)

| Name | Values |
|---|---|
| ROLE | `user`, `admin` |
| LISTING_TYPE | `sell`, `free`, `swap` |
| CONDITION | `like new`, `good`, `fair` |
| LISTING_STATUS | `available`, `reserved`, `sold`, `removed`, `expired` |
| REQUEST_STATUS | `pending`, `accepted`, `rejected`, `cancelled`, `completed` |
| MESSAGE_TYPE | `text`, `offer`, `system` |
| OFFER_STATUS | `pending`, `accepted`, `declined` |
| REPORT_STATUS | `open`, `resolved` |
| REPORT_REASON | `spam`, `fake_listing`, `wrong_price`, `inappropriate`, `abusive_user`, `other` |
| NOTIFICATION_TYPE | `request_received`, `request_accepted`, `request_rejected`, `request_cancelled`, `handover_confirmed`, `message`, `wanted_match`, `price_drop`, `listing_expiring`, `listing_removed`, `review_received` |
| DEPARTMENT | Computer Science, Information Technology, Electronics, Electrical, Mechanical, Civil, Mathematics, Physics, Chemistry, Commerce, Management, Arts, Other |

### 1.5 User shapes in responses

| Shape | Fields | Where used |
|---|---|---|
| `Me` | `_id`, `name`, `email`, `role`, `emailVerified`, `authProviders`, `department`, `semester`, `avatar`, `emailNotifications`, `createdAt` | Only for the logged-in user's own data |
| `PublicUser` | `_id`, `name`, `avatar`, `department`, `semester`, `createdAt` | Anywhere another user appears |

Never return `passwordHash`, `googleId`, tokens, `blockedUsers`, or another user's email.

### 1.6 Validation limits

| Field | Rule |
|---|---|
| name | 2 to 60 characters, trimmed |
| email | valid format, up to 254 characters, stored lowercase |
| password | 8 to 72 characters, at least one letter and one number |
| title | 1 to 150 |
| author | 1 to 100 |
| subject | 1 to 60 |
| isbn | 10 or 13 digits after removing hyphens |
| courseCode | up to 20 |
| semester | integer 1 to 8 |
| price | `sell`: integer 1 to 100000. `free`: exactly 0. `swap`: exactly 0 |
| swapFor | 1 to 150, required for `swap` only |
| note | up to 500 |
| request message | up to 500 |
| offeredBook | 1 to 150, required for swap requests |
| chat text | 1 to 1000 after trimming |
| rating | integer 1 to 5 |
| review comment, report details | up to 500 |

### 1.7 Pagination and sorting

`page` defaults to 1 (minimum 1). `limit` defaults to 12 (maximum 50). Anything out of range returns 400. Sort values are checked against a whitelist for each endpoint, never passed through to MongoDB.

### 1.8 Schema additions to section 5 of the instructions file

| Collection | Add |
|---|---|
| users | `passwordChangedAt` (Date), `emailNotifications` (Boolean, default true) |
| listings | `titleNormalized` (String, indexed: lowercase, trimmed, single spaces), `reminderSentAt` (Date) |
| conversations | `agreedPrice` (Number, optional) |
| messages | `offerStatus` (OFFER_STATUS, only for `offer` messages) |
| requests | `agreedPrice` (Number, optional) |

### 1.9 Test conventions

- Vitest and Supertest for the API, with `mongodb-memory-server` so tests never touch Atlas.
- `app.js` exports the Express app without calling `listen`, so tests import it directly. `server.js` calls `listen`.
- One test file per route file, plus one per service when the service has rules worth testing alone.
- Each test creates its own data through small factory functions (`createUser`, `createListing`, ...). No test depends on another test's data.
- Rate limiters are disabled when `NODE_ENV=test`.
- Test names describe behavior, for example `rejects a second accept on the same listing with 409`.

### 1.10 Security checks that apply everywhere

- Every protected route uses `requireAuth`. Every owner-only route checks ownership in the service.
- The user id always comes from the verified token, never from the body.
- Any status change uses an atomic update with the expected current status in the filter.
- User text is never used to build a query operator or a regular expression without escaping.

---

## STEP 1. Foundation and email login

**Goal:** A running server and client where a person can register, log in, see a protected page and log out.

**Packages:** server: `express`, `mongoose`, `dotenv`, `cors`, `helmet`, `cookie-parser`, `express-rate-limit`, `jsonwebtoken`, `bcryptjs`, `zod`. Dev: `vitest`, `supertest`, `mongodb-memory-server`. Client: `react`, `react-dom`, `react-router-dom`, `tailwindcss`, `@tailwindcss/vite`, `vite`, `@vitejs/plugin-react`.

### 1.1 Server files

```
server/src/config/env.js          read and check env, export a frozen object
server/src/config/db.js           connect to MongoDB
server/src/utils/ApiError.js
server/src/utils/asyncHandler.js
server/src/utils/logger.js        small wrapper, silent in tests
server/src/middleware/validate.js
server/src/middleware/requireAuth.js
server/src/middleware/rateLimit.js
server/src/middleware/errorHandler.js
server/src/models/User.js
server/src/validators/auth.js
server/src/services/authService.js
server/src/controllers/authController.js
server/src/routes/auth.js
server/src/routes/me.js
server/src/app.js                 builds the Express app
server/src/server.js              connects to the database and listens
server/.env.example
```

### 1.2 Server behavior

- `env.js` requires `MONGO_URI`, `JWT_SECRET` (at least 32 characters), `CLIENT_URL`. It defaults `PORT` to 5000, `JWT_EXPIRES_IN` to `1h`, `NODE_ENV` to `development`. A missing value stops startup with a message naming it.
- Middleware order in `app.js`: `helmet`, `cors` (origin `CLIENT_URL`, credentials true), `express.json` (limit `10kb`), `cookie-parser`, routes, a 404 handler, the error handler. Also add `GET /api/health` returning `{ "ok": true }`.
- The error handler turns `ApiError`, zod errors, Mongoose validation errors, duplicate key errors (code 11000 becomes 409) and invalid ObjectId casts into the shapes in section 1.3.
- `validate(schema, source)` parses `body`, `query` or `params`, replaces the original with the parsed value, and passes zod issues to the error handler as 400 with `errors`.
- `requireAuth` reads the `token` cookie, verifies it, loads the user without `passwordHash`, and attaches it as `req.user`. It returns 401 when the cookie is missing, invalid, expired or the user no longer exists, and 403 with `Account unavailable` for banned or deleted users.

### 1.3 Endpoints

| Route | Body | Success | Errors |
|---|---|---|---|
| `POST /api/auth/register` | `{ name, email, password }` | 201 `Me`, sets cookie | 400 validation, 409 `Email already registered` |
| `POST /api/auth/login` | `{ email, password }` | 200 `Me`, sets cookie | 400 validation, 401 generic, 403 banned |
| `POST /api/auth/logout` | none | 204, clears cookie | none (safe to call when logged out) |
| `GET /api/me` | none | 200 `Me` | 401 |

Register service steps:
1. Lowercase and trim the email.
2. Hash the password with bcrypt, cost 10.
3. Create the user (`role: "user"`, `emailVerified: false`, `authProviders: ["local"]`). Rely on the unique index to detect duplicates and convert the duplicate key error to 409. Do not check first and then insert.
4. Sign the JWT and set the cookie.

Login service steps:
1. Find the user by lowercase email, selecting `passwordHash`.
2. If no user or no `passwordHash`, still run one bcrypt comparison against a fixed dummy hash, then return 401. This keeps response time similar.
3. If the password is wrong, 401 with the generic message.
4. If `isBanned` or `deletedAt` is set, 403 `Account unavailable`.
5. Sign the JWT and set the cookie.

Rate limits (skipped when `NODE_ENV=test`): login 10 per 15 minutes per IP, register 5 per hour per IP.

### 1.4 Client files

```
client/vite.config.js                    React and Tailwind plugins, proxy /api to http://localhost:5000
client/src/index.css                     @import "tailwindcss"
client/src/main.jsx
client/src/App.jsx                       routes
client/src/api/client.js                 request helper, credentials, error parsing
client/src/api/auth.js
client/src/context/AuthContext.jsx
client/src/routes/ProtectedRoute.jsx
client/src/pages/Login.jsx
client/src/pages/Register.jsx
client/src/pages/Home.jsx                placeholder, shows the user's name
client/src/components/Navbar.jsx
client/src/components/FormField.jsx      label, input, error text
client/.env.example
```

### 1.5 Client behavior

- `client.js` exports one `request(path, { method, body })` function. It parses JSON, and on a non-OK response throws an error object with `status`, `message` and `fieldErrors` (a map of field to message built from the `errors` array). On a 401 from any route other than login and register, it calls a registered `onUnauthorized` callback.
- `AuthContext` provides `user`, `loading`, `login`, `register`, `logout`. On start it calls `GET /api/me`; a 401 simply means no user. It registers `onUnauthorized` to clear the user.
- `ProtectedRoute` shows a loading indicator while `loading` is true, redirects to `/login` (remembering the original path) when there is no user, and returns to that path after login.
- Login and Register pages: controlled inputs, field-level errors under each input, a general error above the button, the submit button disabled and labeled `Signing in...` or `Creating account...` while sending, links between the two pages.
- Navbar shows Login and Register when logged out, and the user's name and a Logout button when logged in.
- Layout works at 360 px wide. All inputs have labels.

### 1.6 Tests

| Area | Cases |
|---|---|
| Register | creates a user and sets the cookie; response has no `passwordHash`; duplicate email in a different letter case returns 409; password without a number returns 400 with a `password` field error; an extra field returns 400; email is stored lowercase |
| Login | success sets the cookie and returns `Me`; wrong password and unknown email return 401 with the same message; banned user returns 403; cookie is `httpOnly` |
| Logout | clears the cookie and returns 204, also when not logged in |
| Me | 401 without a cookie; 401 with a tampered token; 401 with an expired token; 200 with a valid cookie and no sensitive fields |

### 1.7 Acceptance

- [ ] Register, log in, open a protected page, log out, all in the browser
- [ ] Refreshing the page keeps the user logged in
- [ ] Visiting a protected page while logged out redirects to login and returns afterward
- [ ] Wrong password and duplicate email show clear messages
- [ ] No response contains `passwordHash`
- [ ] Tests and linter pass

---

## STEP 2. Email verification, password reset and Google login

**Goal:** Verified accounts, recoverable passwords, and one-click Google sign-in that ends in the same cookie.

**Packages:** `passport`, `passport-google-oauth20`, `nodemailer`.

### 2.1 Tokens

- Generate with `crypto.randomBytes(32).toString("hex")`. Store only the SHA-256 hash and an expiry. Verification links last 24 hours, reset links 1 hour.
- Add `passwordChangedAt` to users. `requireAuth` rejects a token whose `iat` is earlier than `passwordChangedAt`, so a reset or password change logs out other sessions.

### 2.2 Endpoints

| Route | Body | Success | Notes |
|---|---|---|---|
| `GET /api/auth/verify-email/:token` | none | 200 `{ message }` | Marks the email verified and clears the token. 400 for invalid or expired |
| `POST /api/auth/resend-verification` | none | 204 | Logged in. 409 if already verified. Limit 3 per hour |
| `POST /api/auth/forgot-password` | `{ email }` | 200 same message every time | Never reveals whether the email exists. Limit 5 per hour per IP |
| `POST /api/auth/reset-password` | `{ token, password }` | 204 | Sets the hash, adds `local` to `authProviders`, sets `passwordChangedAt`, clears the token |
| `PUT /api/me/password` | `{ currentPassword, newPassword }` | 204, keeps the current session by issuing a fresh cookie | 401 if the current password is wrong. Not available to Google-only accounts (409) |
| `GET /api/auth/google` | none | 302 to Google | Passport with `session: false` and the `state` check |
| `GET /api/auth/google/callback` | none | 302 to `CLIENT_URL` with the cookie set | On any failure, 302 to `CLIENT_URL/login?error=oauth_failed` |

### 2.3 Google callback logic

1. Find a user by `googleId`. If found, continue.
2. Otherwise, if the Google email is verified and a user has that email, link: set `googleId`, add `google` to `authProviders`, set `emailVerified` true.
3. Otherwise create a user with `emailVerified: true`, `authProviders: ["google"]`, no `passwordHash`, and the Google name and picture.
4. Banned or deleted users are redirected with the error flag and receive no cookie.
5. Set the same cookie as email login and redirect to the client.

### 2.4 Email sending

`utils/mailer.js` exposes `sendMail({ to, subject, text })`. When `EMAIL_HOST` is empty (development and tests), it logs the message instead of sending, so links can be copied from the console. Message text includes the full link built from `CLIENT_URL`.

### 2.5 Client

- Pages: `VerifyEmail` (reads the token from the URL and calls the API), `ForgotPassword`, `ResetPassword`.
- Login page gets a Continue with Google link pointing to `/api/auth/google`, and shows a message when the URL contains `error=oauth_failed`.
- A banner under the navbar appears while `emailVerified` is false, with a Resend button and a cooldown.
- Profile page (basic version): edit name, department, semester, and change password.
- Add `GET` and `PUT /api/me` for profile edits. Only `name`, `department`, `semester`, `avatar`, `emailNotifications` are editable.

### 2.6 Tests

| Area | Cases |
|---|---|
| Verification | valid token verifies; used token fails; expired token fails; resend is blocked when already verified |
| Reset | unknown email returns the same 200; valid token changes the password; old password no longer works; old token from before the reset returns 401; a reset token cannot be reused |
| Change password | wrong current password returns 401; success returns a working cookie |
| Google | mock the Passport strategy: new Google user is created once; a second login finds the same user; an existing email is linked, not duplicated; banned user gets no cookie |

### 2.7 Acceptance

- [ ] Signup produces a verification email (visible in the console) and the link verifies the account
- [ ] Forgot and reset password work end to end
- [ ] Google login works with real credentials and creates exactly one user
- [ ] Google-only users cannot log in with a password until they reset it
- [ ] Tests and linter pass

---

## STEP 3. Listings: create, edit, delete, images

**Goal:** Verified users can list books of any type, upload photos, and manage their own listings.

**Packages:** `multer` (memory storage), `cloudinary`.

### 3.1 Files

```
server/src/models/Listing.js
server/src/validators/listing.js
server/src/services/listingService.js
server/src/services/imageService.js        upload to and delete from Cloudinary
server/src/controllers/listingController.js
server/src/routes/listings.js
server/src/middleware/optionalAuth.js      sets req.user when a valid cookie exists, never fails
server/src/middleware/requireVerified.js   403 when emailVerified is false
server/src/middleware/upload.js            multer limits
client/src/constants/index.js              enums and department list
client/src/api/listings.js
client/src/components/ListingForm.jsx
client/src/components/ImageUploader.jsx
client/src/pages/Sell.jsx
client/src/pages/EditListing.jsx
client/src/pages/MyListings.jsx
client/src/pages/ListingDetail.jsx
```

### 3.2 Endpoints

| Route | Access | Behavior |
|---|---|---|
| `POST /api/listings` | Logged in, verified | Body per section 1.6. Server sets `seller`, `status: "available"`, `views: 0`, `expiresAt` (now plus 60 days), `titleNormalized`. Returns 201 with the listing |
| `PUT /api/listings/:id` | Owner | Same body. Allowed only while `available` (otherwise 409). Re-checks the listing type rules |
| `DELETE /api/listings/:id` | Owner or admin | Sets `status: "removed"`, returns 204. A `reserved` listing returns 409 until the reservation is cancelled |
| `POST /api/listings/:id/images` | Owner | Multipart field `images`, up to 4 files in total on the listing, each up to 2 MB, JPEG, PNG or WebP. Uploads to Cloudinary, saves URLs, returns the listing |
| `DELETE /api/listings/:id/images/:index` | Owner | Removes one image (and deletes it from Cloudinary) |
| `POST /api/listings/:id/relist` | Owner | Only when `expired`. Sets `available` and a new `expiresAt`. 409 otherwise |
| `GET /api/listings/:id` | Public | Seller as `PublicUser`. `removed` returns 404 unless the viewer is the owner or an admin. Increments `views` with `$inc` when the viewer is not the owner |
| `GET /api/me/listings` | Logged in | Paginated, newest first, optional `status` filter, excludes `removed` |

Validation uses a zod discriminated union on `listingType`:
- `sell`: `price` integer 1 to 100000, `swapFor` not allowed.
- `free`: `price` must be 0 (or omitted and set to 0), `swapFor` not allowed.
- `swap`: `swapFor` required, `price` forced to 0.

Rejected fields from the client: `seller`, `status`, `views`, `images`, `expiresAt`, `buyer`, `reservedFor`.

### 3.3 Client behavior

- Listing form has a type selector. Free hides the price and sends 0. Swap shows the swap-for field. Semester and department are dropdowns from the constants file.
- Image uploader shows previews, enforces the 4-image and 2 MB limits before sending, and shows per-file errors.
- My Listings shows a status badge, edit and delete buttons (delete asks for confirmation), and a Relist button on expired listings.
- Listing detail shows images, a type badge (Free or Swap for X), seller name, tags, and condition. The Request and Chat buttons arrive in later steps.

### 3.4 Tests

| Area | Cases |
|---|---|
| Create | unverified user gets 403; `free` with price 50 returns 400; `swap` without `swapFor` returns 400; `sell` with price 0 returns 400; client-sent `status` or `seller` returns 400; server-set fields are correct |
| Edit and delete | non-owner gets 403; edit of a reserved listing returns 409; delete sets `removed`; removed listing returns 404 for the public |
| Images | fifth image is rejected; wrong file type returns 400; oversized file returns 400 (mock Cloudinary) |
| Views | owner viewing does not increase views; a visitor does |
| Relist | works only for expired listings |

### 3.5 Acceptance

- [ ] A verified user lists a sell, a free and a swap book, each with photos
- [ ] Type rules are enforced on the server even if the form is bypassed
- [ ] Only the owner can edit or delete
- [ ] Tests and linter pass

---

## STEP 4. Search, filters, price hint, ISBN lookup

**Goal:** Buyers can find the right book quickly, and sellers get help pricing and filling in details.

### 4.1 Search endpoint

`GET /api/listings` (Public). Only `available` listings are returned.

| Query | Meaning |
|---|---|
| `q` | Text search on title and author (MongoDB text index) |
| `subject`, `department` | Exact match |
| `semester` | Integer 1 to 8 |
| `condition` | Comma list, matched with `$in` |
| `listingType` | `sell`, `free`, `swap` |
| `minPrice`, `maxPrice` | `$gte` and `$lte` on price. Return 400 when `minPrice` is greater than `maxPrice` |
| `sort` | `newest` (default), `price_asc`, `price_desc`, `relevance` (only valid with `q`) |
| `page`, `limit` | Section 1.7 |

Build the filter from a list of conditions combined with `$and`. Run the find and `countDocuments` together with `Promise.all`. Return only the card fields: `_id`, `title`, `author`, `subject`, `department`, `semester`, `listingType`, `price`, `condition`, `images`, `coverUrl`, `createdAt`, and the seller's `name` and `avatar`. When a user is logged in, exclude listings from sellers they have blocked (arrives in step 8, leave a TODO).

### 4.2 Price hint

`GET /api/listings/price-hint?isbn=...` or `?title=...` (Logged in).

- Aggregation on listings: `listingType: "sell"`, same ISBN (or same `titleNormalized` when no ISBN), `status` in `sold` and `available`, created in the last 12 months, `seller` not the requesting user. Group to `count`, `average`, `min`, `max`.
- Response: `{ "count": 5, "hint": { "average": 320, "min": 250, "max": 400 } }`. When `count` is below 3, return `{ "count": 2, "hint": null }`. Averages are rounded to whole rupees.

### 4.3 ISBN lookup

`GET /api/listings/isbn/:isbn` (Logged in).

- Remove hyphens and check for 10 or 13 digits, otherwise 400.
- Call the Open Library books API with Node's built-in `fetch` and a 5 second timeout.
- Return `{ title, author, coverUrl }`. 404 when nothing is found, 502 when the upstream service fails or times out.
- Cache results in memory for 24 hours (a `Map`) to avoid repeated calls.

### 4.4 Client

- Browse page: `FilterBar` and `BookCard` grid, filters kept in the URL query string so links can be shared and the back button works. Search input is debounced by 300 ms and cancels stale requests. Pagination controls. Loading skeletons, an empty state that suggests clearing filters, and an error state with Retry.
- Pre-fill department and semester filters from the user's profile when they are set and no filter is in the URL.
- Listing form: an ISBN field with a Fill details button (title, author and cover fill in but stay editable), and a price hint line under the price (debounced, shown only when `hint` is not null, never blocking).

### 4.5 Tests

| Area | Cases |
|---|---|
| Search | each filter alone; filters combined; price range reversed returns 400; non-available listings never appear; pagination totals are correct; invalid sort returns 400; an input like `subject[$ne]=x` returns 400 or is ignored, never reaches MongoDB |
| Price hint | returns null with 2 samples; returns correct numbers with 3 or more; excludes the user's own listings; excludes free listings |
| ISBN | invalid format returns 400; success maps fields; upstream failure returns 502 (mock `fetch`) |

### 4.6 Acceptance

- [ ] Filters combine correctly and survive a page refresh
- [ ] The hint appears only with 3 or more matches
- [ ] ISBN fill works and the fields remain editable
- [ ] Tests and linter pass

---

## STEP 5. Requests, reservation, meetups and handover

**Goal:** A book moves safely from available to reserved to sold, and two buyers can never get the same book.

### 5.1 State rules

| Request status | Allowed next | Who | Listing effect |
|---|---|---|---|
| `pending` | `accepted` | Seller | `available` becomes `reserved` |
| `pending` | `rejected` | Seller | none |
| `pending` | `cancelled` | Buyer | none |
| `accepted` | `cancelled` | Seller or buyer | `reserved` returns to `available`, `reservedFor` cleared, `handoverConfirmedBy` cleared |
| `accepted` | `completed` | Both confirmed | `reserved` becomes `sold` |

Any other transition returns 409.

### 5.2 Endpoints

| Route | Access | Behavior |
|---|---|---|
| `POST /api/listings/:id/requests` | Logged in | Body `{ message?, offeredBook? }`. 409 when the listing is not `available`, when the user already has a pending request on it, or when the listing is the user's own (403). `offeredBook` is required for swap listings. Seller is copied from the listing |
| `PATCH /api/requests/:id` | Seller or buyer | Body is one of `{ "action": "accept", "meetupPointId", "meetupTime" }`, `{ "action": "reject" }`, `{ "action": "cancel" }`, `{ "action": "confirmHandover" }`. Validate with a zod discriminated union on `action` |
| `GET /api/requests/sent`, `/received` | Logged in | Paginated, newest first, optional `status` filter, listing summary and the other user as `PublicUser` |
| `GET /api/meetup-points` | Logged in | Active points only |

### 5.3 Accept (the critical operation)

Run inside a MongoDB transaction:
1. Load the request. It must be `pending` and belong to the seller, otherwise 404, 403 or 409.
2. Check the meetup point exists and is active, and `meetupTime` is in the future and within 14 days.
3. Atomically update the listing: filter `{ _id, seller, status: "available" }`, set `status: "reserved"` and `reservedFor: buyer`. If nothing matched, abort and return 409 `Listing is no longer available`.
4. Update the request to `accepted` with `meetupPoint` and `meetupTime`.
5. After the transaction, reject all other pending requests on the listing in one `updateMany`.

### 5.4 Confirm handover

- Only participants of an `accepted` request can confirm, and only once each.
- First confirmation: add the user to `handoverConfirmedBy` with an atomic update whose filter requires `status: "reserved"` and the user not already in the array.
- Second confirmation: one atomic update whose filter requires `status: "reserved"`, `handoverConfirmedBy` of size 1 and not containing this user. It pushes the user, sets `status: "sold"`, `buyer`, `soldAt`, and the request becomes `completed`.

### 5.5 Seed

`server/src/seeds/meetupPoints.js` inserts 5 points (for example Library entrance, Canteen, Main gate, Admin block lobby, Sports complex gate). It is safe to run repeatedly.

### 5.6 Client

- Listing detail: a Request button opening a dialog with a message field, and an offered-book field for swap listings. Hidden for the owner and for listings that are not available.
- Requests page with Sent and Received tabs, status badges, and action buttons that depend on role and status.
- Accept dialog: meetup point dropdown, date-time picker (future only), and short safety tips.
- A Confirm handover button on accepted requests, showing who has already confirmed.

### 5.7 Tests

| Area | Cases |
|---|---|
| Create | own listing returns 403; non-available listing returns 409; duplicate pending request returns 409; swap without `offeredBook` returns 400 |
| Accept | only the seller can accept; accepting sets the listing to `reserved`; other pending requests become `rejected`; a past meetup time returns 400; an inactive meetup point returns 400 |
| Race | two requests on one listing accepted at the same time with `Promise.all`: exactly one returns 200 and the other 409, and the listing has one `reservedFor` |
| Handover | one confirmation keeps the listing `reserved`; two confirmations set `sold` and complete the request; the same user confirming twice returns 409; a stranger returns 403 |
| Cancel | cancelling an accepted request returns the listing to `available` |

### 5.8 Acceptance

- [ ] Full flow in the browser: request, accept with meetup, both confirm, listing shows sold
- [ ] The race test passes repeatedly
- [ ] Tests and linter pass

---

## STEP 6. Chat

**Goal:** Buyers and sellers talk in real time inside the app, with history saved.

**Packages:** `socket.io`, `socket.io-client`, `cookie`.

### 6.1 REST endpoints

| Route | Behavior |
|---|---|
| `POST /api/conversations` | Body `{ listingId }`. 403 for the user's own listing, 403 when either user has blocked the other, 404 for a removed listing. Find or create using an upsert on the unique `{ listing, buyer }` index. Returns the conversation with listing summary and the other user |
| `GET /api/conversations` | Inbox, newest `lastMessageAt` first, each with `unreadCount` (messages from the other person with no `readAt`), computed with one aggregation |
| `GET /api/conversations/:id/messages` | Participant only. Cursor paging: `?before=<messageId>&limit=30`. Returns `{ items, hasMore }`, newest first |
| `PATCH /api/conversations/:id/read` | Marks the other person's unread messages as read, returns 204 |
| `PATCH /api/messages/:id/offer` | Seller only. Body `{ action: "accept" | "decline" }`. Updates `offerStatus`, posts a `system` message, and on accept stores `agreedPrice` on the conversation |

When a request is created from a conversation that has an `agreedPrice`, copy it to the request.

### 6.2 Socket contract

Authenticate in the handshake by reading the `token` cookie from `socket.handshake.headers.cookie`. Reject the connection when the token is invalid, the user is banned, or the user is deleted.

| Event | Direction | Payload | Notes |
|---|---|---|---|
| `conversation:join` | client to server | `{ conversationId }` | Ack `{ ok: true }` or `{ ok: false, error }`. Only the buyer or seller may join |
| `message:send` | client to server | `{ conversationId, type, text?, offerAmount? }` | Ack `{ ok: true, message }` or `{ ok: false, error }`. Saves first, then emits |
| `message:new` | server to room | the message object | Sent to everyone in the conversation room |
| `typing` | both | `{ conversationId, isTyping }` | Relayed to the other user only, never stored |
| `message:read` | both | `{ conversationId }` | Server marks messages read, then notifies the room |

Message rules:
- `text` messages need 1 to 1000 characters after trimming.
- `offer` messages: only the buyer, only on `sell` listings, `offerAmount` an integer from 1 up to the listing price, `offerStatus: "pending"`.
- Users cannot send `system` messages. Only the server creates them.
- Rate limit: 20 messages per 10 seconds per socket, then an error ack.
- Updating a conversation's `lastMessage` and `lastMessageAt` happens in the same service call as saving the message.

### 6.3 Client

- `SocketContext` connects when a user is present and disconnects on logout.
- Chat page: conversation list on the left (stacked above the thread on phones), message thread, input. New messages append immediately and are confirmed by the ack. Auto-scroll to the newest message unless the user has scrolled up. Typing indicator with a 1.5 second timeout. Older messages load when scrolling to the top.
- Offer messages show Accept and Decline buttons to the seller while pending.
- A Chat with seller button on listing detail calls `POST /api/conversations` and opens the thread.
- Navbar badge shows the total unread count.
- Message text is always rendered as text, never as HTML.

### 6.4 Tests

| Area | Cases |
|---|---|
| REST | starting a chat twice returns the same conversation; own listing returns 403; non-participants get 403 on history; paging returns the right slices; unread counts are correct |
| Socket (with `socket.io-client`) | connection without a cookie is rejected; a stranger cannot join; a sent message is saved and delivered to the other user; a message over 1000 characters is rejected; the rate limit triggers; `message:read` sets `readAt`; offers above the price are rejected |

### 6.5 Acceptance

- [ ] Two browsers (buyer and seller) chat live and the history survives a refresh
- [ ] Unread badges update
- [ ] Offers can be accepted and declined
- [ ] Tests and linter pass

---

## STEP 7. Wishlist, wanted list, notifications and email

**Goal:** The app tells people what they care about without them having to check.

### 7.1 Endpoints

| Route | Behavior |
|---|---|
| `POST /api/me/wishlist/:listingId` | Adds with `$addToSet`. Idempotent, 204 |
| `DELETE /api/me/wishlist/:listingId` | Removes with `$pull`, 204 |
| `GET /api/me/wishlist` | Paginated listings, skipping removed ones |
| `POST /api/wanted` | Body `{ title?, subject?, department?, maxPrice? }`. At least one of `title` or `subject` is required. Maximum 10 active entries per user (409 after that) |
| `GET /api/wanted`, `DELETE /api/wanted/:id` | Own entries only |
| `GET /api/notifications` | Paginated, optional `unread=true` |
| `PATCH /api/notifications/:id` | Body `{ read: true }`, own only |
| `PATCH /api/notifications/read-all` | 204 |

### 7.2 Notification service

`notificationService.notify(userId, type, message, link)` saves the notification, and sends an email when the user has `emailNotifications` on and email is configured. It never throws into the caller: failures are logged. Add calls to it from earlier features: request received (to seller), accepted and rejected (to buyer), cancelled (to the other side), handover confirmed (to the other side), new chat message when the recipient has no active socket, listing removed by admin, review received.

### 7.3 Matching

- After a listing is created, a background task finds active wanted entries where the user is not the seller and: the title matches (the wanted title, normalized, is contained in `titleNormalized`) or the subject is equal, the department matches when set, and `maxPrice` is empty or at least the listing price. Each match gets a `wanted_match` notification. Cap at 200 notifications per listing. The create response must not wait for this work.
- When a listing's price is lowered, notify users who saved it with a `price_drop` notification.

### 7.4 Client

- A heart button on `BookCard` and listing detail with optimistic update and rollback on error.
- Wishlist page, Wanted page with a small form and list, notification bell with an unread count (refresh every 60 seconds and on the `notification:new` socket event), notifications page.

### 7.5 Tests

| Area | Cases |
|---|---|
| Wishlist | adding twice keeps one entry; removed listings are skipped |
| Wanted | the eleventh entry returns 409; a matching listing creates a notification; a non-matching price or department does not; the seller never notifies themselves |
| Notifications | users read only their own; read-all works; a failing email does not break the main action |

### 7.6 Acceptance

- [ ] Wanted matches and price drops create notifications
- [ ] Bell and counts update
- [ ] Tests and linter pass

---

## STEP 8. Reviews, reports, blocking and seller dashboard

**Goal:** Trust and visibility: ratings after real sales, ways to report problems, and a dashboard for sellers.

### 8.1 Endpoints

| Route | Behavior |
|---|---|
| `POST /api/reviews` | Body `{ requestId, rating, comment? }`. The request must be `completed` and the reviewer must be its buyer. Listing and seller come from the request. A second review for the same listing returns 409 (unique index) |
| `GET /api/users/:id` | `PublicUser` plus `ratingAverage` and `ratingCount` (aggregation) |
| `GET /api/users/:id/reviews` | Paginated, newest first |
| `POST /api/listings/:id/report`, `POST /api/users/:id/report` | Body `{ reason, details? }`. Not your own. One open report per reporter and target (409 on repeat) |
| `POST /api/users/:id/block`, `DELETE /api/users/:id/block` | Not yourself. Idempotent |
| `GET /api/me/dashboard` | Section 8.2 |

Blocking effects: the blocker no longer sees the blocked user's listings in search (replace the step 4 TODO with a `seller: { $nin: blockedUsers }` condition), and neither user can start a chat or send a request to the other.

### 8.2 Dashboard response

```json
{
  "activeListings": 4,
  "totalViews": 128,
  "requests": { "received": 9, "pending": 2 },
  "booksSold": 3,
  "booksGivenAway": 1,
  "earnings": 1150,
  "perListing": [{ "_id": "...", "title": "...", "views": 40, "requests": 3, "status": "available" }]
}
```

- Earnings is the sum over the user's sold `sell` listings of the completed request's `agreedPrice`, falling back to the listing `price`.
- Compute with parallel aggregations using `Promise.all`. Never load whole documents to count or sum in JavaScript.
- `perListing` is limited to the 20 most recent listings.

### 8.3 Client

- Seller profile page with rating, review list, report and block buttons.
- A Rate seller action on completed requests (star input and optional comment).
- Report dialog with the reason list.
- Dashboard page with stat cards and the per-listing table. Cards stack on phones.

### 8.4 Tests

| Area | Cases |
|---|---|
| Reviews | a non-buyer returns 403; an incomplete request returns 409; a second review returns 409; averages are correct |
| Reports | own listing returns 400 or 403; a repeat returns 409 |
| Blocking | blocked seller's listings vanish from search; chat and request creation are refused in both directions |
| Dashboard | numbers match a seeded data set exactly, including a negotiated `agreedPrice` |

### 8.5 Acceptance

- [ ] Ratings appear only after a completed handover
- [ ] Dashboard numbers match the data
- [ ] Tests and linter pass

---

## STEP 9. Admin, expiry job, privacy, export and account deletion

**Goal:** Keep the platform clean and respect users' data.

### 9.1 Admin (all routes use `requireRole("admin")`)

| Route | Behavior |
|---|---|
| `GET /api/admin/reports?status=open` | Paginated reports with the target summarized |
| `PATCH /api/admin/reports/:id` | Body `{ status: "resolved" }` |
| `DELETE /api/admin/listings/:id` | Sets `removed` and notifies the seller with `listing_removed` |
| `PATCH /api/admin/users/:id/ban` | Body `{ banned: boolean }`. Cannot ban yourself or another admin. Banning sets `isBanned` and sets the user's `available` listings to `removed`. Unbanning does not restore listings |
| `POST /api/admin/meetup-points`, `PATCH /api/admin/meetup-points/:id` | Create, or change name, description, area and `active` |

Provide `server/src/seeds/admin.js` to create the first admin from environment variables.

### 9.2 Jobs

`server/src/jobs/expiry.js` runs at startup and every 6 hours (a `setInterval` guarded by `JOBS_ENABLED`), and must be safe to run twice:
- Reminder: `available` listings with `expiresAt` between 6 and 7 days away and no `reminderSentAt` get a `listing_expiring` notification and `reminderSentAt` is set.
- Expiry: `available` listings with `expiresAt` in the past become `expired`.

### 9.3 Export and deletion

`GET /api/me/export` returns a JSON attachment with: profile (no hashes or tokens), own listings, requests as buyer and seller, conversations the user is part of with their messages, reviews written and received, wishlist, wanted entries, notifications.

`DELETE /api/me` with body `{ confirm: "DELETE", password? }`:
- `confirm` must equal `DELETE`. Password accounts must also send a correct `password` (401 otherwise).
- One service function, in a transaction: cancel pending and accepted requests (return reserved listings to `available` first, then mark the listings `removed`), notify the other sides, set the user's open listings to `removed`, delete notifications, wishlist, wanted entries and blocked list, anonymize the user (`name: "Deleted user"`, `email: "deleted-<id>@invalid"`, clear `passwordHash`, `googleId`, `avatar`, tokens, `authProviders`), set `deletedAt`, clear the cookie.
- Chat messages and reviews stay and display `Deleted user`. After deletion, login returns the generic 401 and the old token returns 401.

### 9.4 Privacy page and client

- `/privacy` static page with these sections: what is collected (name, email, listings, messages, profile details), why, who processes data (MongoDB Atlas, Cloudinary, Google sign-in, the email provider), how long data is kept, how to export and delete it, and a contact address. Linked from the footer and from the register form.
- Settings page with Export my data and Delete my account (typing `DELETE` to enable the button, password field for password accounts, a clear warning).
- Admin pages: reports queue with resolve, remove listing and ban actions; meetup points list with create and activate toggle.

### 9.5 Tests

| Area | Cases |
|---|---|
| Admin | a normal user gets 403; an admin cannot ban another admin; banning hides listings; a banned user cannot log in |
| Jobs | expiry changes only due listings; running twice makes no extra reminders |
| Export | contains the user's data and no hashes or tokens |
| Deletion | wrong confirm returns 400; wrong password returns 401; success anonymizes, removes listings, cancels requests, keeps messages as `Deleted user`, and blocks login and the old token |

### 9.6 Acceptance

- [ ] An admin can resolve a report and remove a listing
- [ ] A deleted account cannot be used and leaves no personal data except what section 9.3 says stays
- [ ] The privacy page is reachable before signup
- [ ] Tests and linter pass

---

## STEP 10. Quality pass and deployment

### 10.1 Quality checklist

- [ ] Service-layer test coverage at or above 80 percent
- [ ] Every page checked at 360 px, 768 px and desktop widths
- [ ] Every interactive element reachable and usable with the keyboard, visible focus, all images with alt text
- [ ] Lighthouse accessibility score of 90 or higher on Home, Browse, Listing detail and Login
- [ ] Every data page has loading, error and empty states
- [ ] No `console.log` left, no unused code, no secrets in the repository, `.env` ignored
- [ ] Every new environment variable is in `.env.example`
- [ ] A README with setup steps, scripts, the environment variables and the API endpoint table

### 10.2 Deployment

| Part | Where | Notes |
|---|---|---|
| Database | MongoDB Atlas | Create a database user, allow the host's IP addresses, confirm backups |
| API | Render or Railway | Must be a long-running service for WebSockets. Build: `npm install`. Start: `npm start`. Health check path `/api/health`. Set `app.set("trust proxy", 1)` so secure cookies and rate limits see the real IP |
| Client | Vercel or Netlify | Build `npm run build`, output `dist`, add a rewrite that sends unknown paths to `index.html` |

Cookies and domains:
- Put the client and API on the same site, for example `app.example.com` and `api.example.com`, so `sameSite: "lax"` cookies work. Set the cookie `domain` to `.example.com` in production.
- Set `CLIENT_URL` to the client origin, update the Google OAuth redirect URI to the production callback, and point the client's API and socket base URL at the API domain through an environment variable.
- Do not proxy Socket.IO through the static host. The browser connects directly to the API domain.

### 10.3 Final acceptance

- [ ] Full journey on the deployed app, on a phone: register, verify, list a book with photos, another account searches, chats, requests, accepts with a meetup, both confirm, buyer rates
- [ ] Google login works in production
- [ ] Deleting a test account works end to end

---

## 11. Seed data (for demos and tests)

`server/src/seeds/demo.js` (never runs in production):
- 1 admin, 4 normal users (verified), 5 meetup points.
- 12 listings across departments and semesters: 7 `sell` with different prices (include 3 copies of one title for the price hint), 3 `free`, 2 `swap`.
- 3 requests in different states, 1 conversation with a few messages including an offer, 2 reviews.

---

## 12. What the assistant must report after each step

1. Files created or changed.
2. Commands to run (install, seed, start, test).
3. Manual test steps, in order, that I can follow in the browser.
4. Test results (count passed, any skipped and why).
5. Anything unclear, assumed or left for a later step, with the reason.

## 13. Mistakes to reject in review

- Business rules inside controllers or routes
- Reading a status and then updating it in a second query (not atomic)
- Using client-sent `userId`, `role`, `status`, `price` for free listings, or `seller`
- Passing `req.query` or `req.body` straight into a MongoDB query
- Returning whole documents with sensitive or other users' private fields
- A list endpoint without pagination
- A new dependency not listed for the step
- A UI that fetches directly in a component instead of the `api` folder
- A page without loading, error or empty states
- Tests that only cover the success case
- Placeholder code, `// implement later`, or commented-out code