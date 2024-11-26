import db from '../config/db.js';
import bcrypt from 'bcrypt';

const DEFAULT_PASSWORD = 'Welcome123';

/**
 * GET /team
 * Display all team members for the shop
 */
export const getTeamPage = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, email, role, created_at FROM users WHERE shop_id = $1 ORDER BY created_at DESC',
            [req.shopId]
        );

        res.render('team/index', {
            activePage: 'team',
            team: result.rows,
            currentUserId: req.user.id,
            success: req.flash('success')[0] || null,
            error: req.flash('error')[0] || null
        });
    } catch (error) {
        console.error('Get team error:', error.message);
        req.flash('error', 'Failed to load team members');
        res.redirect('/dashboard');
    }
};

/**
 * POST /team/invite
 * Invite a new team member
 */
export const inviteMember = async (req, res) => {
    const { email, role } = req.body;

    if (!email || !role) {
        req.flash('error', 'Email and role are required');
        return res.redirect('/team');
    }

    if (!['manager', 'staff'].includes(role)) {
        req.flash('error', 'Invalid role selected');
        return res.redirect('/team');
    }

    try {
        // Check if email already exists
        const existingUser = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase().trim()]
        );

        if (existingUser.rows.length > 0) {
            req.flash('error', 'This email is already registered');
            return res.redirect('/team');
        }

        // Hash default password
        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

        // Insert new user
        await db.query(
            `INSERT INTO users (shop_id, email, password_hash, role) 
             VALUES ($1, $2, $3, $4)`,
            [req.shopId, email.toLowerCase().trim(), hashedPassword, role]
        );

        req.flash('success', `Member invited! Default password is ${DEFAULT_PASSWORD}`);
        res.redirect('/team');
    } catch (error) {
        console.error('Invite member error:', error.message);
        req.flash('error', 'Failed to invite member');
        res.redirect('/team');
    }
};

/**
 * POST /team/delete/:id
 * Remove a team member
 */
export const removeMember = async (req, res) => {
    const memberId = parseInt(req.params.id);

    // Prevent self-deletion
    if (memberId === req.user.id) {
        req.flash('error', 'You cannot remove yourself');
        return res.redirect('/team');
    }

    try {
        // Only delete staff/managers from own shop, not other owners
        const result = await db.query(
            'DELETE FROM users WHERE id = $1 AND shop_id = $2 AND role != $3 RETURNING id, email',
            [memberId, req.shopId, 'owner']
        );

        if (result.rows.length === 0) {
            req.flash('error', 'Member not found or cannot be removed');
        } else {
            req.flash('success', `${result.rows[0].email} has been removed from the team`);
        }

        res.redirect('/team');
    } catch (error) {
        console.error('Remove member error:', error.message);
        req.flash('error', 'Failed to remove member');
        res.redirect('/team');
    }
};

/**
 * POST /team/role/:id
 * Update a team member's role (promote/demote)
 */
export const updateRole = async (req, res) => {
    const memberId = parseInt(req.params.id);
    const { newRole } = req.body;



    // Validate role
    if (!['manager', 'staff'].includes(newRole)) {
        req.flash('error', 'Invalid role. Must be manager or staff');
        return res.redirect('/team');
    }

    // Prevent self role change
    if (memberId === req.user.id) {
        req.flash('error', 'You cannot change your own role');
        return res.redirect('/team');
    }

    try {
        // First check if the member exists
        const checkResult = await db.query(
            'SELECT id, email, role, shop_id FROM users WHERE id = $1',
            [memberId]
        );


        if (checkResult.rows.length === 0) {
            req.flash('error', 'Member not found');
            return res.redirect('/team');
        }

        const member = checkResult.rows[0];

        // Verify same shop
        if (member.shop_id !== req.shopId) {

            req.flash('error', 'Member not in your shop');
            return res.redirect('/team');
        }

        // Cannot change owner role
        if (member.role === 'owner') {
            req.flash('error', 'Cannot change owner role');
            return res.redirect('/team');
        }

        // Now do the update
        const result = await db.query(
            'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email',
            [newRole, memberId]
        );



        if (result.rows.length > 0) {
            const roleDisplay = newRole.charAt(0).toUpperCase() + newRole.slice(1);
            req.flash('success', `${result.rows[0].email} role updated to ${roleDisplay}`);
        }

        res.redirect('/team');
    } catch (error) {
        console.error('Update role error:', error.message);
        req.flash('error', 'Failed to update member role');
        res.redirect('/team');
    }
};
