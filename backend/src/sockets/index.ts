import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { SERVER, AWS_S3_CONFIG } from '../config/config';
import { User, Chat, Message } from '../models';

const isS3Enabled =
  !!AWS_S3_CONFIG.AWS_BUCKET_NAME &&
  !!AWS_S3_CONFIG.AWS_REGION &&
  !!AWS_S3_CONFIG.AWS_ACCESS_KEY &&
  !!AWS_S3_CONFIG.AWS_SECRET_KEY;

const s3 = isS3Enabled
  ? new S3Client({
      region: AWS_S3_CONFIG.AWS_REGION,
      credentials: {
        accessKeyId: AWS_S3_CONFIG.AWS_ACCESS_KEY,
        secretAccessKey: AWS_S3_CONFIG.AWS_SECRET_KEY,
      },
    })
  : null;

// Track online users: Map<userId, Set<socketId>>
const onlineUsers = new Map<string, Set<string>>();

// Track typing status: Map<chatId, Set<userId>>
const typingUsers = new Map<string, Set<string>>();

// Typing timeout handles: Map<`${chatId}:${userId}`, NodeJS.Timeout>
const typingTimeouts = new Map<string, NodeJS.Timeout>();

const TYPING_TIMEOUT_MS = 4000;

async function attachPreviewUrls(message: any) {
  if (!message?.attachments?.length) return message;
  const attachments = await Promise.all(
    message.attachments.map(async (a: any) => {
      if (a?.storage === 's3' && s3 && isS3Enabled) {
        const key = a.key || a.url;
        const previewUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: AWS_S3_CONFIG.AWS_BUCKET_NAME,
            Key: key,
          }),
          { expiresIn: 60 * 10 }
        );
        return { ...a, previewUrl };
      }
      return a;
    })
  );
  return { ...message, attachments };
}

interface AuthSocket extends Socket {
  data: Socket['data'] & { user?: any };
}

