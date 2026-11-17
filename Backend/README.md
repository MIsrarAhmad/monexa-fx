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

Registration, login, `GET /api/auth/me`, and `PUT /api/user/profile`
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
