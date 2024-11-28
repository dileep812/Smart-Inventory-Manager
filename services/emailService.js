/**
 * Email Service
 * Sends email notifications using nodemailer
 */

import nodemailer from 'nodemailer';

// Determine if using SSL (port 465) or STARTTLS (port 587)
const smtpPort = parseInt(process.env.SMTP_PORT) || 465;
const useSSL = smtpPort === 465;

// Create transporter with SMTP settings
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: smtpPort,
    secure: useSSL, // true for 465 (SSL), false for 587 (STARTTLS)
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false // Allow self-signed certificates
    }
});

/**
 * Send low stock alert email
 * @param {string} userEmail - Recipient email (shop owner)
 * @param {string} productName - Name of the product
 * @param {number} currentStock - Current stock level
 */
export async function sendLowStockAlert(userEmail, productName, currentStock) {
    // Skip if SMTP is not configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`⚠️ SMTP not configured - Low stock alert for "${productName}" (Stock: ${currentStock}) would be sent to ${userEmail}`);
        return { success: false, reason: 'SMTP not configured' };
    }

    const mailOptions = {
        from: `"Smart Inventory" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `⚠️ Low Stock Alert: ${productName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">⚠️ Low Stock Alert</h1>
                </div>
                
                <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                    <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                        A product in your inventory is running low on stock:
                    </p>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #EF4444; margin-bottom: 20px;">
                        <h2 style="margin: 0 0 10px; color: #1f2937; font-size: 20px;">${productName}</h2>
                        <p style="margin: 0; font-size: 32px; font-weight: bold; color: #EF4444;">
                            ${currentStock} ${currentStock === 1 ? 'unit' : 'units'} remaining
                        </p>
                    </div>
                    
                    <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
                        Consider restocking this item soon to avoid stockouts.
                    </p>
                    
                    <a href="${process.env.APP_URL || 'http://localhost:3000'}/products" 
                       style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                        View Inventory
                    </a>
                </div>
                
                <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 20px;">
                    Smart Inventory Manager - Automated Alert
                </p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Low stock alert sent to ${userEmail} for "${productName}" - Message ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Failed to send low stock alert: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Send out of stock alert email
 * @param {string} userEmail - Recipient email (shop owner)
 * @param {string} productName - Name of the product
 */
export async function sendOutOfStockAlert(userEmail, productName) {
    // Skip if SMTP is not configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`⚠️ SMTP not configured - Out of stock alert for "${productName}" would be sent to ${userEmail}`);
        return { success: false, reason: 'SMTP not configured' };
    }

    const mailOptions = {
        from: `"Smart Inventory" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `🚨 Out of Stock: ${productName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%); color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">🚨 Out of Stock</h1>
                </div>
                
                <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                    <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                        A product in your inventory is now <strong>out of stock</strong>:
                    </p>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #7C3AED; margin-bottom: 20px;">
                        <h2 style="margin: 0 0 10px; color: #1f2937; font-size: 20px;">${productName}</h2>
                        <p style="margin: 0; font-size: 32px; font-weight: bold; color: #7C3AED;">
                            0 units remaining
                        </p>
                    </div>
                    
                    <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
                        This product cannot be sold until restocked. Please reorder immediately.
                    </p>
                    
                    <a href="${process.env.APP_URL || 'http://localhost:3000'}/products" 
                       style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                        Restock Now
                    </a>
                </div>
                
                <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 20px;">
                    Smart Inventory Manager - Automated Alert
                </p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Out of stock alert sent to ${userEmail} for "${productName}" - Message ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Failed to send out of stock alert: ${error.message}`);
        return { success: false, error: error.message };
    }
}

export default { sendLowStockAlert, sendOutOfStockAlert };
