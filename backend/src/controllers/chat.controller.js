import Conversation from '../models/Chat.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { ok, created } from '../utils/ApiResponse.js';

export const getOrCreateConversation = asyncHandler(async (req, res) => {
  const { recipientId, orchardId } = req.body;
  const currentUserId = req.user._id;

  if (String(currentUserId) === String(recipientId)) {
    throw ApiError.badRequest('You cannot start a chat with yourself');
  }

  const recipient = await User.findById(recipientId);
  if (!recipient) throw ApiError.notFound('Recipient user not found');

  let conversation = await Conversation.findOne({
    participants: { $all: [currentUserId, recipientId] },
    ...(orchardId ? { orchardId } : {}),
  })
    .populate('participants', 'name email avatar role')
    .populate('orchardId', 'gardenName');

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [currentUserId, recipientId],
      orchardId: orchardId || null,
      messages: [],
    });
    conversation = await conversation.populate('participants', 'name email avatar role');
  }

  return ok(res, conversation, 'Conversation retrieved');
});

export const listConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    participants: req.user._id,
  })
    .populate('participants', 'name email avatar role')
    .populate('orchardId', 'gardenName')
    .sort({ 'lastMessage.updatedAt': -1 });

  return ok(res, conversations, 'User conversations retrieved');
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    throw ApiError.badRequest('Message content cannot be empty');
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw ApiError.notFound('Conversation not found');

  if (!conversation.participants.some((p) => String(p) === String(req.user._id))) {
    throw ApiError.forbidden('You are not a participant in this conversation');
  }

  const newMessage = {
    senderId: req.user._id,
    text: text.trim(),
    isRead: false,
  };

  conversation.messages.push(newMessage);
  conversation.lastMessage = {
    text: text.trim(),
    senderId: req.user._id,
    updatedAt: new Date(),
  };

  await conversation.save();

  const addedMessage = conversation.messages[conversation.messages.length - 1];
  return created(res, addedMessage, 'Message sent successfully');
});

export const markMessagesAsRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw ApiError.notFound('Conversation not found');

  let updatedCount = 0;
  conversation.messages.forEach((msg) => {
    if (String(msg.senderId) !== String(req.user._id) && !msg.isRead) {
      msg.isRead = true;
      msg.readAt = new Date();
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    await conversation.save();
  }

  return ok(res, { updatedCount }, 'Messages marked as read');
});
