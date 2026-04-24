const CoworkingSpace = require('../models/CoworkingSpace');
const { parseDateRange } = require('../services/reportData');
const { generateAIInsights, generateTopInsights } = require('../services/llmInsights');

const verifyOwnership = async (req, res) => {
    const space = await CoworkingSpace.findById(req.params.id);
    if (!space) {
        res.status(404).json({ success: false, message: 'Coworking space not found' });
        return null;
    }
    if (!space.owner || space.owner.toString() !== req.user.id) {
        res.status(403).json({ success: false, message: 'Not authorized - owner only' });
        return null;
    }
    return space;
};

//@desc     Get LLM-enhanced insights for a coworking space
//@route    GET /api/v1/coworkingSpaces/:id/ai-insights
//@access   Private (owner of space only)
exports.getAIInsights = async (req, res) => {
    try {
        const space = await verifyOwnership(req, res);
        if (!space) return;

        const { from, to } = parseDateRange({
            from: req.query.from,
            to: req.query.to
        });

        const result = await generateAIInsights({ space, from, to });

        res.status(200).json({ success: true, data: result });
    } catch (err) {
        console.log(err);

        if (err.message && err.message.includes('OPENROUTER_KEY')) {
            return res.status(503).json({ success: false, message: 'AI service not configured' });
        }

        res.status(500).json({ success: false, message: 'Cannot generate AI insights' });
    }
};

//@desc     Get top priority-ranked insights for a coworking space
//@route    GET /api/v1/coworkingSpaces/:id/top-insights
//@access   Private (owner of space only)
exports.getTopInsights = async (req, res) => {
    try {
        const space = await verifyOwnership(req, res);
        if (!space) return;

        const { from, to } = parseDateRange({
            from: req.query.from,
            to: req.query.to
        });

        const result = await generateTopInsights({ space, from, to });

        res.status(200).json({ success: true, data: result });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: 'Cannot generate top insights' });
    }
};
