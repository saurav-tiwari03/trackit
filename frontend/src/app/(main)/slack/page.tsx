'use client';

import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { useSidebar } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Hash,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Phone,
  Search,
  Send,
  Smile,
  Video,
  Menu,
  ArrowLeft,
  Edit,
  UserPlus,
  Info,
  X,
  Check,
  CheckCheck,
  Clock,
  Mic,
  Square,
  Plus,
  Play,
  FileText,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/store/chat';
import { useAuthStore } from '@/store/auth';
import { useProjectsStore } from '@/store/projects';
import { chatsAPI, usersAPI } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateTaskModal } from '@/components/task/create-task-modal';
import { format } from 'date-fns';
import type { Attachment } from '@/store/chat';

const apiOrigin =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');

const resolveAttachmentUrl = (a: any) => {
  const candidate = a?.previewUrl || a?.url;
  if (!candidate) return '';
  if (candidate.startsWith('http://') || candidate.startsWith('https://')) return candidate;
  if (candidate.startsWith(apiOrigin)) return candidate;
  if (candidate.startsWith('/')) return `${apiOrigin}${candidate}`;
  return `${apiOrigin}/${candidate}`;
};

// WhatsApp-style typing indicator with bouncing dots
const TypingIndicator = ({ userName }: { userName?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 5, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex items-start gap-3 max-w-[85%]"
    >
      <Avatar className="h-8 w-8 mt-1">
        <AvatarFallback>{userName?.substring(0, 2).toUpperCase() || '?'}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col items-start">
        <div className="flex items-baseline gap-2 mb-1 px-1">
          <span className="text-xs font-semibold">{userName || 'User'}</span>
        </div>
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="bg-muted rounded-2xl rounded-tl-none px-4 py-3 shadow-sm"
        >
          <div className="flex items-center gap-1.5">
            <motion.span
              className="w-2 h-2 bg-muted-foreground/50 rounded-full"
              animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0 }}
            />
            <motion.span
              className="w-2 h-2 bg-muted-foreground/50 rounded-full"
              animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
            />
            <motion.span
              className="w-2 h-2 bg-muted-foreground/50 rounded-full"
              animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

const MinimalVideoPlayer = ({ src, className }: { src: string; className?: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    setHasStarted(false);
    setIsPlaying(false);
  }, [src]);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.play();
      setHasStarted(true);
    }
  };

  return (
    <div className={cn("relative group cursor-pointer overflow-hidden bg-black", className)}>
      <video
        ref={videoRef}
        src={src}
        className={cn("h-full w-full", hasStarted ? "object-contain" : "object-cover")}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        playsInline
        controls={hasStarted}
      />
      {!hasStarted && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors z-10"
          onClick={handlePlayClick}
        >
          <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm transition-transform group-hover:scale-110">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>
      )}
    </div>
  );
};

