import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './auth';

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'busy';
}

interface Message {
  _id: string;
  chat: string;
  sender: User | string;
  content: string;
  createdAt: string;
  status?: 'sending' | 'sent' | 'error';
  clientId?: string;
  readBy?: Array<string | User>;
  attachments?: Attachment[];
}

export interface Attachment {
  _id: string;
  name: string;
  url: string;
  key?: string;
  storage: 's3' | 'local';
  mimeType: string;
  size: number;
  uploadedAt?: string;
  previewUrl?: string;
}

export interface Chat {
  _id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount?: number;
  updatedAt: string;
  status?: 'pending' | 'accepted' | 'rejected';
  initiator?: string; // User ID who started the chat
}

interface ChatState {
  socket: Socket | null;
  isConnected: boolean;
  chats: Chat[];
  activeChat: Chat | null;
  messages: Message[];
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  onlineUsers: string[];

  // Actions
  connect: () => void;
  disconnect: () => void;
  fetchChats: (page?: number, limit?: number) => void;
  joinRoom: (chatIdOrUserId: string, isNew?: boolean) => void; // isNew true if passing userId to start chat
  sendMessage: (content: string, attachments?: Attachment[]) => void;
  acceptChat: (chatId: string) => void;
  leaveRoom: () => void;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  isConnected: false,
  chats: [],
  activeChat: null,
  messages: [],
  isLoadingChats: false,
  isLoadingMessages: false,
  onlineUsers: [],

