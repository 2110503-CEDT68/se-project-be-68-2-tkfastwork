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

---

## 4. LLM-Enhanced AI Insights

**Endpoint:** `GET /api/v1/coworkingSpaces/:id/ai-insights`  
**Auth:** Owner (Bearer token)  
**Query:** `?from=2026-01-01&to=2026-04-22`  
**LLM:** Gemini 2.5 Flash via OpenRouter

### How It Works

1. Collects all stats data (bookings, room utilization, demographics, peak hours, weekday distribution)
2. Sends structured data to Gemini 2.5 Flash with a business analyst prompt
3. LLM returns priority-ranked actionable insights with categories, impact levels, and concrete actions
4. Falls back gracefully if LLM is unavailable (503 response)

### Example Response

```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "priority": 1,
        "category": "risk_alert",
        "title": "Extremely Low User Base & High Booking Concentration",
        "message": "With only 19 unique users generating 584 total bookings, TKFastWork Hub is highly dependent on a very small customer base. Any churn from these users would severely impact booking volume and revenue.",
        "impact": "high",
        "action": "Implement a robust customer acquisition strategy immediately, focusing on attracting new users beyond the current 19, and develop loyalty programs for existing users.",
        "source": "ai"
      },
      {
        "priority": 2,
        "category": "space_optimization",
        "title": "Underutilized Phone Booths: Re-evaluate Purpose",
        "message": "Phone Booths 1 and 2 have significantly lower utilization (2.4% and 2.78%) compared to other spaces (11-12%). This indicates they are not meeting current user needs or are poorly marketed.",
        "impact": "high",
        "action": "Survey existing users on their needs for private, short-term spaces. Consider repurposing one or both phone booths into small, single-person focus rooms, or offering them at a lower price point/different booking model.",
        "source": "ai"
      },
      {
        "priority": 3,
        "category": "revenue_opportunity",
        "title": "Peak Hour Demand & Pricing Strategy",
        "message": "The 10:00 AM - 1:00 PM block accounts for a significant portion of daily bookings (365 out of 584 total bookings), indicating high demand during these hours.",
        "impact": "high",
        "action": "Implement dynamic pricing for peak hours (10:00 AM - 1:00 PM) for all bookable spaces to maximize revenue, while potentially offering discounts during off-peak times to encourage utilization.",
        "source": "ai"
      },
      {
        "priority": 4,
        "category": "growth_opportunity",
        "title": "Target Student & Young Professional Market",
        "message": "Students (42.11%) and individuals aged 18-25 (36.84%) represent the largest demographic segments. Many also fall into the lower revenue range (0-20000 at 42.11%).",
        "impact": "medium",
        "action": "Develop specific marketing campaigns and membership tiers tailored to students and young professionals, potentially offering student discounts or flexible, affordable packages to attract more users from these key demographics.",
        "source": "ai"
      },
      {
        "priority": 5,
        "category": "operational_efficiency",
        "title": "Weekend Underutilization: Drive Weekend Bookings",
        "message": "Saturday (4.79%) and Sunday (6.51%) have significantly fewer bookings compared to weekdays (16-18%), indicating substantial unused capacity during weekends.",
        "impact": "medium",
        "action": "Launch weekend-specific promotions, host community events, or partner with local businesses to drive weekend traffic and increase utilization during these low-demand periods.",
        "source": "ai"
      },
      {
        "priority": 6,
        "category": "customer_retention",
        "title": "Understand User Needs for Meeting vs. Private Spaces",
        "message": "Private Offices A and B have slightly higher utilization (12.09%) and booking counts (105-110) compared to the meeting rooms (11.04-11.56% utilization, 99-104 bookings).",
        "impact": "medium",
        "action": "Conduct a survey or direct interviews with existing users to understand their preference for private offices versus meeting rooms, and gather feedback on features or amenities that would enhance their experience in each space type.",
        "source": "ai"
      }
    ],
    "source": "ai",
    "model": "google/gemini-2.5-flash",
    "dataSnapshot": {
      "totalBookings": 584,
      "totalUniqueUsers": 19,
      "totalRooms": 7
    }
  }
}
```

### Insight Categories

| Category | Description |
|----------|-------------|
| `risk_alert` | Critical issues the owner must address (e.g., user concentration risk) |
| `space_optimization` | Room/space usage improvements (e.g., repurpose phone booths) |
| `revenue_opportunity` | Ways to increase revenue (e.g., dynamic peak pricing) |
| `growth_opportunity` | User acquisition and market expansion (e.g., target students) |
| `operational_efficiency` | Operational improvements (e.g., weekend utilization) |
| `customer_retention` | Retention strategies (e.g., survey user preferences) |

### Access Control Tests

| Test | Expected | Result |
|------|----------|--------|
| Owner requests own space AI insights | 200 OK with insights | PASS |
| Non-owner user requests AI insights | 403 Forbidden | PASS |
| Time range filtering | `?from=...&to=...` works | PASS |

---

## 5. Top Priority Insights (Rule-Based Ranked)

