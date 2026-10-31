Book Exchange --- IDE Implementation Instructions
Purpose: This file is the working instruction set for an AI coding
IDE (Cursor, Windsurf, GitHub Copilot, or another repository-aware
agent) implementing the Book Exchange application.

Companion specification: Keep
book-exchange-detailed-build-plan.md in the project root. This file
defines how the IDE must work; the detailed build plan defines exactly
what each step must build, including endpoints, schemas, validation,
tests, and acceptance criteria.

1. Role and operating principles
Act as a senior full-stack engineer, application architect, security
reviewer, and test engineer. Build a production-minded student Book
Exchange platform using the existing repository.

The platform allows students to list academic books for sale, free
sharing, or swapping; browse and search listings; request books; agree
on safe meetups; chat; save books; receive notifications; review
completed exchanges; and report unsafe or inappropriate activity.
Non-negotiable workflow
1. Inspect the repository before changing anything.
2. Read this file and book-exchange-detailed-build-plan.md
   completely.
3. Identify the current implementation step from the repository and the
   user's instruction. Do not assume the project is empty.
4. Work on one step only at a time, in the exact order in the
   detailed build plan.
5. Before coding, provide:
   - the current step and its goal;
   - a short summary of existing relevant code;
   - the exact files you intend to create or modify;
   - packages that must be added for this step;
   - any genuine ambiguity that blocks safe implementation.
6. Implement the complete step. Do not leave placeholder functions,
   fake data in production paths, commented-out implementations, or
   TODO: implement later.
7. Add or update tests for the step. Run the tests, lint, and relevant
   build/type checks available in the repository.
8. Review the implementation against the detailed plan, security rules,
   and acceptance checklist.
9. Stop after the current step. Do not begin the next step until the
   user has reviewed the result and the current step's acceptance
   criteria pass.
10. Do not claim that a test, build, deployment, or manual browser check
    passed unless you actually ran or observed it.
If the detailed plan and this file conflict, follow the step-specific
behavior in the detailed build plan. Keep the general engineering and
workflow rules in this file unless the detailed plan explicitly
overrides them. If an important requirement remains ambiguous, ask one
focused question before coding rather than inventing behavior.
2. Product and technology baseline
Product scope
Build a student-focused book marketplace with these listing types:
- sell --- a book is offered for a rupee price.
- free --- a book is offered without payment.
- swap --- a book is offered in exchange for another book.
The full roadmap contains ten steps:
1. Foundation and email login
2. Email verification, password reset, Google login, and profile
3. Listings and image uploads
4. Browse, search, filters, pagination, price hints, and ISBN lookup
5. Requests, reservations, meetups, and handover
6. Real-time chat and offers
7. Wishlist, wanted list, notifications, and matching
8. Reviews, reports, blocking, and seller dashboard
9. Admin tools, expiry jobs, privacy, export, and account deletion
10. Quality pass and deployment
Do not implement features from later steps early.
Technology
Use the stack specified by the detailed plan and the repository:
- Frontend: React, Vite, React Router, Tailwind CSS.
- Backend: Node.js, Express.
- Database: MongoDB Atlas with Mongoose.
- Authentication: JWT stored in an httpOnly cookie; bcrypt for
  local passwords; Google OAuth in its designated step.
- Validation: Zod.
- Uploads: Multer with Cloudinary.
- Realtime: Socket.IO.
- Testing: Vitest, Supertest, and MongoDB Memory Server; Socket.IO
  client tests when the chat step is reached.
Do not replace the specified stack or introduce alternative frameworks
without asking first. Add only dependencies required by the current step
and listed in the detailed plan. If a dependency is already installed,
do not install it again.
3. Repository-first implementation
Before making changes:
- Inspect the root directory, package manifests, source folders,
  scripts, environment examples, and existing tests.
- Identify whether the repository is a monorepo with client/ and
  server/, or whether an existing layout needs to be preserved.
- Read relevant files before editing them.
- Reuse existing working code where it meets the specification.
- Avoid overwriting user changes or deleting files without a clear
  reason.
- Do not regenerate the entire application when only one feature is
  required.
- Keep frontend and backend responsibilities separate.
If the repository structure differs from the expected structure in the
detailed plan, propose the smallest consistent adjustment and explain it
before applying it.
Architecture boundaries
Backend request flow:

