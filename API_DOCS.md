# CoWork Space — API Documentation

**Base URL:** `http://localhost:5000/api/v1`
**Auth:** JWT via `Authorization: Bearer <token>` header **or** `token` cookie
**Content-Type:** `application/json` for all request bodies

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Coworking Spaces](#2-coworking-spaces)
3. [Coworking Space Requests](#3-coworking-space-requests)
4. [Rooms](#4-rooms)
5. [Reservations](#5-reservations)
6. [Data Models](#6-data-models)
7. [Error Reference](#7-error-reference)

---

## 1. Authentication

### POST `/auth/register`

Register a new user account. Returns a JWT token on success.

**Access:** Public

**Request Body**

| Field      | Type   | Required | Description                        |
|------------|--------|----------|------------------------------------|
| `name`     | string | Yes      | Display name                       |
| `tel`      | string | Yes      | 10-digit phone number              |
| `email`    | string | Yes      | Unique email address               |
| `password` | string | Yes      | Min 6 characters                   |
| `role`     | string | No       | `"user"` (default), `"admin"`, or `"owner"` |

**Example Request**
```json
POST /api/v1/auth/register
{
  "name": "Alice Smith",
  "tel": "0812345678",
  "email": "alice@example.com",
  "password": "secret123"
}
```

**Example Response** `200 OK`
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
The response also sets an `httpOnly` cookie named `token`.

**Errors**

| Status | Cause |
|--------|-------|
| 400    | Missing fields, duplicate email, invalid tel/email format, password too short |

---

### POST `/auth/login`

Authenticate with email + password. Returns a JWT token.

**Access:** Public

**Request Body**

| Field      | Type   | Required |
|------------|--------|----------|
| `email`    | string | Yes      |
| `password` | string | Yes      |

**Example Request**
```json
POST /api/v1/auth/login
{
  "email": "alice@example.com",
  "password": "secret123"
}
```

**Example Response** `200 OK`
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors**

| Status | Cause |
|--------|-------|
| 400    | Missing email or password; user not found |
| 401    | Wrong password |

---

### GET `/auth/me`

Return the profile of the currently authenticated user.

**Access:** Private (any authenticated user)

**Headers:** `Authorization: Bearer <token>`

**Example Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "664a1b2c3d4e5f6a7b8c9d0e",
    "name": "Alice Smith",
    "tel": "0812345678",
    "email": "alice@example.com",
    "role": "user",
    "createdAt": "2025-01-15T08:00:00.000Z"
  }
}
```

---

### GET `/auth/logout`

Clear the auth cookie and log out.

**Access:** Private (any authenticated user)

**Example Response** `200 OK`
```json
{
  "success": true,
  "data": {}
}
```
Sets the `token` cookie to `"none"` expiring in 10 seconds.

---

## 2. Coworking Spaces

### GET `/coworkingSpaces`

List all coworking spaces with optional filtering, sorting, field selection, and pagination. Each space includes its associated reservations.

**Access:** Public

**Query Parameters**

| Parameter | Type   | Description |
|-----------|--------|-------------|
| `select`  | string | Comma-separated fields to return. e.g. `name,address` |
| `sort`    | string | Comma-separated fields to sort by. Prefix `-` for descending. e.g. `name` or `-createdAt` |
| `page`    | number | Page number (default: 1) |
| `limit`   | number | Results per page (default: 25) |
| `<field>` | any    | Filter by any model field. Supports operators: `gt`, `gte`, `lt`, `lte`, `in` |

**Filter Operator Syntax**

Append operator in brackets to the field name:
```
GET /api/v1/coworkingSpaces?opentime[lte]=10:00
```
This returns spaces that open at or before 10:00.

**Example Requests**
```
GET /api/v1/coworkingSpaces
GET /api/v1/coworkingSpaces?select=name,address&sort=name&page=1&limit=10
GET /api/v1/coworkingSpaces?name=TechHub
```

**Example Response** `200 OK`
```json
{
  "success": true,
  "count": 2,
  "pagination": {
    "next": { "page": 2, "limit": 25 }
  },
  "data": [
    {
      "_id": "664b0000000000000000001",
      "name": "TechHub BKK",
      "address": "123 Silom Rd, Bangkok",
      "tel": "021234567",
      "opentime": "08:00",
      "closetime": "20:00",
      "reservations": []
    }
  ]
}
```

---

### GET `/coworkingSpaces/:id`

Get a single coworking space by its ID.

**Access:** Public

**URL Params:** `id` — MongoDB ObjectId of the space

**Example Request**
```
GET /api/v1/coworkingSpaces/664b0000000000000000001
```

**Example Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "664b0000000000000000001",
    "name": "TechHub BKK",
    "address": "123 Silom Rd, Bangkok",
    "tel": "021234567",
    "opentime": "08:00",
    "closetime": "20:00"
  }
}
```

**Errors**

| Status | Cause |
|--------|-------|
| 400    | Space not found |

---

### POST `/coworkingSpaces`

Create a new coworking space.

**Access:** Private — **admin only**

**Request Body**

| Field       | Type   | Required | Constraints              |
|-------------|--------|----------|--------------------------|
| `name`      | string | Yes      | Unique, max 50 chars     |
| `address`   | string | Yes      |                          |
| `tel`       | string | Yes      |                          |
| `opentime`  | string | Yes      | Format `HH:MM` e.g. `08:00` |
| `closetime` | string | Yes      | Format `HH:MM` e.g. `20:00` |

**Example Request**
```json
POST /api/v1/coworkingSpaces
Authorization: Bearer <admin_token>

{
  "name": "TechHub BKK",
  "address": "123 Silom Rd, Bangkok",
  "tel": "021234567",
  "opentime": "08:00",
  "closetime": "20:00"
}
```

**Example Response** `201 Created`
```json
{
  "success": true,
  "data": {
    "_id": "664b0000000000000000001",
    "name": "TechHub BKK",
    "address": "123 Silom Rd, Bangkok",
    "tel": "021234567",
    "opentime": "08:00",
    "closetime": "20:00"
  }
}
```

---

### PUT `/coworkingSpaces/:id`

Update an existing coworking space. Only send the fields you want to change.

**Access:** Private — **admin only**

**URL Params:** `id` — MongoDB ObjectId

**Example Request**
```json
PUT /api/v1/coworkingSpaces/664b0000000000000000001
Authorization: Bearer <admin_token>

{
  "closetime": "22:00"
}
```

**Example Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "664b0000000000000000001",
    "name": "TechHub BKK",
    "opentime": "08:00",
    "closetime": "22:00"
  }
}
```

**Errors**

| Status | Cause |
|--------|-------|
| 400    | Space not found or validation error |

---

### DELETE `/coworkingSpaces/:id`

Permanently delete a coworking space and **all its associated reservations**.

**Access:** Private — **admin only**

**URL Params:** `id` — MongoDB ObjectId

**Example Request**
```
DELETE /api/v1/coworkingSpaces/664b0000000000000000001
Authorization: Bearer <admin_token>
```

**Example Response** `200 OK`
```json
{
  "success": true,
  "data": {}
}
```

> **Warning:** This is a cascading delete. All reservations linked to this space are also permanently removed.

---

## 3. Coworking Space Requests

Applications submitted by users who want to add their co-working space to the platform (US1-1). A pending request is **not** a coworking space — once an admin reviews and approves it, the actual `CoworkingSpace` document is created from the request data (US1-2, separate ticket).

### POST `/coworkingSpaceRequests`

Submit a new request to add a co-working space.

**Access:** Private (any authenticated user)

**Request Body**

| Field              | Type            | Required | Constraints |
|--------------------|-----------------|----------|-------------|
| `name`             | string          | Yes      | Non-empty, must contain ≥1 alphabet, max 50 chars |
| `address`          | string          | Yes      | Non-empty, must contain ≥1 alphabet |
| `tel`              | string          | Yes      | Exactly 10 digits |
| `opentime`         | string          | Yes      | `HH:MM` format (00:00–23:59) |
| `closetime`        | string          | Yes      | `HH:MM` format (00:00–23:59) |
| `description`      | string          | Yes      | Non-empty, ≥1 alphabet, **10–1000 words** (whitespace-split count) |
| `proofOfOwnership` | string          | Yes      | `http(s)://…` URL |
| `pics`             | array of string | No       | Each item must be an `http(s)` URL |

**Side Effects**
- A confirmation email is sent to the submitter's email. Email failure is non-fatal.

**Example Request**
```json
POST /api/v1/coworkingSpaceRequests
Authorization: Bearer <token>

{
  "name": "Cozy Cowork Bangkok",
  "address": "123 Sukhumvit Rd, Bangkok",
  "tel": "0900000000",
  "opentime": "08:00",
  "closetime": "20:00",
  "description": "A quiet modern coworking space with private rooms fast wifi and complimentary coffee for focused professionals.",
  "pics": ["https://example.com/pic1.jpg", "https://example.com/pic2.jpg"],
  "proofOfOwnership": "https://example.com/deed.pdf"
}
```

**Example Response** `201 Created`
```json
{
  "success": true,
  "data": {
    "_id": "664d0000000000000000020",
    "submitter": "664a1b2c3d4e5f6a7b8c9d0e",
    "name": "Cozy Cowork Bangkok",
    "address": "123 Sukhumvit Rd, Bangkok",
    "tel": "0900000000",
    "opentime": "08:00",
    "closetime": "20:00",
    "description": "A quiet modern coworking space...",
    "pics": ["https://example.com/pic1.jpg", "https://example.com/pic2.jpg"],
    "proofOfOwnership": "https://example.com/deed.pdf",
    "status": "pending",
    "createdAt": "2026-04-18T10:00:00.000Z"
  }
}
```

**Validation Error Shape**

On validation failure the response body contains an `errors` array listing every issue found (so the client can disable the submit button until all pass):

```json
{
  "success": false,
  "errors": [
    "name must contain at least one alphabet",
    "description must be at least 10 words (got 5)",
    "proofOfOwnership is required"
  ]
}
```

**Errors**

| Status | Cause |
|--------|-------|
| 400    | Validation failed (see `errors` array) |
| 401    | Not authenticated |
| 500    | Server error |

---

### GET `/coworkingSpaceRequests/mine`

List all requests submitted by the logged-in user, newest first. This is how submitters check the status (`pending` / `approved` / `rejected`) of their applications.

**Access:** Private (any authenticated user)

**Example Request**
```
GET /api/v1/coworkingSpaceRequests/mine
Authorization: Bearer <token>
```

**Example Response** `200 OK`
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "664d0000000000000000020",
      "submitter": "664a1b2c3d4e5f6a7b8c9d0e",
      "name": "Cozy Cowork Bangkok",
      "status": "pending",
      "createdAt": "2026-04-18T10:00:00.000Z"
    }
  ]
}
```

---

### GET `/coworkingSpaceRequests/mine/:id`

Get a single request by ID. The authenticated user must be the original submitter, or an admin.

**Access:** Private

**URL Params:** `id` — Request ObjectId

**Example Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "664d0000000000000000020",
    "submitter": "664a1b2c3d4e5f6a7b8c9d0e",
    "name": "Cozy Cowork Bangkok",
    "status": "pending",
    "createdAt": "2026-04-18T10:00:00.000Z"
  }
}
```

