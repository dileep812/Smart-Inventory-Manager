/**
 * AI Controller
 * Handles AI-powered features like product description generation
 */

import db from '../config/db.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google Gemini AI
let genAI = null;
let model = null;

if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    console.log('✓ Google Gemini AI initialized');
} else {
    console.log('⚠ GEMINI_API_KEY not found - using fallback descriptions');
}

/**
 * POST /api/ai/generate-desc
 * Generate a product description using AI
 */
export const generateDescription = async (req, res) => {
    try {
        const { name, category } = req.body;
        const shopId = req.shopId; // From tenant middleware

        // Validate input
        if (!name || name.trim() === '') {
            return res.status(400).json({
                error: 'Product name is required'
            });
        }

        const productName = name.trim();
        const categoryName = category || 'General';

        // ============================================
        // Step A: Get Context - Query shop name
        // ============================================
        let shopName = 'Our Store';
        try {
            const shopResult = await db.query(
                'SELECT name FROM shops WHERE id = $1',
                [shopId]
            );
            if (shopResult.rows.length > 0) {
                shopName = shopResult.rows[0].name;
            }
        } catch (dbError) {
            console.error('Failed to fetch shop name:', dbError.message);
            // Continue with default shop name
        }

        // ============================================
        // Step B: Construct Prompt
        // ============================================
        const prompt = `You are a marketing expert for a shop named "${shopName}". Write a compelling 2-sentence product description for a product called "${productName}" in the "${categoryName}" category. Focus on benefits and appeal. Be concise and professional.`;

        // ============================================
        // Step C: Generate Description
        // ============================================

        // Try Google Gemini AI first
        if (model) {
            try {
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                if (text && text.trim()) {
                    return res.json({
                        description: text.trim(),
                        source: 'gemini'
                    });
                }
            } catch (aiError) {
                console.error('Google Gemini API error:', aiError.message);
                // Fall through to fallback
            }
        }

        // Fallback: Generate description locally
        const fallbackDescription = generateMockDescription(shopName, productName, categoryName);

        // ============================================
        // Step D: Send Response
        // ============================================
        return res.json({
            description: fallbackDescription,
            source: 'fallback'
        });

    } catch (error) {
        console.error('AI Description Generation Error:', error);
        return res.status(500).json({
            error: 'Failed to generate description. Please try again.'
        });
    }
};

/**
 * Generate a mock description for testing
 * Uses shop name, product name, and category to create personalized content
 */
function generateMockDescription(shopName, productName, category) {
    const templates = [
        `Welcome to ${shopName}! Our ${productName} is the perfect addition to your collection, offering premium quality in the ${category} line.`,
        `At ${shopName}, we take pride in our ${productName}. This exceptional ${category} product combines style, quality, and value like no other.`,
        `Discover the ${productName} from ${shopName} – your trusted source for ${category} excellence. Crafted with care to exceed your expectations.`,
        `${shopName} presents the ${productName}: a standout in our ${category} collection. Experience the difference that quality makes.`
    ];

    // Pick a random template for variety
    const randomIndex = Math.floor(Math.random() * templates.length);
    return templates[randomIndex];
}

/**
 * POST /api/ai/suggest-price
 * AI Pricing Advisor - suggests competitive selling price
 */
export const suggestPrice = async (req, res) => {
    try {
        const { name, category, costPrice } = req.body;
        const shopId = req.shopId;

        // Validate input
        if (!name || name.trim() === '') {
            return res.status(400).json({
                error: 'Product name is required'
            });
        }

        if (!costPrice || parseFloat(costPrice) <= 0) {
            return res.status(400).json({
                error: 'Please enter your cost price first'
            });
        }

        const productName = name.trim();
        const categoryName = category || 'General';
        const cost = parseFloat(costPrice).toFixed(2);

        // Get shop name for context
        let shopName = 'a retail store';
        try {
            const shopResult = await db.query(
                'SELECT name FROM shops WHERE id = $1',
                [shopId]
            );
            if (shopResult.rows.length > 0) {
                shopName = shopResult.rows[0].name;
            }
        } catch (dbError) {
            console.error('Failed to fetch shop name:', dbError.message);
        }

        // Construct pricing prompt
        const prompt = `I have a product called "${productName}" in the "${categoryName}" category. My cost is $${cost}. I run a store called "${shopName}". Suggest a competitive selling price and explain why in 1 short sentence. Format your response as: "Suggested Price: $XX.XX - [reason]"`;

        // Try Google Gemini AI
        if (model) {
            try {
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                if (text && text.trim()) {
                    // Try to extract price from response
                    const priceMatch = text.match(/\$(\d+\.?\d*)/);
                    const suggestedPrice = priceMatch ? parseFloat(priceMatch[1]) : null;

                    return res.json({
                        suggestion: text.trim(),
                        suggestedPrice: suggestedPrice,
                        source: 'gemini'
                    });
                }
            } catch (aiError) {
                console.error('Google Gemini API error:', aiError.message);
            }
        }

        // Fallback: Calculate a reasonable markup
        const fallbackResult = generateFallbackPrice(productName, categoryName, cost, shopName);

        return res.json({
            suggestion: fallbackResult.suggestion,
            suggestedPrice: fallbackResult.price,
            source: 'fallback'
        });

    } catch (error) {
        console.error('AI Price Suggestion Error:', error);
        return res.status(500).json({
            error: 'Failed to generate price suggestion. Please try again.'
        });
    }
};

/**
 * Generate fallback price suggestion
 * Uses standard retail markup formulas
 */
function generateFallbackPrice(productName, category, costPrice, shopName) {
    const cost = parseFloat(costPrice);

    // Category-based markup percentages
    const markups = {
        'Electronics': 0.25,      // 25% markup
        'Clothing': 0.50,         // 50% markup
        'Food': 0.35,             // 35% markup
        'Accessories': 0.60,      // 60% markup
        'Home & Garden': 0.40,    // 40% markup
        'General': 0.40           // 40% default markup
    };

    const markup = markups[category] || markups['General'];
    const suggestedPrice = cost * (1 + markup);
    const roundedPrice = Math.ceil(suggestedPrice * 100) / 100; // Round up to nearest cent

    const marginPercent = Math.round(markup * 100);

    return {
        price: roundedPrice,
        suggestion: `Suggested Price: $${roundedPrice.toFixed(2)} - A ${marginPercent}% markup is standard for ${category.toLowerCase()} products, giving you a healthy profit margin.`
    };
}