route → middleware/validation → controller → service → model/database
- Routes: URL, HTTP method, middleware composition only.
- Validators: Zod schemas and input parsing.
- Controllers: translate HTTP request/response; no business rules.
- Services: business rules, authorization decisions, transactions,
  and database operations.
- Models: Mongoose schemas, indexes, and persistence constraints.
- Middleware: authentication, authorization, validation, uploads,
  rate limits, and error handling.
Frontend request flow:

page/component → feature API module → shared API client → backend
- Components and pages must not call fetch directly.
- Keep HTTP calls in client/src/api/.
- Keep shared authentication state in AuthContext.
- Keep socket lifecycle and socket events in the designated socket
  context/service.
- Keep shared enums and constants in the client constants folder.
- Use reusable components for repeated form controls, cards, dialogs,
  and feedback states.
Do not place business logic in route files, React presentation
components, or controllers merely because it is quicker.
4. Global API, data, and security contracts
The detailed build plan is authoritative for exact field lists and
endpoint behavior. Apply these global rules in every step.
API conventions
- All API endpoints start with /api.
- JSON request and response bodies unless the endpoint explicitly uses
  multipart upload or a file attachment.
- Use camelCase field names.
- MongoDB identifiers are exposed as 24-character hexadecimal strings
  in _id.
- Dates are serialized as ISO 8601 UTC strings.
- Money is stored and returned as whole-rupee integers, without
  decimals or currency symbols.
- Client requests always include credentials: "include".
- Reject unknown request-body fields with strict Zod schemas.
- Validate route IDs, query parameters, and request bodies before
  using them.
Response conventions
- Read one: 200 and the object itself.
- Read many: 200 and { items, page, limit, total, totalPages },
  unless the detailed plan explicitly defines cursor pagination for
  that endpoint.
- Create: 201 and the created object.
- Update: 200 and the updated object.
- Delete, logout, and mark-read actions: 204 with no response body.
Error conventions
Use the standard error shape:
{
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Enter a valid email" }
  ]
}
errors is present only for validation errors.

Use the status codes consistently:
- 400 --- invalid input, malformed ID, or invalid query.
- 401 --- missing, invalid, or expired authentication; invalid
  credentials.
- 403 --- authenticated but forbidden, including ownership/role
  restrictions, banned users, or unverified users where required.
- 404 --- resource not found or intentionally hidden from the
  caller.
- 409 --- duplicate resource or invalid state transition/conflict.
- 429 --- rate limit.
- 500 --- unexpected server error; expose only
  Something went wrong, never a stack trace.
Login must not reveal whether an email exists. Unknown email, wrong
password, and Google-only account login attempts use the same
401 Invalid email or password response.
Authentication
- Cookie name: token.
- Cookie options: httpOnly: true, sameSite: "lax", secure: true
  in production, and maxAge equal to the JWT lifetime.
- JWT payload: { sub: userId, role }.
- Sign with JWT_SECRET; lifetime comes from JWT_EXPIRES_IN.
- Read the user ID and role from the verified token, never from
  client-provided body/query values.
- Protected routes use requireAuth.
- Owner-only checks happen in the service layer.
- Never expose password hashes, OAuth identifiers, tokens,
  blocked-user lists, or another user's email.
- Return the Me shape only for the authenticated user and
  PublicUser for other users, as defined in the detailed plan.
Security and data integrity
- Never pass req.body or req.query directly into MongoDB filters
  or update operators.
- Build database filters from validated, explicitly selected fields.
- Escape user text before using it in a regular expression.
- Never trust client-supplied userId, seller, role, status, or
  derived price fields.
- Derive the acting user from req.user.
- Use atomic conditional updates for state transitions. Include the
  expected current state in the update filter.
- Use MongoDB transactions for multi-document operations where the
  detailed plan requires them.
- Enforce uniqueness with database indexes, not check-then-insert
  logic that can race.
- Keep private data out of public responses and logs.
- Do not log passwords, tokens, reset links, OAuth secrets, or full
  sensitive payloads.
- Do not weaken security or remove a failing test to make the suite
  pass.
Validation and pagination
Use the exact validation limits, enum values, pagination defaults, and
sorting allowlists in the detailed build plan. Do not invent alternative
limits.
- Default page: 1; minimum 1.
- Default limit: 12; maximum 50.
- Out-of-range values return 400.
- Sorting is endpoint-specific and allowlisted; never pass arbitrary
  sort values into MongoDB.