**Errors**

| Status | Cause |
|--------|-------|
| 401    | Not authenticated |
| 403    | Not the submitter and not an admin |
| 404    | Request not found |

---

## 4. Rooms

Rooms live inside a coworking space. Use the nested `/coworkingSpaces/:coworkingSpaceId/rooms` base path for listing and creation, and the top-level `/rooms/:id` path for deletion.

### GET `/rooms` or `/coworkingSpaces/:coworkingSpaceId/rooms`

List rooms. When called under a coworking space, results are scoped to that space.

**Access:** Public

**Example Request**
```
GET /api/v1/coworkingSpaces/664b0000000000000000001/rooms
```

**Example Response** `200 OK`
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "664e0000000000000000030",
      "name": "Meeting Room A",
      "description": "Window seat",
      "capacity": 6,
      "coworkingSpace": "664b0000000000000000001",
      "createdAt": "2026-04-18T10:00:00.000Z"
    }
  ]
}
```

---

### POST `/coworkingSpaces/:coworkingSpaceId/rooms`

Create a new room inside the given coworking space.

**Access:** Private — `owner` of the space, or `admin`

**URL Params:** `coworkingSpaceId` — ObjectId of the target space

**Request Body**

| Field         | Type   | Required | Constraints |
|---------------|--------|----------|-------------|
| `name`        | string | Yes      | Max 100 chars |
| `capacity`    | number | Yes      | ≥ 1 |
| `description` | string | No       | Max 500 chars |

**Example Request**
```json
POST /api/v1/coworkingSpaces/664b0000000000000000001/rooms
Authorization: Bearer <owner_or_admin_token>