  connect: () => {
    const { socket } = get();
    if (socket) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const currentUser = useAuthStore.getState().user;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      set({ isConnected: true });
      console.log('Socket connected');
    });

    newSocket.on('disconnect', () => {
      set({ isConnected: false });
      console.log('Socket disconnected');
    });

    newSocket.on('chatListSuccess', (data: { chats: Chat[], total: number }) => {
      set({ chats: data.chats, isLoadingChats: false });
    });

    newSocket.on('chatListFail', (error) => {
      console.error('Chat list failed:', error);
      set({ isLoadingChats: false });
    });

    newSocket.on('joinRoomSuccess', (data: { chat: Chat, messages: Message[] }) => {
      // When opening a chat, reset its unread badge
      const updatedChats = get().chats.map((c) =>
        c._id === data.chat._id ? { ...c, unreadCount: 0 } : c
      );

      set({
        activeChat: data.chat,
        messages: data.messages,
        chats: updatedChats,
        isLoadingMessages: false
      });
    });

    newSocket.on('joinRoomFail', (error) => {
      console.error('Join room failed:', error);
      set({ isLoadingMessages: false, activeChat: null });
    });

    newSocket.on('sendMessageSuccess', (message: Message) => {
      const { messages, chats } = get();

      // Replace optimistic message if present (matched by clientId)
      const clientId = (message as any).clientId as string | undefined;
      const hasOptimistic = clientId ? messages.some((m) => m._id === clientId) : false;

      if (clientId && hasOptimistic) {
        const optimistic = messages.find((m) => m._id === clientId);
        const optimisticAttachments = optimistic?.attachments || [];

        const mergedAttachments = (message.attachments || []).map((a) => {
          const prev = optimisticAttachments.find((p) => p._id === a._id);
          return prev?.previewUrl && !(a as any).previewUrl ? { ...a, previewUrl: prev.previewUrl } : a;
        });

        set({
          messages: messages.map((m) =>
            m._id === clientId ? { ...message, attachments: mergedAttachments, status: 'sent' } : m
          ),
        });
      } else {
        // Deduplicate by DB ID
        const exists = messages.some((m) => m._id === message._id);
        if (!exists) {
          set({ messages: [...messages, { ...message, status: 'sent' }] });
        }
      }

      // Update last message in chat list
      const updatedChats = chats.map(c =>
        c._id === message.chat
          ? { ...c, lastMessage: message, updatedAt: message.createdAt }
          : c
      );
      // Sort by updated at
      updatedChats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      set({ chats: updatedChats });
    });

    newSocket.on('sendMessageFail', (error) => {
      console.error('Send message failed:', error);
      // Handle error state for message
    });

    // Receive message from other users
    newSocket.on('newMessage', (message: Message) => {
      const { activeChat, messages, chats } = get();

      if (activeChat?._id === message.chat) {
        // Deduplicate
        const exists = messages.some(m => m._id === message._id);
        if (!exists) {
          set({ messages: [...messages, message] });
        }

        // If we're viewing this chat, immediately mark as read
        const myId = currentUser?.id;
        const senderId = (message as any).sender?._id || (message as any).sender;
        if (myId && senderId && senderId !== myId) {
          newSocket.emit('markRead', { chatId: message.chat, messageIds: [message._id] });
        }
      }

      // Update chat list
      const updatedChats = chats.map(c =>
        c._id === message.chat
          ? { ...c, lastMessage: message, updatedAt: message.createdAt, unreadCount: (c.unreadCount || 0) + (activeChat?._id === message.chat ? 0 : 1) }
          : c
      );
      updatedChats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      set({ chats: updatedChats });
    });

    newSocket.on(
      'messagesRead',
      (data: { chatId: string; readerId: string; messageIds: string[] }) => {
        const { messages } = get();

        if (!data?.messageIds?.length) return;

        const updated = messages.map((m) => {
          if (!data.messageIds.includes(m._id)) return m;
          const prev = (m.readBy || []) as Array<string | User>;
          const ids = prev.map((x) => (typeof x === 'string' ? x : x._id));
          if (ids.includes(data.readerId)) return m;
          return { ...m, readBy: [...prev, data.readerId] };
        });

        set({ messages: updated });
      }
    );

    newSocket.on('chatAccepted', (chat: Chat) => {
      const { activeChat, chats } = get();

      // Update active chat if it matches
      if (activeChat?._id === chat._id) {
        set({ activeChat: chat });
      }

      // Update chat in list
      const updatedChats = chats.map(c => c._id === chat._id ? chat : c);
      set({ chats: updatedChats });
    });

    newSocket.on('chatListUpdate', () => {
      get().fetchChats();
    });

    set({ socket: newSocket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  fetchChats: (page = 1, limit = 20) => {
    const { socket } = get();
    if (!socket) return;

    set({ isLoadingChats: true });
    socket.emit('chatList', { page, limit });
  },

  joinRoom: (chatIdOrUserId: string, isNew = false) => {
    const { socket } = get();
    if (!socket) return;

    set({ isLoadingMessages: true, activeChat: null, messages: [] });

    // If starting a new chat with a user, we might send { targetUserId: ... }
    // If joining existing, { chatId: ... }
    // The prompt says "joinRoom" sends history.
    // I'll assume the payload distinguishes or the backend handles it.
    // For now, I'll send specific payload based on isNew

    const payload = isNew ? { targetUserId: chatIdOrUserId } : { chatId: chatIdOrUserId };
    socket.emit('joinRoom', payload);
  },

  sendMessage: (content: string, attachments: Attachment[] = []) => {
    const { socket, activeChat } = get();
    if (!socket || !activeChat) return;

    const currentUser = useAuthStore.getState().user;
    const clientId = `client:${Date.now()}:${Math.random().toString(16).slice(2)}`;

    // Optimistic message (shows immediately with "sending" state)
    if (currentUser) {
      const optimistic: Message = {
        _id: clientId,
        clientId,
        chat: activeChat._id,
        sender: {
          _id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          avatar: currentUser.avatar,
          status: currentUser.status,
        },
        content,
        createdAt: new Date().toISOString(),
        status: 'sending',
        readBy: [currentUser.id],
        attachments,
      };

      set({ messages: [...get().messages, optimistic] });
    }

    socket.emit('sendMessage', {
      chatId: activeChat._id,
      content,
      clientId,
      attachments: attachments.map((a) => ({
        _id: a._id,
        name: a.name,
        url: a.url,
        key: a.key,
        storage: a.storage,
        mimeType: a.mimeType,
        size: a.size,
        uploadedAt: a.uploadedAt,
      })),
    });
  },

  acceptChat: (chatId: string) => {
    const { socket } = get();
    if (!socket) return;

    socket.emit('acceptChat', { chatId });
  },

  leaveRoom: () => {
    set({ activeChat: null, messages: [] });
  }
}));