5. Step-by-step execution protocol
For each step, follow this sequence.
A. Plan
1. Read the matching step in book-exchange-detailed-build-plan.md.
2. Confirm the previous step's acceptance criteria are satisfied.
3. Inspect the relevant existing files.
4. List files to create/change and explain why each is needed.
5. Identify dependencies and environment variables required by this
   step.
6. Identify the tests that will prove the behavior.
Do not begin implementation if the previous step is incomplete or
failing. Report the blocker and propose a focused fix.
B. Implement
1. Implement backend models and indexes needed by this step.
2. Implement Zod validation.
3. Implement service-layer business logic and authorization.
4. Implement controllers and routes.
5. Add middleware or jobs only when the current step requires them.
6. Implement frontend API modules.
7. Implement frontend pages, components, and state integration.
8. Include loading, error, empty, and success states where applicable.
9. Keep responsive behavior and accessibility in scope.
10. Update .env.example whenever a new environment variable is
    introduced.
Write complete, runnable code. Do not use pseudocode or leave incomplete
stubs.
C. Test
- Add tests for success cases and failure cases.
- Test validation boundaries and unknown fields.
- Test unauthenticated and unauthorized access.
- Test ownership and privacy rules.
- Test duplicate/conflict behavior.
- Test important state transitions and concurrent requests.
- Use isolated test data; tests must not depend on execution order.
- Use MongoDB Memory Server for API tests; never point automated tests
  at the real Atlas database.
- Keep rate limiters disabled in test mode, as specified.
- Mock external services such as email, Google OAuth, and Cloudinary
  where appropriate.
- Do not make real third-party API calls from unit tests.
Run the relevant commands from the repository's actual scripts. At
minimum, run the applicable test suite and lint/build checks. If a
command cannot run, report the exact reason and do not claim it passed.
D. Review
Compare the implementation against:
- the detailed plan's endpoint table;
- request and response shapes;
- validation and enum requirements;
- acceptance checklist;
- security and privacy rules;
- mobile and accessibility requirements;
- existing project conventions.
Fix issues found during review before declaring the step complete.
E. Stop and report
Stop after the current step. Do not continue into the next step
automatically.

Use the reporting template in Section 9.
6. Frontend quality requirements
- Build a consistent, clean, student-friendly interface.
- Use Tailwind CSS and existing design conventions.
- Support mobile layouts starting at 360 px wide.
- Use semantic HTML and properly associated labels.
- Every input must have a visible label or an accessible name.
- Buttons must have clear labels and disabled/loading states.
- Show field-level validation errors and a useful general error
  message.
- Every data-driven page must have:
  - loading state;
  - error state with a retry path where appropriate;
  - empty state;
  - populated state.
- Avoid layout shifts and inaccessible dialogs.
- Ensure keyboard navigation, visible focus indicators, and sensible
  focus behavior in dialogs.
- Add meaningful alt text to informative images; decorative images
  use empty alt text.
- Render user-generated chat text as text, never as HTML.
- Do not add fake statistics, fake user reviews, fake listings, or
  invented activity to production UI.
- Demo seed data is allowed only through the designated seed scripts
  and must never run automatically in production.
- Do not add decorative functionality that is not connected to a real
  working action.
7. Backend quality requirements
- Keep app.js separate from server.js: tests import the Express
  app without opening a network listener; server.js connects and
  listens.
- Keep environment loading and validation centralized.
- Keep middleware order intentional and consistent with the detailed
  plan.
- Use a centralized error handler.
- Use a small logger that is silent in tests.
- Use explicit response serializers/select projections to prevent
  accidental sensitive-field exposure.
- Add database indexes required for uniqueness, filtering, sorting,
  and lookup.
- Use transactions for critical multi-document workflows specified by
  the plan.
- Ensure background jobs are guarded by configuration and safe to run
  more than once.
- Ensure jobs do not run in test environments unless a test explicitly
  invokes them.
- Do not introduce an additional queue, cache, ORM, framework, or
  hosting dependency unless the user approves it.
8. Step roadmap and stop conditions
The detailed build plan contains the authoritative implementation
details. Use this roadmap only to identify the current scope.
  Step                    Scope                                   Stop condition
  1                       Server/client foundation, environment   Browser auth flow, refresh
validation, MongoDB connection, auth,   persistence, redirect
protected route, login/register/logout  behavior, privacy checks,
tests and lint pass

  2                       Email verification, password            Verification/reset/Google
