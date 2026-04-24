const { getSpaceReportData } = require('./reportData');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash';

const buildPrompt = (report) => {
    const { spaceName, totalBookings, totalUniqueUsers, avgBookingDurationMinutes,
        roomUtilization, peakHours, bookingsByWeekday, demographicBreakdown } = report;

    return `You are an expert coworking space business analyst. Analyze the following data for "${spaceName}" and provide actionable insights ranked by business impact (most important first).

DATA:
- Total Bookings: ${totalBookings}
- Unique Users: ${totalUniqueUsers}
- Avg Booking Duration: ${avgBookingDurationMinutes} minutes

Room Utilization:
${roomUtilization.map(r => `  - ${r.roomName} (${r.roomType}): ${r.bookingCount} bookings, ${r.totalHoursBooked}h booked, ${r.utilizationPercent}% utilization`).join('\n')}

Peak Hours (top 5):
${peakHours.map(h => `  - ${String(h.hour).padStart(2, '0')}:00 → ${h.count} bookings`).join('\n')}

Bookings by Day of Week:
${(bookingsByWeekday || []).map(d => `  - ${d.day}: ${d.count} (${d.percentage}%)`).join('\n')}

Demographics - Gender:
${demographicBreakdown.byGender.map(g => `  - ${g.gender}: ${g.count} (${g.percentage}%)`).join('\n')}

Demographics - Occupation:
${demographicBreakdown.byOccupation.map(o => `  - ${o.occupation}: ${o.count} (${o.percentage}%)`).join('\n')}

Demographics - Age Group:
${demographicBreakdown.byAgeGroup.map(a => `  - ${a.ageGroup}: ${a.count} (${a.percentage}%)`).join('\n')}

Demographics - Revenue Range:
${demographicBreakdown.byRevenueRange.map(r => `  - ${r.range}: ${r.count} (${r.percentage}%)`).join('\n')}

Respond with a JSON array of 5-8 insights. Each insight must have:
- "priority": number (1 = most important)
- "category": one of "revenue_opportunity", "operational_efficiency", "customer_retention", "space_optimization", "growth_opportunity", "risk_alert"
- "title": short headline (max 10 words)
- "message": 1-2 sentence actionable insight with specific data references
- "impact": "high" | "medium" | "low"
- "action": one concrete action the owner should take

Respond ONLY with valid JSON array, no markdown, no explanation.`;
};

