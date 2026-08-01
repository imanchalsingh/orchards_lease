import { Router } from 'express';
import * as chat from '../controllers/chat.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();
router.use(requireAuth);

router.get('/conversations', chat.listConversations);
router.post('/conversations', chat.getOrCreateConversation);
router.post('/conversations/:conversationId/messages', chat.sendMessage);
router.patch('/conversations/:conversationId/read', chat.markMessagesAsRead);

export default router;