export default function SlackPage() {
  const { setOpen, isMobile } = useSidebar();
  const { user: currentUser } = useAuthStore();
  const { projects } = useProjectsStore();
  const {
    connect,
    disconnect,
    fetchChats,
    chats,
    activeChat,
    messages,
    joinRoom,
    sendMessage,
    leaveRoom,
    acceptChat,
    isLoadingChats,
    isLoadingMessages,
    onlineUsers,
    typingUsers,
    startTyping,
    stopTyping,
  } = useChatStore();

  const [newMessage, setNewMessage] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(true);
  const [mobileUserInfoOpen, setMobileUserInfoOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [previewAttachment, setPreviewAttachment] = useState<{ url: string; type: 'image' | 'video' | 'pdf'; name?: string } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const [pdfNumPages, setPdfNumPages] = useState(0);
  const [pdfCurrentPage, setPdfCurrentPage] = useState(1);
  const [pdfPageWidth, setPdfPageWidth] = useState(0);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (previewAttachment) {
      setPdfCurrentPage(1);
    }
  }, [previewAttachment]);

  const updatePdfWidth = () => {
    const el = pdfContainerRef.current;
    if (!el) return;
    const next = Math.max(280, Math.min(1100, el.clientWidth - 24));
    setPdfPageWidth(next);
  };

  useLayoutEffect(() => {
    const isPdf = previewAttachment?.type === 'pdf';
    if (!isPdf || !previewAttachment) return;

    let ro: ResizeObserver | null = null;
    let raf = 0;

    const attach = () => {
      const el = pdfContainerRef.current;
      if (!el) {
        raf = requestAnimationFrame(attach);
        return;
      }
      updatePdfWidth();
      ro = new ResizeObserver(() => updatePdfWidth());
      ro.observe(el);
    };

    attach();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [previewAttachment]);


  const filteredMessages = useMemo(() => {
    if (!messageSearchQuery.trim()) return messages;
    const q = messageSearchQuery.toLowerCase();
    return messages.filter((m) =>
      (m.content && m.content.toLowerCase().includes(q)) ||
      (m.sender && typeof m.sender === 'object' && m.sender.name.toLowerCase().includes(q))
    );
  }, [messages, messageSearchQuery]);

  const sharedMedia = useMemo(() => {
    const media: Attachment[] = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if ((msg as any).attachments && Array.isArray((msg as any).attachments)) {
        (msg as any).attachments.forEach((att: any) => {
          if (att.mimeType?.startsWith('image/') || att.mimeType?.startsWith('video/')) {
            media.push(att);
          }
        });
      }
      if (media.length >= 9) break;
    }
    return media;
  }, [messages]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });

        // Upload the audio file
        if (!activeChat) return;
        setIsUploadingAttachments(true);
        try {
          const res = await chatsAPI.uploadAttachments(activeChat._id, [file]);
          const uploaded = (res.data?.data || []) as Attachment[];
          setPendingAttachments((prev) => [...prev, ...uploaded]);
        } catch (error) {
          console.error('Failed to upload audio:', error);
        } finally {
          setIsUploadingAttachments(false);
        }

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };


  // Connect socket and fetch chats on mount
  useEffect(() => {
    setOpen(false);
    connect();
    fetchChats();

    return () => {
      // Clean up typing state on unmount
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
      disconnect();
    };
  }, [setOpen, connect, disconnect, fetchChats]);

  // WhatsApp-like behavior: keep view pinned to the latest message
  useEffect(() => {
    if (isLoadingMessages) return;

    // Use a small timeout to allow layout to settle, including images
    const timeoutId = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [activeChat?._id, messages.length, isLoadingMessages]);

  // Search users
  useEffect(() => {
    const searchUsers = async () => {
      if (!userSearchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await usersAPI.search(userSearchQuery);
        setSearchResults(response.data.data || []);
      } catch (error) {
        console.error('Failed to search users:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [userSearchQuery]);

  const handleTyping = () => {
    // Send typing event immediately
    startTyping();

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      
      // Keep sending typing events every 2 seconds while user is typing
      typingIntervalRef.current = setInterval(() => {
        startTyping();
      }, 2000);
    }

    // Clear existing stop timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing after 2.5 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      stopTyping();
    }, 2500);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() && pendingAttachments.length === 0) return;

    // Clear typing state
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      stopTyping();
    }

    sendMessage(newMessage, pendingAttachments);
    setNewMessage('');
    setPendingAttachments([]);
  };

  const handlePickFiles = () => {
    if (!activeChat) return;
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // reset input so selecting same file again works
    e.target.value = '';
    if (!activeChat || files.length === 0) return;

    setIsUploadingAttachments(true);
    try {
      const res = await chatsAPI.uploadAttachments(activeChat._id, files);
      const uploaded = (res.data?.data || []) as Attachment[];
      setPendingAttachments((prev) => [...prev, ...uploaded]);
    } catch (error) {
      console.error('Failed to upload attachments:', error);
    } finally {
      setIsUploadingAttachments(false);
    }
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a._id !== id));
  };


  const handleStartChat = (userId: string) => {
    joinRoom(userId, true);
    setIsNewChatOpen(false);
    setUserSearchQuery('');
  };

  const getOtherParticipant = (chat: any) => {
    return chat.participants.find((p: any) => p._id !== currentUser?.id) || chat.participants[0];
  };

  const otherParticipant = activeChat ? getOtherParticipant(activeChat) : null;
  const isPending = activeChat?.status === 'pending';
  const isIncomingRequest = isPending && activeChat?.initiator !== currentUser?.id;

  const collaborators = useMemo(() => {
    const uniqueUsers = new Map();
    projects.forEach((p) => {
      // Add owner
      if (p.owner && typeof p.owner === 'object' && (p.owner as any)._id !== currentUser?.id) {
        uniqueUsers.set((p.owner as any)._id, p.owner);
      }
      // Add members
      if (Array.isArray(p.members)) {
        p.members.forEach((m: any) => {
          if (m && typeof m === 'object' && m._id !== currentUser?.id) {
            uniqueUsers.set(m._id, m);
          }
        });
      }
    });
    return Array.from(uniqueUsers.values());
  }, [projects, currentUser?.id]);

  const renderUserDetailsPanel = () => (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="h-14 border-b border-border flex items-center px-4 font-semibold shrink-0">
        Details
      </div>
      <div className="p-6 flex flex-col items-center text-center shrink-0">
        <div className="relative mb-4">
          <Avatar className="h-24 w-24">
            <AvatarFallback className="text-2xl">
              {otherParticipant?.name?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {otherParticipant?._id && onlineUsers.includes(otherParticipant._id) && (
            <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-green-500 border-3 border-sidebar" />
          )}
        </div>
        <h2 className="text-xl font-semibold">{otherParticipant?.name}</h2>
        <p className="text-sm text-muted-foreground">{otherParticipant?.email}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={cn(
            "h-2 w-2 rounded-full",
            otherParticipant?._id && onlineUsers.includes(otherParticipant._id) ? "bg-green-500" : "bg-gray-400"
          )} />
          <span className="text-xs text-muted-foreground">
            {otherParticipant?._id && onlineUsers.includes(otherParticipant._id) ? "Online" : "Offline"}
          </span>
        </div>

        <div className="flex gap-3 mt-6 w-full">
          <Button variant="outline" className="flex-1 gap-2">
            <UserPlus className="h-4 w-4" /> Profile
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => {
              setIsMessageSearchOpen(true);
              if (isMobile) setMobileUserInfoOpen(false);
            }}
          >
            <Search className="h-4 w-4" /> Search
          </Button>
        </div>
      </div>

      <Separator />

      <div className="p-4 flex-1 overflow-y-auto">
        <div>
          <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wider text-[10px]">
            Shared Media
          </h3>
          {sharedMedia.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {sharedMedia.map((att: any) => {
                const url = resolveAttachmentUrl(att);
                const isVideo = att.mimeType?.startsWith('video/');
                return (
                  <div
                    key={att._id}
                    className="aspect-square bg-muted rounded-md overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative border border-border/20 group"
                    onClick={() =>
                      setPreviewAttachment({
                        url,
                        type: isVideo ? 'video' : 'image',
                        name: att.name,
                      })
                    }
                  >
                    {isVideo ? (
                      <video
                        src={url}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={url}
                        alt={att.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10">
                        <Play className="h-6 w-6 text-white fill-white opacity-80" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-2">
                <ImageIcon className="h-6 w-6 opacity-50" />
              </div>
              <p className="text-xs">No shared media</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderChatListPanel = () => (
    <div className="flex flex-col h-full">
      <div className="flex h-14 items-center justify-between px-4 border-b border-border">
        <h1 className="font-semibold text-lg truncate">Messages</h1>
        <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Edit className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Search users..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="mb-4"
              />
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {isSearching ? (
                  <p className="text-center text-sm text-muted-foreground">Searching...</p>
                ) : searchResults.length > 0 ? (
                  searchResults.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                      onClick={() => handleStartChat(user._id)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {user.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : userSearchQuery ? (
                  <p className="text-center text-sm text-muted-foreground">No users found.</p>
                ) : (
                  <>
                    <p className="px-2 pb-2 text-xs font-medium text-muted-foreground uppercase">Suggested</p>
                    {collaborators.map((user) => (
                      <div
                        key={user._id}
                        className="flex items-center justify-between p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                        onClick={() => handleStartChat(user._id)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {user.name?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {collaborators.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground">No recent collaborators found.</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {chats.map((chat) => {
            const other = getOtherParticipant(chat);
            const isActive = activeChat?._id === chat._id;

            return (
              <div
                key={chat._id}
                onClick={() => joinRoom(chat._id, false)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                  isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                )}
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{other?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {other?._id && onlineUsers.includes(other._id) && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-sidebar" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium truncate">{other?.name}</span>
                    {chat.updatedAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(chat.updatedAt), 'HH:mm')}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate h-4 overflow-hidden">
                    <AnimatePresence mode="wait">
                      {typingUsers[chat._id] ? (
                        <motion.span
                          key={`typing-${chat._id}`}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="text-green-600 font-medium block"
                        >
                          typing...
                        </motion.span>
                      ) : (
                        <motion.span
                          key={`msg-${chat._id}`}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="block"
                        >
                          {chat.lastMessage?.content || 'Start a conversation'}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                {chat.unreadCount ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {chat.unreadCount}
                  </span>
                ) : null}
              </div>
            );
          })}

          {chats.length === 0 && !isLoadingChats && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No chats yet. Start a new conversation!
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-(--spacing(14)))] overflow-hidden bg-background text-foreground lg:h-screen lg:pt-0">
      {/* Chat List Sidebar */}
      <div className="w-80 shrink-0 border-r border-border bg-sidebar hidden md:flex flex-col">
        {renderChatListPanel()}
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col min-w-0 bg-background">
        {/* Mobile chat list (WhatsApp-style) */}
        {!activeChat && (
          <div className="md:hidden flex-1">
            {renderChatListPanel()}
          </div>
        )}

        {activeChat ? (
          <>
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b border-border px-4 shrink-0">
              {isMessageSearchOpen ? (
                <div className="flex items-center w-full gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={messageSearchQuery}
                    onChange={(e) => setMessageSearchQuery(e.target.value)}
                    placeholder="Search in conversation..."
                    className="flex-1 border-none shadow-none focus-visible:ring-0 bg-transparent h-9"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setIsMessageSearchOpen(false);
                      setMessageSearchQuery('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    {/* WhatsApp-style back button on mobile */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden"
                      onClick={() => leaveRoom()}
                      aria-label="Back to chats"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{otherParticipant?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {otherParticipant?._id && onlineUsers.includes(otherParticipant._id) && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                      )}
                    </div>
                    <div>
                      <h2 className="font-semibold text-sm">{otherParticipant?.name}</h2>
                      <AnimatePresence mode="wait">
                        {activeChat && typingUsers[activeChat._id] ? (
                          <motion.span
                            key="typing"
                            initial={{ opacity: 0, y: -2 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 2 }}
                            transition={{ duration: 0.15 }}
                            className="text-xs text-green-600 font-medium block"
                          >
                            typing...
                          </motion.span>
                        ) : otherParticipant?._id && onlineUsers.includes(otherParticipant._id) ? (
                          <motion.span
                            key="online"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="text-xs text-green-600 block"
                          >
                            Online
                          </motion.span>
                        ) : (
                          <motion.span
                            key="offline"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="text-xs text-muted-foreground block"
                          >
                            Offline
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (isMobile) setMobileUserInfoOpen(true);
                        else setShowUserInfo(!showUserInfo);
                      }}
                      className={cn(!isMobile && showUserInfo && "bg-muted")}
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsCreateTaskOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
                <div className="min-h-full flex flex-col justify-end gap-4">
                  {filteredMessages.map((msg) => {
                    const senderId = typeof msg.sender === 'object' ? msg.sender?._id : msg.sender; // Handle sender as object or ID
                    const isMe = senderId === currentUser?.id;
                    const readByIds = ((msg as any).readBy || []).map((x: any) =>
                      typeof x === 'string' ? x : x?._id
                    );
                    const isRead =
                      isMe && otherParticipant?._id ? readByIds.includes(otherParticipant._id) : false;
                    return (
                      <div
                        key={msg._id || (msg as any).id} // Fallback for optimistic
                        className={cn(
                          "flex items-start gap-3 max-w-[85%]",
                          isMe ? "ml-auto flex-row-reverse" : ""
                        )}
                      >
                        {!isMe && (
                          <Avatar className="h-8 w-8 mt-1">
                            <AvatarFallback>{typeof msg.sender === 'object' ? msg.sender.name?.substring(0, 2).toUpperCase() : '?'}</AvatarFallback>
                          </Avatar>
                        )}

                        <div className={cn(
                          "flex flex-col",
                          isMe ? "items-end" : "items-start"
                        )}>
                          <div className="flex items-baseline gap-2 mb-1 px-1">
                            <span className="text-xs font-semibold">
                              {typeof msg.sender === 'object' ? msg.sender.name : 'User'}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              {format(new Date(msg.createdAt || Date.now()), 'HH:mm')}
                              {isMe ? (
                                (msg as any).status === 'sending' ? (
                                  <Clock className="h-3 w-3 opacity-80" />
                                ) : isRead ? (
                                  <CheckCheck className="h-3 w-3 opacity-80" />
                                ) : (
                                  <Check className="h-3 w-3 opacity-80" />
                                )
                              ) : null}
                            </span>
                          </div>
                          <div className={cn(
                            "rounded-2xl px-4 py-2 text-sm shadow-sm",
                            isMe
                              ? "bg-primary text-primary-foreground rounded-tr-none"
                              : "bg-muted text-foreground rounded-tl-none"
                          )}>
                            {msg.content}
                            {Array.isArray((msg as any).attachments) && (msg as any).attachments.length > 0 && (
                              <div className={cn("mt-2 grid gap-2", isMe ? "justify-items-end" : "")}>
                                {(msg as any).attachments.map((a: any) => {
                                  const url = resolveAttachmentUrl(a);
                                  const isImage = (a?.mimeType || '').startsWith('image/');
                                  const isVideo = (a?.mimeType || '').startsWith('video/');
                                  const isPdf = (a?.mimeType || '') === 'application/pdf';
                                  const isAudio = (a?.mimeType || '').startsWith('audio/');

                                  if (isImage && url) {
                                    return (
                                      <div
                                        key={a._id}
                                        className="block max-w-[240px] cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => setPreviewAttachment({ url, type: 'image', name: a.name })}
                                      >
                                        <img
                                          src={url}
                                          alt={a.name}
                                          className="rounded-lg border border-border/40 max-h-48 w-auto object-cover"
                                        />
                                      </div>
                                    );
                                  }

                                  if (isVideo && url) {
                                    return (
                                      <MinimalVideoPlayer
                                        key={a._id}
                                        src={url}
                                        className="rounded-lg border border-border/40 max-h-56 max-w-[260px]"
                                      />
                                    );
                                  }

                                  if (isAudio && url) {
                                    return (
                                      <audio
                                        key={a._id}
                                        src={url}
                                        controls
                                        className="w-[260px] max-w-full"
                                      />
                                    );
                                  }

                                  if (isPdf && url) {
                                    return (
                                      <div
                                        key={a._id}
                                        className="relative w-[280px] max-w-full rounded-xl overflow-hidden cursor-pointer hover:opacity-95 transition-opacity border border-border/10 shadow-sm"
                                        onClick={() => setPreviewAttachment({ url, type: 'pdf', name: a.name })}
                                      >
                                        {/* Preview Area (Top) */}
                                        <div className="h-32 bg-white relative overflow-hidden">
                                          <Document
                                            file={url}
                                            loading={<div className="w-full h-full bg-gray-100 animate-pulse" />}
                                            error={
                                              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                                <FileText className="h-10 w-10 text-gray-300" />
                                              </div>
                                            }
                                            className="flex justify-center"
                                          >
                                            <Page
                                              pageNumber={1}
                                              width={280}
                                              renderTextLayer={false}
                                              renderAnnotationLayer={false}
                                            />
                                          </Document>
                                        </div>

                                        {/* Info Bar (Bottom) */}
                                        <div className="bg-[#1f2937] p-3 flex items-center gap-3">
                                          <div className="h-10 w-10 shrink-0 flex items-center justify-center bg-red-500/20 rounded-lg">
                                            <FileText className="h-6 w-6 text-red-500 fill-red-500/20" strokeWidth={1.5} />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-white/90 text-sm font-medium truncate leading-tight">
                                              {a.name || 'Document.pdf'}
                                            </p>
                                            <p className="text-white/50 text-[10px] mt-1 font-medium uppercase tracking-wide">
                                              {a.size ? `${(Math.round(a.size / 1024))} KB` : ''} • PDF
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div
                                      key={a._id}
                                      className={cn(
                                        "inline-flex items-center gap-2 rounded-lg border border-border/40 px-3 py-2 text-xs",
                                        isMe ? "bg-background/10" : "bg-background"
                                      )}
                                    >
                                      <Paperclip className="h-3 w-3 opacity-80" />
                                      <span className="max-w-[180px] truncate">{a.name || (isPdf ? 'PDF' : 'File')}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {isIncomingRequest && (
                    <div className="flex flex-col items-center justify-center p-6 my-4 bg-muted/30 rounded-lg border border-border">
                      <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                      <h3 className="font-semibold mb-1">Message Request</h3>
                      <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
                        {otherParticipant?.name} wants to send you a message.
                        Accepting will allow them to send more messages.
                      </p>
                      <div className="flex gap-3">
                        <Button variant="outline" className="gap-2 text-destructive hover:text-destructive">
                          <X className="h-4 w-4" /> Reject
                        </Button>
                        <Button className="gap-2" onClick={() => acceptChat(activeChat!._id)}>
                          <Check className="h-4 w-4" /> Accept
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Typing Indicator */}
                  <AnimatePresence mode="wait">
                    {activeChat && typingUsers[activeChat._id] && (
                      <TypingIndicator key="typing-indicator" userName={typingUsers[activeChat._id].userName} />
                    )}
                  </AnimatePresence>

                  {/* Scroll anchor to keep latest message visible */}
                  <div ref={bottomRef} />
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border bg-background">
              <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,application/pdf,video/*,audio/*"
                    className="hidden"
                    onChange={handleFilesSelected}
                  />

                  {pendingAttachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {pendingAttachments.map((a) => {
                        const url = resolveAttachmentUrl(a);
                        const isImage = (a.mimeType || '').startsWith('image/');
                        const isVideo = (a.mimeType || '').startsWith('video/');
                        const isPdf = (a.mimeType || '') === 'application/pdf';
                        const isAudio = (a.mimeType || '').startsWith('audio/');
                        return (
                          <div
                            key={a._id}
                            className="relative group flex flex-col items-center gap-1 rounded-lg border border-border/50 bg-muted/20 p-2"
                          >
                            <button
                              type="button"
                              onClick={() => removePendingAttachment(a._id)}
                              className="absolute -top-2 -right-2 z-10 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label="Remove attachment"
                            >
                              <X className="h-3 w-3" />
                            </button>

                            {isImage && url ? (
                              <img
                                src={url}
                                alt={a.name}
                                className="h-20 w-20 rounded-md object-cover border border-border/40 bg-background"
                              />
                            ) : isAudio && url ? (
                              <audio
                                src={url}
                                controls
                                className="h-10 w-48"
                              />
                            ) : isVideo && url ? (
                              <MinimalVideoPlayer
                                src={url}
                                className="h-24 w-40 rounded-md border border-border/40"
                              />
                            ) : isPdf && url ? (
                              <div className="h-24 w-24 relative rounded-md border border-border/40 bg-background overflow-hidden group/pdf">
                                <iframe
                                  src={`${url}#toolbar=0&navpanes=0&scrollbar=0`}
                                  className="h-full w-full pointer-events-none"
                                  tabIndex={-1}
                                />
                                <div className="absolute inset-0 bg-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] p-0.5 truncate text-center">
                                  PDF
                                </div>
                              </div>
                            ) : (
                              <div className="h-20 w-20 flex items-center justify-center rounded-md border border-border/40 bg-background">
                                <Paperclip className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <span className="text-[10px] max-w-[100px] truncate text-muted-foreground px-1">{a.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <Input
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      if (e.target.value.trim()) {
                        handleTyping();
                      }
                    }}
                    placeholder={isPending && !isIncomingRequest ? "Waiting for acceptance..." : "Type a message..."}
                    className="pr-20 min-h-[44px] py-3"
                    disabled={isPending && !isIncomingRequest} // Logic for 72h timeout could be here
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-9 w-9 text-muted-foreground"
                    onClick={handlePickFiles}
                    disabled={!activeChat || isUploadingAttachments || (isPending && !isIncomingRequest)}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "absolute right-10 top-1 h-9 w-9",
                      isRecording ? "text-destructive animate-pulse" : "text-muted-foreground"
                    )}
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={!activeChat || isUploadingAttachments || (isPending && !isIncomingRequest)}
                  >
                    {isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  type="submit"
                  size="icon"
                  className="h-[44px] w-[44px]"
                  disabled={
                    (isPending && !isIncomingRequest) ||
                    isUploadingAttachments ||
                    (!newMessage.trim() && pendingAttachments.length === 0)
                  }
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              {isPending && !isIncomingRequest && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Your request is pending. If not accepted, you can try again in 72 hours.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
            <p>Select a chat or start a new conversation</p>
            <Button className="mt-4" onClick={() => setIsNewChatOpen(true)}>
              Start Chat
            </Button>
          </div>
        )}
      </div>

      {/* Right User Info Panel */}
      <AnimatePresence>
        {activeChat && showUserInfo && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 288, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-l border-border bg-sidebar hidden xl:block overflow-hidden"
          >
            <div className="w-72 h-full">
              {renderUserDetailsPanel()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile user info sheet */}
      <Dialog open={mobileUserInfoOpen} onOpenChange={setMobileUserInfoOpen}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden h-[80vh]">
          {renderUserDetailsPanel()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewAttachment} onOpenChange={(open) => !open && setPreviewAttachment(null)}>
        <DialogContent className="max-w-4xl w-[90vw] h-[80vh] p-0 overflow-hidden bg-black/95 border-none focus:outline-none">
          <DialogHeader className="sr-only">
            <DialogTitle>{previewAttachment?.name || 'Attachment preview'}</DialogTitle>
          </DialogHeader>
          <div className={cn(
            "relative w-full h-full",
            previewAttachment?.type === 'pdf' ? "block" : "flex items-center justify-center"
          )}>
            <button
              onClick={() => setPreviewAttachment(null)}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            {previewAttachment?.type === 'image' && (
              <img
                src={previewAttachment.url}
                alt={previewAttachment.name}
                className="max-w-full max-h-full object-contain"
              />
            )}
            {previewAttachment?.type === 'video' && (
              <video
                src={previewAttachment.url}
                controls
                className="max-w-full max-h-full"
                autoPlay
              />
            )}
            {previewAttachment?.type === 'pdf' && (
              <>
                <div className="w-full h-full overflow-y-auto bg-neutral-900/50 p-4 pt-16">
                  <div ref={pdfContainerRef} className="max-w-3xl mx-auto min-h-full flex flex-col items-center">
                    <Document
                      file={previewAttachment.url}
                      onLoadSuccess={(info) => {
                        setPdfNumPages(info.numPages);
                        setPdfCurrentPage((p) => Math.min(Math.max(1, p), info.numPages));
                      }}
                      onLoadError={(error) => console.error('PDF Load Error:', error)}
                      loading={<div className="h-[50vh] flex items-center justify-center text-white">Loading PDF…</div>}
                      error={<div className="h-[50vh] flex items-center justify-center text-red-400">Failed to load PDF</div>}
                    >
                      {pdfNumPages > 0 && pdfPageWidth > 0 && (
                        <Page
                          pageNumber={pdfCurrentPage}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          className="shadow-lg mx-auto mb-24"
                          width={pdfPageWidth}
                          loading={
                            <div
                              className="bg-white shadow-lg mx-auto mb-24 animate-pulse"
                              style={{ width: pdfPageWidth, height: pdfPageWidth * 1.414 }}
                            />
                          }
                        />
                      )}
                    </Document>
                  </div>
                </div>

                {pdfNumPages > 0 && (
                  <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-full px-6 py-2 shadow-2xl border border-border/20 flex items-center gap-6 z-50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPdfCurrentPage((p) => Math.max(1, p - 1));
                      }}
                      disabled={pdfCurrentPage <= 1}
                      className="p-1 hover:bg-black/5 rounded-full disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5 text-black" />
                    </button>
                    <span className="text-sm font-semibold text-black min-w-12 text-center select-none">
                      {pdfCurrentPage} of {pdfNumPages}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPdfCurrentPage((p) => Math.min(pdfNumPages, p + 1));
                      }}
                      disabled={pdfCurrentPage >= pdfNumPages}
                      className="p-1 hover:bg-black/5 rounded-full disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="h-5 w-5 text-black" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        showProjectSelector={true}
      />
    </div>
  );
}
