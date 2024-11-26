import express from 'express';
import { getTeamPage, inviteMember, removeMember, updateRole } from '../controllers/teamController.js';
import { isOwner } from '../middleware/auth.js';
import { isolateTenant } from '../middleware/tenantMiddleware.js';

const router = express.Router();

// All team routes require authentication, tenant isolation, and owner role
router.use(isolateTenant, isOwner);

// GET /team - List team members
router.get('/', getTeamPage);

// POST /team/invite - Invite new member
router.post('/invite', inviteMember);

// POST /team/role/:id - Update member role (promote/demote)
router.post('/role/:id', updateRole);

// POST /team/delete/:id - Remove member
router.post('/delete/:id', removeMember);

export default router;