{
  "name": "Meeting Room A",
  "capacity": 6,
  "description": "Window seat"
}
```

**Example Response** `201 Created`
```json
{
  "success": true,
  "data": {
    "_id": "664e0000000000000000030",
    "name": "Meeting Room A",
    "description": "Window seat",
    "capacity": 6,
    "coworkingSpace": "664b0000000000000000001",
    "createdAt": "2026-04-18T10:00:00.000Z"
  }
}
```

**Errors**

| Status | Cause |
|--------|-------|
| 400    | Validation error or missing `coworkingSpaceId` |
| 401    | Not authenticated |
| 403    | Not the space's owner (and not admin) |
| 404    | Coworking space not found |

---

### DELETE `/rooms/:id`

Delete a room. Cascades: all reservations linked to this room are cancelled and every affected user is emailed (US1-6).

**Access:** Private — `owner` of the space that contains the room, or `admin`

**URL Params:** `id` — Room ObjectId

**Side Effects**
- All `Reservation` documents where `room === :id` are deleted.
- Each affected user whose reservation has an email receives a cancellation email. Per-recipient email failures are non-fatal — one bad email does not roll back the delete.

**Example Request**
```
DELETE /api/v1/rooms/664e0000000000000000030
Authorization: Bearer <owner_or_admin_token>
```

**Example Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "roomId": "664e0000000000000000030",
    "cancelledReservations": 2,
    "notifiedUsers": 2
  }
}
```