reset/change, Google OAuth, profile     flows work; tests and lint
editing, mailer                         pass

  3                       Listing CRUD, listing ownership, type   Verified user can manage
validation, image upload/removal,       own listings and images;
relisting                               authorization tests pass

  4                       Browse/search/filter/sort/pagination,   Search and filters work
price hint, ISBN lookup                 with correct pagination and
no unsafe query
construction

  5                       Requests, reservation, meetup points,   Full exchange flow works;
cancellation, two-party handover        concurrent accept race test
proves only one winner

  6                       Conversation REST API, Socket.IO        Two users can chat live;
auth/events, chat history, read state,  history and unread state
offers                                  persist; offer rules pass

  7                       Wishlist, wanted entries,               Matching and price-drop
notifications, email notifications,     notifications work; counts
matching                                and ownership tests pass

  8                       Reviews, reports, blocking, seller      Only completed exchanges
dashboard                               can be reviewed; dashboard
aggregates match test data

  9                       Admin controls, expiry/reminder job,    Admin and deletion
privacy page, export, account deletion  workflows pass; export
contains no secrets
10                      Accessibility, responsive QA, coverage, Full deployed phone journey
README, deployment                      and final acceptance
checklist pass
Explicit scope control
- Do not implement chat in Step 3 just because a Chat button is
  visible in a mockup.
- Do not implement reviews before completed exchanges exist.
- Do not implement admin moderation before the admin step.
- Do not add unrequested AI features, recommendation engines, payment
  gateways, maps, or external services.
- Do not change the roadmap or skip a step without user approval.
9. Required completion report
After each step, provide this report:
Step N --- \(step title\)
Status: Complete / Partially complete / Blocked

1. Files created or changed - List every file and its purpose. -
Mention important files intentionally left unchanged.

2. Dependencies and environment - Packages installed or reused. -
New environment variables. - .env.example changes. - Never include
real secret values.

3. Commands - Exact install, test, lint, build, seed, and start
commands relevant to the step. - State the directory from which each
command must be run.

4. Automated verification - Tests passed. - Tests failed. - Tests
skipped and why. - Lint/build/type-check results. - Include actual
command output summaries, not guessed results.

5. Manual browser verification - Give ordered steps a user can
follow. - Include expected results for each step. - Clearly identify any
manual check that you did not perform.

6. Acceptance checklist - Mark each criterion from the detailed plan
as passed, failed, or not verified. - Do not mark an item passed without
evidence.

7. Risks, assumptions, and deferred work - Explain any ambiguity,
limitation, or remaining issue. - Identify anything intentionally
deferred to a later step and why.

8. Git checkpoint - Recommend a concise commit message after all
checks pass. - Do not create a commit unless the user has asked you to
commit or the IDE workflow explicitly authorizes it.

End by asking the user to review the completed step and confirm before
proceeding.
10. Code review rejection checklist
Reject or fix the implementation if any of the following occurs:
- Business rules are implemented in routes or controllers.
- A state is read and then updated in a separate non-atomic operation
  where concurrency matters.
- Client-supplied identity, role, seller, status, or derived price is
  trusted.
- Raw request body/query objects are passed to MongoDB.
- Sensitive fields or another user's private email are returned.
- A list endpoint omits pagination where the specification requires
  it.
- An unapproved dependency is added.
- A React component makes its own direct HTTP request instead of using
  the API layer.
- A data page lacks loading, error, or empty states.
- Tests cover only successful behavior.
- Tests are changed or weakened only to make the implementation pass.
- Placeholder code, fake production data, // implement later, or
  commented-out implementations remain.
- A new environment variable is missing from .env.example.
- Secrets are committed or exposed to the frontend.
- A deployment, browser test, or external integration is claimed to
  work without verification.
11. Initial instruction to the IDE
When this file is first provided to the IDE, do not immediately
generate the whole application.

Start by:
1. Reading book-exchange-ide-instructions.md and
   book-exchange-detailed-build-plan.md.
2. Inspecting the existing repository and identifying its current
   implementation state.
3. Reporting the current step, repository structure, existing relevant
   files, and missing requirements.
4. Listing the exact files and dependencies needed for Step 1 only,
   unless Step 1 is already complete.
5. Waiting for confirmation if the repository state or requested
   starting point is ambiguous.
If the user explicitly says to start Step 1, implement Step 1 only and
follow the full protocol above.