export const initSockets = (io: Server) => {
  // Authentication Middleware
  io.use(async (socket: AuthSocket, next) => {
    try {
      const { token } = socket.handshake.auth;

      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = jwt.verify(token, SERVER.JWT_SECRET) as { id: string };
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // eslint-disable-next-line no-param-reassign
      socket.data.user = user;
      return next();
    } catch {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthSocket) => {
    const authedUser = socket.data.user;
    const userId = authedUser?._id?.toString();
    console.log(
      `User connected: ${authedUser?.name ?? 'Unknown'} (${socket.id})`
    );

    // Join a personal room for notifications
    if (userId) {
      socket.join(`user:${userId}`);

      // Track online status
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId)!.add(socket.id);

      // Broadcast user came online (only if first socket)
      if (onlineUsers.get(userId)!.size === 1) {
        io.emit('userOnline', { userId });
      }

      // Send current online users list to the newly connected socket
      const onlineList = Array.from(onlineUsers.keys());
      socket.emit('onlineUsers', { users: onlineList });
    }

    socket.on('chatList', async ({ page = 1, limit = 20 }) => {
      try {
        if (!authedUser?._id) return;
        const skip = (page - 1) * limit;

        const chats = await Chat.find({
          participants: authedUser._id,
        })
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('participants', 'name email avatar status')
          .populate({
            path: 'lastMessage',
            populate: { path: 'sender', select: 'name' },
          });

        const total = await Chat.countDocuments({
          participants: authedUser._id,
        });

        socket.emit('chatListSuccess', { chats, total });
      } catch {
        socket.emit('chatListFail', { message: 'Failed to fetch chats' });
      }
    });

    socket.on(
      'joinRoom',
      async (data: { chatId?: string; targetUserId?: string }) => {
        try {
          if (!authedUser?._id) return;
          let chat;
          let isNew = false;

          if (data.chatId) {
            chat = await Chat.findOne({
              _id: data.chatId,
              participants: authedUser._id,
            }).populate('participants', 'name email avatar status');
          } else if (data.targetUserId) {
            // Check for existing chat
            chat = await Chat.findOne({
              participants: { $all: [authedUser._id, data.targetUserId] },
            }).populate('participants', 'name email avatar status');

            if (!chat) {
              // Create pending chat
              chat = await Chat.create({
                participants: [authedUser._id, data.targetUserId],
                initiator: authedUser._id,
                status: 'pending',
              });
              await chat.populate('participants', 'name email avatar status');
              isNew = true;
            }
          }

          if (!chat) {
            socket.emit('joinRoomFail', { message: 'Chat not found' });
            return;
          }

          // Check for 72h rule if pending and re-requesting?
          // Logic: "Alice can send message again after 72 hours and previous chatroom will be deleted"
          // This likely means if the chat is rejected or expired.
          // For now, if it's pending and older than 72h, we might reset it?
          // Or if it exists and is pending, just return it.

          const roomId = `chat:${chat._id.toString()}`;
          socket.join(roomId);

          // Mark messages as read for this user (all messages not sent by them)
          const unread = await Message.find({
            chat: chat._id,
            sender: { $ne: authedUser._id },
            readBy: { $ne: authedUser._id },
          }).select('_id');

          if (unread.length > 0) {
            await Message.updateMany(
              { _id: { $in: unread.map(m => m._id) } },
              { $addToSet: { readBy: authedUser._id } }
            );

            const payload = {
              chatId: chat._id.toString(),
              readerId: authedUser._id.toString(),
              messageIds: unread.map(m => m._id.toString()),
            };

            // Notify anyone currently viewing the room
            io.to(roomId).emit('messagesRead', payload);

            // Also notify other participant(s) via their personal rooms,
            // so the sender updates even if not inside the chat room.
            chat.participants.forEach((pId: any) => {
              const id = pId.toString();
              if (id !== payload.readerId) {
                io.to(`user:${id}`).emit('messagesRead', payload);
              }
            });
          }

          // Fetch messages
          const rawMessages = await Message.find({ chat: chat._id })
            .sort({ createdAt: 1 })
            .populate('sender', 'name email avatar');

          const messages = await Promise.all(
            rawMessages.map(m => attachPreviewUrls(m.toObject()))
          );

          socket.emit('joinRoomSuccess', { chat, messages });

          if (isNew) {
            // Notify other user about new chat request if online
            // We can emit to `user:${targetUserId}`
            io.to(`user:${data.targetUserId}`).emit('chatListUpdate'); // Simplified
          }
        } catch (error) {
          console.error(error);
          socket.emit('joinRoomFail', { message: 'Failed to join room' });
        }
      }
    );

    socket.on('acceptChat', async (data: { chatId: string }) => {
      try {
        if (!authedUser?._id) return;
        const chat = await Chat.findOne({
          _id: data.chatId,
          participants: authedUser._id,
        });

        if (!chat) return;

        if (chat.status === 'pending') {
          // Check if user is the receiver (not the initiator)
          if (chat.initiator.toString() !== authedUser._id.toString()) {
            chat.status = 'accepted';
            await chat.save();
            await chat.populate('participants', 'name email avatar status');

            // Notify all participants in the chat room that it's accepted
            const roomId = `chat:${chat._id.toString()}`;
            io.to(roomId).emit('chatAccepted', chat);
          }
        }
      } catch (error) {
        console.error('Accept chat error:', error);
      }
    });

    socket.on(
      'sendMessage',
      async (data: {
        chatId: string;
        content?: string;
        attachments?: any[];
        clientId?: string;
      }) => {
        try {
          if (!authedUser?._id) return;
          const chat = await Chat.findOne({
            _id: data.chatId,
            participants: authedUser._id,
          });

          if (!chat) {
            socket.emit('sendMessageFail', {
              message: 'Chat not found',
            });
            return;
          }

          const content = (data.content || '').toString();
          const attachments = Array.isArray(data.attachments)
            ? data.attachments
            : [];
          if (!content.trim() && attachments.length === 0) {
            socket.emit('sendMessageFail', {
              message: 'Message is empty',
            });
            return;
          }

          // Logic: "if Bob accepts the chat then he can continue the chat"
          // If status is pending, only initiator can send message? Or receiver can send to accept?
          // If receiver sends message, we auto-accept?
          if (chat.status === 'pending') {
            if (chat.initiator.toString() !== authedUser._id.toString()) {
              // Receiver replied -> Accept chat
              chat.status = 'accepted';
              await chat.save();
            } else {
              // Initiator sending more messages?
              // "Alice can send message again after 72 hours" implies she might be blocked until then.
              // But typically she sends the *first* message.
              // Let's allow her to send messages while pending (e.g. initial request).
            }
          }

          const message = await Message.create({
            chat: chat._id,
            sender: authedUser._id,
            content,
            attachments,
          });

          await message.populate('sender', 'name email avatar');
          const messageWithPreviews = await attachPreviewUrls(
            message.toObject()
          );

          chat.lastMessage = message._id as any;
          chat.updatedAt = new Date();
          await chat.save();

          const roomId = `chat:${chat._id.toString()}`;

          // Broadcast to everyone in room (including sender for optimistic/confirmation)
          // Or better: emit 'sendMessageSuccess' to sender, 'newMessage' to others.
          // But simpler to just emit 'newMessage' to room and sender handles it via store logic (check if ID exists).
          // Or follow prompt: 'sendMessageSuccess'

          const messageForSender = {
            ...(messageWithPreviews as any),
            clientId: data.clientId,
          };

          socket.emit('sendMessageSuccess', messageForSender);
          socket.to(roomId).emit('newMessage', messageWithPreviews);

          // Also emit to participants' personal rooms to update chat lists if they aren't in the room
          chat.participants.forEach(pId => {
            if (pId.toString() !== authedUser._id.toString()) {
              io.to(`user:${pId.toString()}`).emit(
                'newMessage',
                messageWithPreviews
              );
            }
          });
        } catch (error) {
          console.error(error);
          socket.emit('sendMessageFail', { message: 'Failed to send message' });
        }
      }
    );

    socket.on(
      'markRead',
      async (data: { chatId: string; messageIds: string[] }) => {
        try {
          if (!authedUser?._id) return;
          const chat = await Chat.findOne({
            _id: data.chatId,
            participants: authedUser._id,
          });

          if (!chat) return;

          const roomId = `chat:${chat._id.toString()}`;

          const ids = (data.messageIds || []).filter(Boolean);
          if (ids.length === 0) return;

          const unread = await Message.find({
            _id: { $in: ids },
            chat: chat._id,
            sender: { $ne: authedUser._id },
            readBy: { $ne: authedUser._id },
          }).select('_id');

          if (unread.length === 0) return;

          await Message.updateMany(
            { _id: { $in: unread.map(m => m._id) } },
            { $addToSet: { readBy: authedUser._id } }
          );

          const payload = {
            chatId: chat._id.toString(),
            readerId: authedUser._id.toString(),
            messageIds: unread.map(m => m._id.toString()),
          };

          io.to(roomId).emit('messagesRead', payload);
          chat.participants.forEach((pId: any) => {
            const id = pId.toString();
            if (id !== payload.readerId) {
              io.to(`user:${id}`).emit('messagesRead', payload);
            }
          });
        } catch (error) {
          console.error('markRead error:', error);
        }
      }
    );

    // Typing indicator events
    socket.on('typing', (data: { chatId: string }) => {
      if (!userId || !data.chatId) return;

      const roomId = `chat:${data.chatId}`;
      const timeoutKey = `${data.chatId}:${userId}`;

      // Add to typing set
      if (!typingUsers.has(data.chatId)) {
        typingUsers.set(data.chatId, new Set());
      }
      typingUsers.get(data.chatId)!.add(userId);

      // Broadcast to room (except sender)
      socket.to(roomId).emit('userTyping', {
        chatId: data.chatId,
        userId,
        userName: authedUser?.name,
      });

      // Clear existing timeout
      const existingTimeout = typingTimeouts.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Auto stop typing after timeout
      typingTimeouts.set(
        timeoutKey,
        setTimeout(() => {
          typingUsers.get(data.chatId)?.delete(userId);
          socket.to(roomId).emit('userStoppedTyping', {
            chatId: data.chatId,
            userId,
          });
          typingTimeouts.delete(timeoutKey);
        }, TYPING_TIMEOUT_MS)
      );
    });

    socket.on('stopTyping', (data: { chatId: string }) => {
      if (!userId || !data.chatId) return;

      const roomId = `chat:${data.chatId}`;
      const timeoutKey = `${data.chatId}:${userId}`;

      // Remove from typing set
      typingUsers.get(data.chatId)?.delete(userId);

      // Clear timeout
      const existingTimeout = typingTimeouts.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        typingTimeouts.delete(timeoutKey);
      }

      // Broadcast to room
      socket.to(roomId).emit('userStoppedTyping', {
        chatId: data.chatId,
        userId,
      });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected');

      // Handle offline status
      if (userId) {
        const userSockets = onlineUsers.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);

          // If no more sockets, user is offline
          if (userSockets.size === 0) {
            onlineUsers.delete(userId);
            io.emit('userOffline', { userId });

            // Clean up any typing states for this user
            typingUsers.forEach((users, chatId) => {
              if (users.has(userId)) {
                users.delete(userId);
                io.to(`chat:${chatId}`).emit('userStoppedTyping', {
                  chatId,
                  userId,
                });
              }
            });
          }
        }
      }
    });
  });
};