**Errors**

| Status | Cause |
|--------|-------|
| 401    | Not authenticated |
| 403    | Not the space's owner (and not admin) |
| 404    | Room not found |
| 500    | Server error |

> **Warning:** This is a cascading delete. All reservations for this room are permanently removed.

---

## 5. Reservations

Reservations can be accessed via two base paths:

| Path | Context |
|------|---------|
| `/api/v1/reservations` | Global — used for GET all, GET one, PUT, DELETE |
| `/api/v1/coworkingSpaces/:coworkingSpaceId/reservations` | Scoped — required for POST (create) |

---

### GET `/reservations/public/:id`

Fetch a reservation's details without authentication. Intended for QR code scanning at check-in.

**Access:** Public

**URL Params:** `id` — Reservation ObjectId

**Example Request**
```
GET /api/v1/reservations/public/664c0000000000000000010
```

**Example Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "664c0000000000000000010",
    "apptDate": "2025-06-01T03:00:00.000Z",
    "apptEnd": "2025-06-01T05:00:00.000Z",
    "qrCode": "data:image/png;base64,...",
    "coworkingSpace": {
      "_id": "664b0000000000000000001",
      "name": "TechHub BKK",
      "address": "123 Silom Rd, Bangkok",
      "tel": "021234567",
      "opentime": "08:00",
      "closetime": "20:00"
    },
    "user": {
      "_id": "664a1b2c3d4e5f6a7b8c9d0e",
      "name": "Alice Smith",
      "tel": "0812345678",
      "email": "alice@example.com"
    }
  }
}
```

**Errors**

| Status | Cause |
|--------|-------|
| 404    | Reservation not found |
| 500    | Server error |

---

### GET `/reservations`

Get all reservations.

- **Admin:** sees all reservations across all users and spaces.
- **Regular user:** sees only their own reservations.

**Access:** Private (admin or user)

**Query Parameters**

| Parameter | Type   | Description |
|-----------|--------|-------------|
| `page`    | number | Page number (default: 1) |
| `limit`   | number | Results per page (default: 25) |

**Example Request**
```
GET /api/v1/reservations
Authorization: Bearer <token>
```

**Example Response** `200 OK`
```json
{
  "success": true,
  "count": 1,
  "pagination": {},
  "data": [
    {
      "_id": "664c0000000000000000010",
      "apptDate": "2025-06-01T03:00:00.000Z",
      "apptEnd": "2025-06-01T05:00:00.000Z",
      "createdAt": "2025-05-20T10:00:00.000Z",
      "qrCode": "data:image/png;base64,...",
      "coworkingSpace": {
        "_id": "664b0000000000000000001",
        "name": "TechHub BKK",
        "address": "123 Silom Rd, Bangkok",
        "tel": "021234567",
        "opentime": "08:00",
        "closetime": "20:00"
      }
    }
  ]
}
```

---

### GET `/reservations/:id`

Get a single reservation by ID.

- Users can only view their own reservations.
- Admins can view any reservation.

**Access:** Private (admin or user)

**URL Params:** `id` — Reservation ObjectId

**Example Request**
```
GET /api/v1/reservations/664c0000000000000000010
Authorization: Bearer <token>
```

**Example Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "664c0000000000000000010",
    "apptDate": "2025-06-01T03:00:00.000Z",
    "apptEnd": "2025-06-01T05:00:00.000Z",
    "user": "664a1b2c3d4e5f6a7b8c9d0e",
    "coworkingSpace": {
      "name": "TechHub BKK",
      "address": "123 Silom Rd, Bangkok",
      "opentime": "08:00",
      "closetime": "20:00"
    }
  }
}
```

