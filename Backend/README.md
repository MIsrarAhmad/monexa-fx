# Registration API

`POST /api/auth/register` requires these JSON fields:

- `name` and `fatherName`: nonempty strings, trimmed, up to 100 characters.
- `gender`: `male`, `female`, `other`, or `prefer_not_to_say`.
- `dateOfBirth`: real Gregorian calendar date as a `YYYY-MM-DD` string
  (years `0001`–`9999`); it must not be later than today's date in UTC+14.
  No minimum-age restriction is imposed.
- `country`: uppercase ISO 3166-1 alpha-2 code from `src/utils/countries.js`.
  This 249-code list includes territories and excludes non-ISO region codes such as
  `UK`, `EU`, and `XK`; frontend choices should use `GET /api/auth/countries`.
- `email`: valid email address, trimmed and lowercased.
- `password`: existing password policy (see `src/utils/passwordPolicy.js`).
- `referralCode`: existing user or admin invitation code, trimmed and case-insensitive.

`GET /api/auth/countries` is public and returns HTTP 200 with
`{ "success": true, "data": { "countries": ["AD", "AE", "..."] } }`.
The array contains the complete list used by registration validation.

New registrations receive an email verification link valid for 24 hours.
`POST /api/auth/register` returns `verificationRequired`, `verificationEmailSent`,
and `email`, but does not issue a session token. If email delivery fails, the
account is still created and the response explicitly reports that delivery
could not be confirmed. A slow SMTP delivery may still arrive afterwards.
`POST /api/auth/verify-email` accepts `{ "token": "..." }` and consumes the
link once. `POST /api/auth/resend-verification` accepts `{ "email": "..." }`,
rotates the token, and is rate limited; sign-in is blocked for new unverified
accounts. Existing accounts without an email-verification flag are unaffected.
`SMTP_USER` and `SMTP_PASS` must be configured for email delivery; set
`SMTP_HOST`, `SMTP_PORT`, `FROM_EMAIL`, and `FRONTEND_URL` as appropriate for
the deployment. Users can request another link if the first expires or sending fails.
For a staged release, deploy the compatible frontend first, confirm that it is
live, then deploy the backend; the previous frontend expects an immediate token
and cannot handle the new registration response.

Manual deposit and withdrawal requests send an email when submitted and another
when an administrator resolves them. Pending emails do not confirm a deposit
credit or a withdrawal payment. A completed withdrawal email reports the
administrator's status and does not independently confirm an on-chain transfer.
Transaction emails are best-effort: delivery failures are logged and do not
roll back transactions, and there is no automatic delivery retry queue.

Admin user overviews and financial ledgers distinguish pending, approved,
completed, and rejected deposit and withdrawal-request counts. The queue's
request number includes all earlier requests of that type, regardless of their
current status; it is context, not a reason given by the user. Deposit
principal at submission is recorded for new manual requests only.

The admin user overview includes monthly daily-yield reporting in UTC. The
current month's credited amount comes from recorded daily-yield transactions;
the month-end and next three calendar months are estimates using the current
$100-step rule and next scheduled credit. While the main balance is at least
$300, each credit is $1 for every complete $100 of main balance plus retained
profit; referral balance is excluded. Each projected credit increases retained
profit for subsequent estimates. Forecasts assume no deposits, withdrawals or
schedule changes, exclude referral income and withdrawal fees, and are not
payment obligations. Missing wallets or unavailable schedules are reported as
unavailable rather than as zero. Existing credits and schedules are not changed
when the rule is deployed; it applies at the next scheduled credit.

Admins can correct a pending manual TRC20 deposit with an uploaded proof by
supplying `correctedAmount` and `correctionReason` (10–300 characters) when
approving. The verified amount must be positive with at most two decimals.
The transaction retains the submitted amount, reason, reviewer, and review time.
A corrected amount may be below the submission minimum because it represents
funds actually received; the $300 principal threshold for starting profit
still applies. Uncorrected approvals retain their existing minimum rule.
Deposit approvals, rejections, and Binance webhook credits use MongoDB
transactions to prevent duplicate or partial credits. MongoDB must support
multi-document transactions (replica set or sharded cluster); standalone
servers cannot resolve deposits. Deploy the backend before enabling the
correction controls in the frontend. The optional
`src/tests/depositDatabase.test.js` integration test requires
`MONEXA_TEST_MONGO_URI` pointing to a local replica set and database named
`monexa_admin_test`; without it, that test is skipped.

For withdrawals submitted under the current policy, an approved request of at
least $50 made when the $50 unwithdrawn profit and referral target is met
permanently removes that target for later requests. Pending and rejected
requests do not unlock it; an early grace-period request does not qualify unless
the target was also met. Existing requests created before this change do not
contain a qualifying snapshot and cannot be reliably classified automatically.
An administrator may review a historical completed withdrawal of at least $50
using `POST /api/admin/users/:userId/withdrawal-unlock` with `transactionId`
and a review `reason` (10–300 characters). This records the administrator, time,
and reason on the transaction; only historical requests without a qualifying
snapshot are eligible for review. It does not change the balance or transaction
status. KYC, available balance, and the 20% fee still apply.
If a request reserves principal below $300, yield pauses and an in-app
notification explains the shortfall; rejection restores reserved funds.

Login, `GET /api/auth/me`, and `PUT /api/user/profile`
responses include `country`. It is `null` for existing users without one.
The new fields are required for registration but remain optional in stored
user records so older accounts continue to work.

`GET /api/auth/me` also returns `fatherName`, `gender`, and `dateOfBirth`
in `data.user`, with `null` for fields not yet set.
`PUT /api/user/profile` accepts those three fields and `country` as optional
updates, using the same validation rules as registration. Omitted fields are
preserved, so existing clients and users may update their profile without
filling in every field. Supplied fields cannot be blank or null. The response
includes the saved values alongside the existing profile fields.

Profile pictures are private to the signed-in user and stored in their user
record. `PUT /api/user/profile-picture` accepts one multipart field named
`picture` (JPG, PNG, or WebP, maximum 512 KB); replacing it overwrites the
previous picture. `GET /api/user/profile-picture` returns the authenticated
user's image with `Cache-Control: private, no-store`, or HTTP 404 when none
exists. The profile page resizes selected images before uploading.
`DELETE /api/user/profile-picture` removes the authenticated user's picture;
it succeeds even when the user has no picture.

Run focused tests with `node --test src/tests/registration.test.js` from the
`Backend` directory.
