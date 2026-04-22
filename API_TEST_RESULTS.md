# API Test Results — Owner Dashboard Stats, Insights & Enhanced Filters

**Test Date:** 2026-04-22  
**Server:** http://localhost:5000  
**Database:** 584 reservations, 21 users, 1 space, 7 rooms (seeded with biases)

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Owner | owner@tkfastwork.com | owner1234 |
| Admin | admin@cowork.com | admin1234 |

**Space ID:** `69e8d6a89cc756b44df81f72` (TKFastWork Hub)

---

## 1. Dashboard Stats API

**Endpoint:** `GET /api/v1/coworkingSpaces/:id/stats`  
**Auth:** Owner (Bearer token)  
**Query:** `?from=2026-01-01&to=2026-04-22`

### Response

```json
{
  "success": true,
  "data": {
    "totalBookings": 584,
    "totalUniqueUsers": 19,
    "avgBookingDurationMinutes": 86.61
  }
}
```

### Room Utilization

| Room | Type | Hours Booked | Bookings |
|------|------|-------------|----------|
| Boardroom Alpha | meeting | 151 | 99 |
| Meeting Room Beta | meeting | 147 | 102 |
| Meeting Room Gamma | meeting | 154 | 104 |
| Private Office A | private office | 161 | 105 |
| Private Office B | private office | 161 | 110 |
| Phone Booth 1 | phone booth | 32 | 30 |
| Phone Booth 2 | phone booth | 37 | 34 |

### Peak Hours

| Hour | Bookings |
|------|----------|
| 13:00 | 102 |
| 10:00 | 101 |
| 12:00 | 82 |
| 11:00 | 79 |
| 9:00 | 46 |

### Demographic Breakdown

**By Gender:**

| Gender | Count | Percentage |
|--------|-------|-----------|
| female | 9 | 47.37% |
| male | 8 | 42.11% |
| non-binary | 1 | 5.26% |
| prefer not to say | 1 | 5.26% |

**By Occupation:**

| Occupation | Count | Percentage |
|------------|-------|-----------|
| student | 8 | 42.11% |
| engineer | 4 | 21.05% |
| freelancer | 3 | 15.79% |
| business owner | 2 | 10.53% |
| teacher | 1 | 5.26% |
| doctor | 1 | 5.26% |

**By Age Group:**

| Age Group | Count | Percentage |
|-----------|-------|-----------|
| <18 | 1 | 5.26% |
| 18-25 | 7 | 36.84% |
| 26-35 | 5 | 26.32% |
| 36-50 | 5 | 26.32% |
| 50+ | 1 | 5.26% |

**By Revenue Range:**

| Range | Count | Percentage |
|-------|-------|-----------|
| 0-20000 | 8 | 42.11% |
| 20001-50000 | 3 | 15.79% |
| 50001-100000 | 5 | 26.32% |
| 100001+ | 3 | 15.79% |

### Access Control Tests

| Test | Expected | Result |
|------|----------|--------|
| Owner requests own space stats | 200 OK | PASS |
| Non-owner user requests stats | 403 Forbidden | PASS |
| Default time range (no params) | Last 30 days | PASS |

---

## 2. Rule-Based Insight Engine

**Endpoint:** `GET /api/v1/coworkingSpaces/:id/insights`  
**Auth:** Owner (Bearer token)  
**Query:** `?from=2026-01-01&to=2026-04-22`

### Generated Insights (8 total)

#### Demographic Comparisons

| # | Insight | Severity |
|---|---------|----------|
| 1 | "students book 2.32x more than engineers (295 vs 127 bookings)" | info |
| 2 | "Age group 18-25 books 1.66x more than age group 26-35 (264 vs 159)" | info |

#### Room Popularity

| # | Insight | Severity |
|---|---------|----------|
| 3 | Most popular room: "Private Office B" (private office) with 110 bookings. Least popular: "Phone Booth 1" (phone booth) with 30 bookings. | info |
| 4 | "meeting rooms are 4.77x more popular than phone booth rooms (305 vs 64 bookings)" | **highlight** |

#### Time Patterns

| # | Insight | Severity |
|---|---------|----------|
| 5 | "Peak booking hour: 13:00-14:00 with 102 bookings" | info |
| 6 | "Busiest day of the week: Friday with 107 bookings" | info |

**Day distribution:** Fri 107, Tue 107, Wed 105, Thu 100, Mon 99, Sun 38, Sat 28

#### Utilization Alerts

| # | Insight | Severity |
|---|---------|----------|
| 7 | Room "Phone Booth 2" has very low utilization: 2.78% | **warning** |
| 8 | Room "Phone Booth 1" has very low utilization: 2.40% | **warning** |

### Insight Types Coverage

| Type | Count | Status |
|------|-------|--------|
| demographic_comparison | 2 | PASS |
| room_popularity | 2 | PASS |
| time_pattern | 2 | PASS |
| utilization_alert | 2 | PASS |

---

## 3. Enhanced Reservation Filters

**Endpoint:** `GET /api/v1/reservations` (tested with admin token for full visibility)

### Filter Results

| Filter | Params | Count | Status |
|--------|--------|-------|--------|
| No filter (total) | — | 584 | PASS |
| By gender (female) | `?userGender=female` | 304 | PASS |
| By gender (male) | `?userGender=male` | 232 | PASS |
| By occupation (student) | `?userOccupation=student` | 295 | PASS |
| By occupation (engineer) | `?userOccupation=engineer` | 127 | PASS |
| By occupation (freelancer) | `?userOccupation=freelancer` | 111 | PASS |
| By age range (18-25) | `?userMinAge=18&userMaxAge=25` | 264 | PASS |
| By age range (26-35) | `?userMinAge=26&userMaxAge=35` | 159 | PASS |
| By revenue range (50k-100k) | `?userRevenue[gte]=50000&userRevenue[lte]=100000` | 164 | PASS |
| Combined (female + student) | `?userGender=female&userOccupation=student` | 155 | PASS |
| Gender in (male,female) | `?userGender[in]=male,female` | works | PASS |
| Space-scoped + filter | `/coworkingSpaces/:id/reservations?userOccupation=engineer` | works | PASS |

### Filter Validation

- **AND logic:** female (304) + student (295) combined = 155 (correct intersection)
- **Pagination preserved:** existing `?page=1&limit=25` works alongside demographic filters
- **Space-scoped filters:** work correctly via `/coworkingSpaces/:id/reservations` route

---

## Bias Verification (Seeded Data)

The mock data confirms the intended biases:

| Bias | Expected | Actual | Verified |
|------|----------|--------|----------|
| Students book most | Most bookings | 295/584 (50.5%) | YES |
| Meeting rooms most popular | Highest booking count | 305 total (meeting) vs 64 (phone booth) | YES |
| Peak hours 10-14 | Highest booking concentration | Hours 10-13 = 364 bookings (62.3%) | YES |
| Weekdays >> weekends | More weekday bookings | Weekday ~518 vs weekend ~66 | YES |
| Phone booths least used | Lowest utilization | 2.4-2.78% utilization | YES |

---

## Summary

| Feature | Endpoints | Status |
|---------|-----------|--------|
| Dashboard Stats API | `GET /coworkingSpaces/:id/stats` | ALL PASS |
| Insight Engine | `GET /coworkingSpaces/:id/insights` | ALL PASS |
| Enhanced Filters | `GET /reservations` (enhanced) | ALL PASS |
| Access Control (403) | Owner-only for stats/insights | PASS |
| Time Range Filtering | `?from=...&to=...` | PASS |
| Pagination Compatibility | Existing pagination preserved | PASS |

**All 3 features implemented and verified.**