**Errors**

| Status | Cause |
|--------|-------|
| 403    | Authenticated user does not own this reservation |
| 404    | Reservation not found |

---

### POST `/coworkingSpaces/:coworkingSpaceId/reservations`

Create a new reservation at a specific coworking space.

**Access:** Private (admin or user)

**URL Params:** `coworkingSpaceId` — ObjectId of the target space

**Request Body**

| Field      | Type   | Required | Description |
|------------|--------|----------|-------------|
| `apptDate` | string | Yes      | ISO 8601 datetime — must be a future, on-the-hour time within operating hours |
| `apptEnd`  | string | No       | ISO 8601 datetime — defaults to 60 min after `apptDate` if omitted |

**Business Rules**

| Rule | Detail |
|------|--------|
| Future only | `apptDate` must be after current time |
| On-the-hour | Both `apptDate` and `apptEnd` must have `:00` minutes and `:00` seconds |
| Operating hours | Both times must fall within the space's `opentime`–`closetime` (Asia/Bangkok timezone) |
| End after start | `apptEnd` must be strictly after `apptDate` |
| No overlap | Must not overlap with any of your existing reservations at the same space |
| 3-reservation cap | Regular users may hold at most 3 future reservations at any time |

**Side Effects**
- A QR code (`data:image/png;base64,…`) is generated and stored on the reservation.
- A confirmation email (with QR code attachment) is sent to the user's email address.

**Example Request**
```json
POST /api/v1/coworkingSpaces/664b0000000000000000001/reservations
Authorization: Bearer <token>

{
  "apptDate": "2025-06-01T03:00:00.000Z",
  "apptEnd": "2025-06-01T05:00:00.000Z"
}
```
> `2025-06-01T03:00:00.000Z` = 10:00 Bangkok time (UTC+7). Ensure times align with Bangkok timezone.