**Endpoint:** `GET /api/v1/coworkingSpaces/:id/top-insights`  
**Auth:** Owner (Bearer token)  
**Query:** `?from=2026-01-01&to=2026-04-22`  
**Engine:** Rule-based scoring (no LLM, deterministic, fast)

### How It Works

1. Collects stats data (same as other endpoints)
2. Applies scoring rules to detect significant patterns:
   - Rooms with < 5% utilization → score 95 (risk_alert, high impact)
   - Rooms with < 10% utilization → score 75 (space_optimization, medium)
   - Room type dominance (>3x ratio) → score 80 (space_optimization, high)
   - Peak hour concentration (>50% in 3 hours) → score 70 (revenue_opportunity, high)
   - Demographic dominance (>40% single occupation) → score 65 (growth_opportunity, medium)
   - Weekend gap (weekday 3x+ weekend) → score 60 (revenue_opportunity, medium)
   - Age concentration (>35% single group) → score 50 (customer_retention, medium)
3. Sorts by score descending, returns top 5

### Example Response

```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "rank": 1,
        "category": "risk_alert",
        "impact": "high",
        "title": "Phone Booth 1 is nearly unused",
        "message": "\"Phone Booth 1\" (phone booth) has only 2.4% utilization with 30 bookings. Consider repurposing, promoting, or removing this room to save costs.",
        "source": "rule-based"
      },
      {
        "rank": 2,
        "category": "risk_alert",
        "impact": "high",
        "title": "Phone Booth 2 is nearly unused",
        "message": "\"Phone Booth 2\" (phone booth) has only 2.78% utilization with 34 bookings. Consider repurposing, promoting, or removing this room to save costs.",
        "source": "rule-based"
      },
      {
        "rank": 3,
        "category": "space_optimization",
        "impact": "high",
        "title": "meeting rooms dominate demand",
        "message": "meeting rooms have 4.77x more bookings than phone booth rooms (305 vs 64). Consider converting underused phone booth rooms into meeting rooms.",
        "source": "rule-based"
      },
      {
        "rank": 4,
        "category": "growth_opportunity",
        "impact": "medium",
        "title": "students are your core segment",
        "message": "students make up 42.11% of your users. Tailor amenities and marketing to this group while exploring ways to attract engineers (currently 21.05%).",
        "source": "rule-based"
      },
      {
        "rank": 5,
        "category": "revenue_opportunity",
        "impact": "medium",
        "title": "Weekends are underutilized",
        "message": "Weekday bookings average 104/day vs 33/day on weekends (3.14x gap). Weekend promotions or events could unlock additional revenue.",
        "source": "rule-based"
      }
    ],
    "source": "rule-based-ranked",
    "dataSnapshot": {
      "totalBookings": 584,
      "totalUniqueUsers": 19,
      "totalRooms": 7
    }
  }
}
```

### Scoring Rules

| Rule | Trigger | Score | Impact |
|------|---------|-------|--------|
| Room nearly unused | utilization < 5% | 95 | high |
| Room type dominance | top type > 3x bottom type | 80 | high |
| Room underperforming | utilization < 10% | 75 | medium |
| Peak hour concentration | >50% bookings in 3 hours | 70 | high |
| Demographic dominance | >40% single occupation | 65 | medium |
| Weekend gap | weekday 3x+ weekend avg | 60 | medium |
| Age concentration | >35% single age group | 50 | medium |

### Access Control Tests

| Test | Expected | Result |
|------|----------|--------|
| Owner requests top insights | 200 OK with ranked insights | PASS |
| Non-owner user requests top insights | 403 Forbidden | PASS |
| Time range filtering | `?from=...&to=...` works | PASS |

---

## AI Insights vs Top Insights Comparison

| Feature | AI Insights (`/ai-insights`) | Top Insights (`/top-insights`) |
|---------|------------------------------|-------------------------------|
| Engine | Gemini 2.5 Flash (LLM) | Rule-based scoring |
| Speed | ~2-5 seconds (API call) | ~100ms (local computation) |
| Deterministic | No (varies per call) | Yes (same data = same result) |
| Actionability | High (specific recommendations) | Medium (pattern detection) |
| Cost | OpenRouter API credits | Free |
| Fallback | Returns 503 if LLM unavailable | Always works |
| Insight count | 5-8 per call | Top 5 by score |

---

## Updated Summary

| Feature | Endpoints | Status |
|---------|-----------|--------|
| Dashboard Stats API | `GET /coworkingSpaces/:id/stats` | ALL PASS |
| Rule-Based Insights | `GET /coworkingSpaces/:id/insights` | ALL PASS |
| Enhanced Filters | `GET /reservations` (enhanced) | ALL PASS |
| LLM AI Insights | `GET /coworkingSpaces/:id/ai-insights` | ALL PASS |
| Top Priority Insights | `GET /coworkingSpaces/:id/top-insights` | ALL PASS |
| Access Control (403) | Owner-only for all insight endpoints | PASS |
| Time Range Filtering | `?from=...&to=...` on all endpoints | PASS |
| Pagination Compatibility | Existing pagination preserved | PASS |

**All 5 features implemented and verified.**