const callOpenRouter = async (prompt) => {
    const apiKey = process.env.OPENROUTER_KEY;
    if (!apiKey) {
        throw new Error('OPENROUTER_KEY not configured');
    }

    const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': process.env.BASE_URL || 'http://localhost:5000',
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 2000,
        })
    });

    if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`OpenRouter API error ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error('Empty response from LLM');
    }

    // Parse JSON from response (handle possible markdown wrapping)
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    return JSON.parse(cleaned);
};

const generateAIInsights = async ({ space, from, to }) => {
    const report = await getSpaceReportData({ space, from, to });

    if (report.totalBookings < 5) {
        return {
            insights: [],
            source: 'ai',
            message: 'Not enough data for AI analysis (minimum 5 bookings required)'
        };
    }

    const prompt = buildPrompt(report);
    const aiInsights = await callOpenRouter(prompt);

    // Validate and normalize
    const validated = (Array.isArray(aiInsights) ? aiInsights : [])
        .filter(i => i.priority && i.message && i.category)
        .sort((a, b) => a.priority - b.priority)
        .map((insight, idx) => ({
            priority: idx + 1,
            category: insight.category,
            title: insight.title || '',
            message: insight.message,
            impact: insight.impact || 'medium',
            action: insight.action || '',
            source: 'ai'
        }));

    return {
        insights: validated,
        source: 'ai',
        model: MODEL,
        dataSnapshot: {
            totalBookings: report.totalBookings,
            totalUniqueUsers: report.totalUniqueUsers,
            totalRooms: report.totalRooms
        }
    };
};

const generateTopInsights = async ({ space, from, to }) => {
    const report = await getSpaceReportData({ space, from, to });

    if (report.totalBookings < 5) {
        return { insights: [], message: 'Not enough data (minimum 5 bookings)' };
    }

    const scored = [];

    // --- Utilization alerts (high impact) ---
    report.roomUtilization.forEach(room => {
        if (room.utilizationPercent < 5) {
            scored.push({
                score: 95,
                category: 'risk_alert',
                impact: 'high',
                title: `${room.roomName} is nearly unused`,
                message: `"${room.roomName}" (${room.roomType}) has only ${room.utilizationPercent}% utilization with ${room.bookingCount} bookings. Consider repurposing, promoting, or removing this room to save costs.`,
            });
        } else if (room.utilizationPercent < 10) {
            scored.push({
                score: 75,
                category: 'space_optimization',
                impact: 'medium',
                title: `${room.roomName} underperforming`,
                message: `"${room.roomName}" (${room.roomType}) is at ${room.utilizationPercent}% utilization. Consider targeted promotions or adjusting pricing.`,
            });
        }
    });

    // --- Room type dominance ---
    const typeMap = {};
    report.roomUtilization.forEach(r => {
        typeMap[r.roomType] = (typeMap[r.roomType] || 0) + r.bookingCount;
    });
    const types = Object.entries(typeMap).sort((a, b) => b[1] - a[1]);
    if (types.length >= 2) {
        const [topType, topCount] = types[0];
        const [botType, botCount] = types[types.length - 1];
        const ratio = botCount > 0 ? Math.round((topCount / botCount) * 100) / 100 : topCount;
        if (ratio >= 3) {
            scored.push({
                score: 80,
                category: 'space_optimization',
                impact: 'high',
                title: `${topType} rooms dominate demand`,
                message: `${topType} rooms have ${ratio}x more bookings than ${botType} rooms (${topCount} vs ${botCount}). Consider converting underused ${botType} rooms into ${topType} rooms.`,
            });
        }
    }

    // --- Peak hour concentration ---
    if (report.peakHours.length >= 2) {
        const topHour = report.peakHours[0];
        const totalInPeak = report.peakHours.slice(0, 3).reduce((s, h) => s + h.count, 0);
        const peakPct = Math.round((totalInPeak / report.totalBookings) * 100);
        if (peakPct > 50) {
            scored.push({
                score: 70,
                category: 'revenue_opportunity',
                impact: 'high',
                title: 'High peak-hour concentration',
                message: `${peakPct}% of all bookings happen in just 3 hours (${report.peakHours.slice(0, 3).map(h => `${h.hour}:00`).join(', ')}). Consider off-peak discounts to spread demand and increase total utilization.`,
            });
        }
    }

    // --- Demographic dominance ---
    const occSorted = [...report.demographicBreakdown.byOccupation].sort((a, b) => b.count - a.count);
    if (occSorted.length >= 2 && occSorted[0].percentage > 40) {
        scored.push({
            score: 65,
            category: 'growth_opportunity',
            impact: 'medium',
            title: `${occSorted[0].occupation}s are your core segment`,
            message: `${occSorted[0].occupation}s make up ${occSorted[0].percentage}% of your users. Tailor amenities and marketing to this group while exploring ways to attract ${occSorted[1].occupation}s (currently ${occSorted[1].percentage}%).`,
        });
    }

    // --- Weekend vs weekday gap ---
    const weekdayData = report.bookingsByWeekday || [];
    const weekdays = weekdayData.filter(d => !['Saturday', 'Sunday'].includes(d.day));
    const weekends = weekdayData.filter(d => ['Saturday', 'Sunday'].includes(d.day));
    const avgWeekday = weekdays.length > 0 ? weekdays.reduce((s, d) => s + d.count, 0) / weekdays.length : 0;
    const avgWeekend = weekends.length > 0 ? weekends.reduce((s, d) => s + d.count, 0) / weekends.length : 0;
    if (avgWeekday > 0 && avgWeekend > 0) {
        const weekdayRatio = Math.round((avgWeekday / avgWeekend) * 100) / 100;
        if (weekdayRatio >= 3) {
            scored.push({
                score: 60,
                category: 'revenue_opportunity',
                impact: 'medium',
                title: 'Weekends are underutilized',
                message: `Weekday bookings average ${Math.round(avgWeekday)}/day vs ${Math.round(avgWeekend)}/day on weekends (${weekdayRatio}x gap). Weekend promotions or events could unlock additional revenue.`,
            });
        }
    }

    // --- Age concentration ---
    const ageSorted = [...report.demographicBreakdown.byAgeGroup].sort((a, b) => b.count - a.count);
    if (ageSorted.length >= 2 && ageSorted[0].percentage > 35) {
        scored.push({
            score: 50,
            category: 'customer_retention',
            impact: 'medium',
            title: `Age ${ageSorted[0].ageGroup} dominates your users`,
            message: `The ${ageSorted[0].ageGroup} age group represents ${ageSorted[0].percentage}% of users. Ensure your space caters to their needs (pricing, ambiance, hours) to maintain retention.`,
        });
    }

    // --- Most popular room highlight ---
    const bestRoom = [...report.roomUtilization].sort((a, b) => b.bookingCount - a.bookingCount)[0];
    if (bestRoom) {
        scored.push({
            score: 45,
            category: 'operational_efficiency',
            impact: 'low',
            title: `${bestRoom.roomName} is your star room`,
            message: `"${bestRoom.roomName}" leads with ${bestRoom.bookingCount} bookings and ${bestRoom.utilizationPercent}% utilization. It's performing well — consider adding similar room types.`,
        });
    }

    // Sort by score descending, take top 5
    scored.sort((a, b) => b.score - a.score);
    const topInsights = scored.slice(0, 5).map((insight, idx) => ({
        rank: idx + 1,
        category: insight.category,
        impact: insight.impact,
        title: insight.title,
        message: insight.message,
        source: 'rule-based'
    }));

    return {
        insights: topInsights,
        source: 'rule-based-ranked',
        dataSnapshot: {
            totalBookings: report.totalBookings,
            totalUniqueUsers: report.totalUniqueUsers,
            totalRooms: report.totalRooms
        }
    };
};

module.exports = { generateAIInsights, generateTopInsights };