**Example Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "664c0000000000000000010",
    "apptDate": "2025-06-01T03:00:00.000Z",
    "apptEnd": "2025-06-01T05:00:00.000Z",
    "user": "664a1b2c3d4e5f6a7b8c9d0e",
    "coworkingSpace": "664b0000000000000000001",
    "qrCode": "data:image/png;base64,...",
    "createdAt": "2025-05-20T10:00:00.000Z"
  }
}
```

**Errors**

| Status | Cause |
|--------|-------|
| 400    | Invalid/past date; not on the hour; outside operating hours; end before start; overlapping reservation; 3-reservation cap exceeded |
| 404    | Coworking space not found |
| 500    | Server error |

---

### PUT `/reservations/:id`

Update the date/time of an existing reservation.

- Users can only update their own reservations.
- Admins can update any reservation and are exempt from the 1-hour deadline rule.

**Access:** Private (admin or user)

**URL Params:** `id` — Reservation ObjectId

**Request Body** — at least one field required

| Field      | Type   | Description |
|------------|--------|-------------|
| `apptDate` | string | New start datetime (ISO 8601) |
| `apptEnd`  | string | New end datetime (ISO 8601) |

If only `apptDate` is provided, `apptEnd` shifts by the same duration as the original booking.

**Business Rules** — same as creation plus:

| Rule | Detail |
|------|--------|
| 1-hour deadline | Regular users cannot modify within 1 hour of the booked start time |

**Example Request**
```json
PUT /api/v1/reservations/664c0000000000000000010
Authorization: Bearer <token>

{
  "apptDate": "2025-06-02T04:00:00.000Z",
  "apptEnd": "2025-06-02T06:00:00.000Z"
}
```

**Example Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "664c0000000000000000010",
    "apptDate": "2025-06-02T04:00:00.000Z",
    "apptEnd": "2025-06-02T06:00:00.000Z"
  }
}
```

**Errors**

| Status | Cause |
|--------|-------|
| 400    | No fields provided; within 1-hour deadline; date validation failures; overlap |
| 403    | User does not own this reservation |
| 404    | Reservation or coworking space not found |

---

### DELETE `/reservations/:id`

Cancel (permanently delete) a reservation.

- Users can only delete their own reservations.
- Admins can delete any reservation and are exempt from the 1-hour deadline rule.

**Access:** Private (admin or user)

**URL Params:** `id` — Reservation ObjectId

**Business Rules**

| Rule | Detail |
|------|--------|
| 1-hour deadline | Regular users cannot cancel within 1 hour of the booked start time |

**Example Request**
```
DELETE /api/v1/reservations/664c0000000000000000010
Authorization: Bearer <token>
```

**Example Response** `200 OK`
```json
{
  "success": true,
  "data": {}
}
```

**Errors**

| Status | Cause |
|--------|-------|
| 400    | Within 1-hour deadline |
| 403    | User does not own this reservation |
| 404    | Reservation not found |

---

## 6. Data Models

### User

| Field       | Type   | Notes |
|-------------|--------|-------|
| `_id`       | ObjectId | Auto-generated |
| `name`      | string | Required |
| `tel`       | string | Required, 10 digits |
| `email`     | string | Required, unique |
| `role`      | string | `"user"` (default), `"admin"`, or `"owner"` |
| `password`  | string | bcrypt-hashed, never returned in responses |
| `dateOfBirth` | Date   | Required |
| `occupation`  | string | Required |
| `gender`      | string | Required, enum |
| `revenue`     | Number | Required, default 0 |
| `createdAt` | Date   | Auto-set |

### CoworkingSpace

| Field       | Type   | Notes |
|-------------|--------|-------|
| `_id`       | ObjectId | Auto-generated |
| `name`      | string | Required, unique, max 50 chars |
| `address`   | string | Required |
| `tel`       | string | Required |
| `opentime`  | string | Required, format `HH:MM` |
| `closetime` | string | Required, format `HH:MM` |
| `owner`     | ObjectId | Ref: User. Set when an admin approves a `CoworkingSpaceRequest` (US1-2) or assigned directly by admin. |
| `reservations` | virtual | Populated on GET all |

### Room

