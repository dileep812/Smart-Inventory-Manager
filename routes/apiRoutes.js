/**
 * API Routes
 * Handles API endpoints for AJAX operations
 */

import express from 'express';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/ai/generate-desc
 * Generate product description using AI
 */
router.post('/ai/generate-desc', isAuthenticated, async (req, res) => {
    try {
        const { name, category } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ 
                error: 'Product name is required' 
            });
        }
        
        const productName = name.trim();
        
        // Build product context for AI generation
        const categoryContext = category ? ` in the ${category} category` : '';
        
        // Check if OpenAI API key is configured
        if (process.env.OPENAI_API_KEY) {
            try {
                // Use OpenAI API for description generation
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-3.5-turbo',
                        messages: [
                            {
                                role: 'system',
                                content: 'You are a professional product copywriter. Write compelling, concise product descriptions for e-commerce. Keep descriptions between 2-4 sentences. Focus on benefits and features. Be professional but engaging.'
                            },
                            {
                                role: 'user',
                                content: `Write a product description for: "${productName}"${categoryContext}. Keep it concise and professional.`
                            }
                        ],
                        max_tokens: 150,
                        temperature: 0.7
                    })
                });
                
                const data = await response.json();
                
                if (data.choices && data.choices[0]?.message?.content) {
                    return res.json({
                        description: data.choices[0].message.content.trim(),
                        source: 'openai'
                    });
                }
            } catch (aiError) {
                console.error('OpenAI API error:', aiError);
                // Fall through to local generation
            }
        }
        
        // Fallback: Generate description locally using templates
        const descriptions = generateLocalDescription(productName, category);
        
        res.json({
            description: descriptions,
            source: 'local'
        });
        
    } catch (error) {
        console.error('AI Description Generation Error:', error);
        res.status(500).json({ 
            error: 'Failed to generate description. Please try again.' 
        });
    }
});

/**
 * Generate product description locally using templates
 * Fallback when AI API is not available
 */
function generateLocalDescription(productName, category) {
    const templates = {
        Electronics: [
            `Discover the ${productName}, engineered for exceptional performance and reliability. Featuring cutting-edge technology and sleek design, this device delivers outstanding results for both work and play. Built to last with premium components.`,
            `The ${productName} combines innovation with practicality. With advanced features and intuitive controls, it's designed to enhance your digital lifestyle. Backed by quality assurance for your peace of mind.`
        ],
        Clothing: [
            `Elevate your style with the ${productName}. Crafted from premium materials for lasting comfort and durability. This versatile piece transitions effortlessly from casual to formal settings.`,
            `The ${productName} offers the perfect blend of comfort and fashion. Made with quality fabrics and attention to detail, it's designed to complement any wardrobe.`
        ],
        Food: [
            `Indulge in the rich flavors of ${productName}. Made with carefully selected ingredients, this product delivers exceptional taste and quality in every serving. Perfect for any occasion.`,
            `Experience the difference with ${productName}. Prepared using traditional methods and the finest ingredients, it brings authentic flavors to your table.`
        ],
        Home: [
            `Transform your living space with the ${productName}. This thoughtfully designed piece combines functionality with aesthetic appeal, adding both style and convenience to your home.`,
            `The ${productName} brings quality and elegance to any room. Crafted with care and attention to detail, it's built to enhance your everyday life.`
        ],
        default: [
            `Introducing the ${productName}${category ? `, perfect for ${category.toLowerCase()} needs` : ''}. This premium product is crafted with quality materials and attention to detail. Designed to meet your needs, it offers excellent value and reliable performance.`,
            `The ${productName} delivers outstanding quality and performance. With its thoughtful design and durable construction, it's the perfect choice for those who appreciate excellence.`
        ]
    };
    
    const categoryTemplates = templates[category] || templates.default;
    const randomIndex = Math.floor(Math.random() * categoryTemplates.length);
    
    return categoryTemplates[randomIndex];
}

export default router;
