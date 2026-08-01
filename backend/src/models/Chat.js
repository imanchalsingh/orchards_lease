import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    orchardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Orchard',
    },
    messages: [messageSchema],
    lastMessage: {
      text: String,
      senderId: mongoose.Schema.Types.ObjectId,
      updatedAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ 'lastMessage.updatedAt': -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