| Field            | Type     | Notes |
|------------------|----------|-------|
| `_id`            | ObjectId | Auto-generated |
| `name`           | string   | Required, max 100 chars |
| `description`    | string   | Optional, max 500 chars |
| `capacity`       | number   | Required, min 1 |
| `coworkingSpace` | ObjectId | Ref: CoworkingSpace, required |
| `reservations`   | virtual  | Populated via reverse lookup on `Reservation.room` |
| `createdAt`      | Date     | Auto-set |

### Reservation

| Field            | Type     | Notes |
|------------------|----------|-------|
| `_id`            | ObjectId | Auto-generated |
| `apptDate`       | Date     | Required — start of booking |
| `apptEnd`        | Date     | Required — end of booking |
| `user`           | ObjectId | Ref: User |
| `coworkingSpace` | ObjectId | Ref: CoworkingSpace |
| `room`           | ObjectId | Ref: Room. Optional — links a reservation to a specific room so it can be cancelled when the room is deleted (US1-6). |
| `qrCode`         | string   | Base64 data URI, generated on creation |
| `createdAt`      | Date     | Auto-set |

### CoworkingSpaceRequest

| Field              | Type     | Notes |
|--------------------|----------|-------|
| `_id`              | ObjectId | Auto-generated |
| `submitter`        | ObjectId | Ref: User, required |
| `name`             | string   | Required, max 50 chars |
| `address`          | string   | Required |
| `tel`              | string   | Required, 10 digits |
| `opentime`         | string   | Required, `HH:MM` |
| `closetime`        | string   | Required, `HH:MM` |
| `description`      | string   | Required, 10–1000 words |
| `pics`             | [string] | Array of `http(s)` URLs |
| `proofOfOwnership` | string   | Required, `http(s)` URL |
| `status`           | string   | `"pending"` (default), `"approved"`, or `"rejected"` |
| `rejectionReason`  | string   | Populated by admin on rejection (US1-2) |
| `reviewedBy`       | ObjectId | Ref: User (the admin who reviewed). US1-2. |
| `reviewedAt`       | Date     | Timestamp when admin reviewed. US1-2. |
| `createdAt`        | Date     | Auto-set |

---

## 7. Error Reference

All error responses follow this shape:

```json
{
  "success": false,
  "message": "Human-readable description"
}
```

| HTTP Status | Meaning |
|-------------|---------|
| 200         | OK |
| 201         | Created |
| 400         | Bad request — validation or business rule violation |
| 401         | Unauthorized — wrong credentials |
| 403         | Forbidden — authenticated but not allowed |
| 404         | Resource not found |
| 500         | Internal server error |
| 502         | Bad gateway — upstream AI service error |

---

## Quick Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | Public | Register |
| POST | `/auth/login` | Public | Login |
| GET | `/auth/me` | User | Get my profile |
| GET | `/auth/logout` | User | Logout |
| GET | `/coworkingSpaces` | Public | List all spaces |
| GET | `/coworkingSpaces/:id` | Public | Get one space |
| POST | `/coworkingSpaces` | Admin | Create space |
| PUT | `/coworkingSpaces/:id` | Admin | Update space |
| DELETE | `/coworkingSpaces/:id` | Admin | Delete space + reservations |
| POST | `/coworkingSpaceRequests` | User | Submit new-space request |
| GET | `/coworkingSpaceRequests/mine` | User | List my requests |
| GET | `/coworkingSpaceRequests/mine/:id` | User | Get one of my requests |
| GET | `/rooms` | Public | List all rooms |
| GET | `/coworkingSpaces/:spaceId/rooms` | Public | List rooms in a space |
| POST | `/coworkingSpaces/:spaceId/rooms` | Owner/Admin | Create room |
| DELETE | `/rooms/:id` | Owner/Admin | Delete room + cancel reservations |
| GET | `/reservations/public/:id` | Public | Get reservation (QR scan) |
| GET | `/reservations` | User/Admin | List reservations |
| GET | `/reservations/:id` | User/Admin | Get one reservation |
| POST | `/coworkingSpaces/:spaceId/reservations` | User/Admin | Create reservation |
| PUT | `/reservations/:id` | User/Admin | Update reservation |
| DELETE | `/reservations/:id` | User/Admin | Cancel reservation |
