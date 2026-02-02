import { useState, useEffect, useRef } from 'react';
import { initiateSocket, disconnectSocket, sendMessage, subscribeToMessages, subscribeToHistory, joinChat, leaveChat, sendTyping, sendStopTyping, subscribeToTyping, markRead, subscribeToStatusUpdates, subscribeToUserStatus } from '../services/socket';
import { uploadFile, getUsers } from '../services/api';
import { Send, Paperclip, FileText, Download, LogOut, Image as ImageIcon, Mic, User, Settings as SettingsIcon, MessageSquare, ArrowLeft, Smile, Trash2, X, Check, CheckCheck } from 'lucide-react';
import { compressImage } from '../utils/imageCompression';
import ExpressionPicker from './ExpressionPicker';

export default function Chat({ user, onLogout, onSettings }) {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [users, setUsers] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [typingUser, setTypingUser] = useState(null);
    const [showPicker, setShowPicker] = useState(false);
    const [fullscreenImage, setFullscreenImage] = useState(null);

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);

    // Recording Refs
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

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

            mediaRecorder.onstop = handleRecordingStop;

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingDuration(0);

            timerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            // Stop all tracks to release microphone
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            // Remove onstop handler so we don't upload
            mediaRecorderRef.current.onstop = null;
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
            setRecordingDuration(0);
        }
    };

    const handleRecordingStop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], "voice-message.webm", { type: 'audio/webm' });

        setIsUploading(true);
        try {
            const data = await uploadFile(audioFile, user.token);
            sendMessage({
                recipient: selectedUser,
                content: 'Audio Message',
                type: 'audio',
                fileUrl: data.fileUrl,
                fileName: data.fileName,
                fileSize: data.fileSize
            });
        } catch (err) {
            console.error('Audio upload failed', err);
            alert("Failed to send audio");
        } finally {
            setIsUploading(false);
        }
    };

    // Initialize socket only once
    useEffect(() => {
        initiateSocket(user.token);

        // Load available users
        setIsLoadingUsers(true);
        getUsers(user.token).then(data => {
            if (Array.isArray(data)) {
                // handle both old string array and new object array for safety during migration
                const formatted = data.map(u => typeof u === 'string' ? { username: u, is_online: 0 } : u);
                setUsers(formatted);
            } else {
                console.warn("getUsers returned non-array:", data);
                setUsers([]);
            }
        }).catch(err => {
            console.error("Failed to load users:", err);
            setUsers([]);
        }).finally(() => {
            setIsLoadingUsers(false);
        });

        const unsubscribeUserStatus = subscribeToUserStatus(({ username, is_online, last_seen }) => {
            setUsers(prev => prev.map(u => {
                if (u.username === username) {
                    return { ...u, is_online, last_seen };
                }
                return u;
            }));
        });

        return () => {
            if (unsubscribeUserStatus) unsubscribeUserStatus();
            disconnectSocket();
        };
    }, [user.token]);

    const isHistoryLoadRef = useRef(false);

    // Handle user selection and room joining
    useEffect(() => {
        if (selectedUser) {
            setMessages([]); // Clear previous messages
            setIsLoadingMessages(true);
            isHistoryLoadRef.current = true;
            joinChat(selectedUser);

            // Subscribe to history for this specific room
            const unsubscribeHistory = subscribeToHistory((history) => {
                setMessages(history);
                setIsLoadingMessages(false);
            });

            // Subscribe to live messages
            const unsubscribeMessages = subscribeToMessages((err, msg) => {
                if (!err) {
                    setMessages(prev => [...prev, msg]);

                    // If we receive a message from the user we are chatting with, mark it as read immediately
                    if (msg.sender === selectedUser) {
                        markRead(selectedUser);
                    }

                    // Handle Notifications
                    if (msg.sender !== user.username) {
                        const notificationsEnabled = localStorage.getItem('notifications') === 'true';
                        if (notificationsEnabled && (document.hidden || !document.hasFocus())) {
                            // Try Service Worker first (standard for mobile/PWA)
                            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                                navigator.serviceWorker.ready.then(registration => {
                                    registration.showNotification(`Message from ${msg.sender}`, {
                                        body: msg.type === 'text' ? msg.content : `Sent a ${msg.type}`,
                                        tag: 'chat-msg',
                                        icon: '/vite.svg', // Fallback icon, ideally use app icon
                                        vibrate: [200, 100, 200]
                                    });
                                });
                            } else {
                                // Fallback to classic API
                                try {
                                    new Notification(`Message from ${msg.sender}`, {
                                        body: msg.type === 'text' ? msg.content : `Sent a ${msg.type}`,
                                        tag: 'chat-msg'
                                    });
                                } catch (e) {
                                    console.error("Notification error:", e);
                                }
                            }
                        }
                    }
                }
            });

            // Subscribe to status updates (read receipts)
            const unsubscribeStatus = subscribeToStatusUpdates(({ reader }) => {
                if (reader === selectedUser) {
                    setMessages(prev => prev.map(msg =>
                        msg.sender === user.username ? { ...msg, status: 'read' } : msg
                    ));
                }
            });

            // Subscribe to typing events
            const unsubscribeTyping = subscribeToTyping(({ user, isTyping }) => {
                if (user === selectedUser) {
                    setTypingUser(isTyping ? user : null);
                }
            });

            return () => {
                leaveChat(selectedUser);
                setIsLoadingMessages(false);
                if (unsubscribeHistory) unsubscribeHistory();
                if (unsubscribeMessages) unsubscribeMessages();
                if (unsubscribeTyping) unsubscribeTyping();
                if (unsubscribeStatus) unsubscribeStatus();
            };
        }
    }, [selectedUser]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (isHistoryLoadRef.current) {
                messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
                // Only mark history load as done if we actually have messages or it's been a moment
                // But generally, the first update after user selection is history.
                // We keep it true until the effect runs with data.
                if (messages.length > 0) isHistoryLoadRef.current = false;
            } else {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }
        }, 100); // Small delay ensures DOM is fully rendered specially with images

        return () => clearTimeout(timeoutId);
    }, [messages]);

    const handleSend = () => {
        if (!inputText.trim() || !selectedUser) return;
        sendMessage({ content: inputText, type: 'text', recipient: selectedUser });
        setInputText('');

        // Stop typing immediately upon sending
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        sendStopTyping(selectedUser);
        isTypingRef.current = false;
    };

    const handleInputChange = (e) => {
        setInputText(e.target.value);

        if (!selectedUser) return;

        if (!isTypingRef.current) {
            isTypingRef.current = true;
            sendTyping(selectedUser);
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            sendStopTyping(selectedUser);
            isTypingRef.current = false;
        }, 2000);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedUser) return;

        setIsUploading(true);
        try {
            let fileToUpload = file;
            if (file.type.startsWith('image/')) {
                try {
                    fileToUpload = await compressImage(file);
                } catch (error) {
                    console.warn('Image compression failed, falling back to original file:', error);
                }
            }

            const data = await uploadFile(fileToUpload, user.token);
            let type = 'file';
            if (file.type.startsWith('image/')) type = 'image';
            if (file.type.startsWith('audio/')) type = 'audio';

            sendMessage({
                recipient: selectedUser,
                content: `Sent a file: ${data.fileName}`,
                type,
                fileUrl: data.fileUrl,
                fileName: data.fileName,
                fileSize: data.fileSize
            });
        } catch (err) {
            console.error('Upload failed', err);
            alert('Upload failed');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };


    const handleEmojiClick = (emojiObject) => {
        setInputText(prev => prev + emojiObject.emoji);
    };

    const handleStickerClick = (url) => {
        if (!selectedUser) return;
        sendMessage({
            recipient: selectedUser,
            content: 'Sticker',
            type: 'sticker',
            fileUrl: url,
            fileName: 'sticker.gif',
            fileSize: 0
        });
        setShowPicker(false);
    };

    const handleCustomStickerUpload = async (file) => {
        if (!selectedUser || !file) return;

        setIsUploading(true);
        try {
            const data = await uploadFile(file, user.token);

            sendMessage({
                recipient: selectedUser,
                content: 'Sticker',
                type: 'sticker',
                fileUrl: data.fileUrl,
                fileName: data.fileName,
                fileSize: data.fileSize
            });
            setShowPicker(false);
        } catch (err) {
            console.error('Sticker upload failed', err);
            alert('Sticker upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const renderMessageContent = (msg) => {
        switch (msg.type) {
            case 'image':
                return (
                    <div className="space-y-2">
                        <img
                            src={msg.fileUrl}
                            alt="Uploaded content"
                            className="max-w-full sm:max-w-xs rounded-lg shadow-md border border-slate-700/50 cursor-pointer hover:opacity-90 transition"
                            onClick={() => setFullscreenImage(msg.fileUrl)}
                        />
                        <a href={msg.fileUrl} download={msg.fileName} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                            <Download size={12} /> Download full size
                        </a>
                    </div>
                );
            case 'audio':
                return (
                    <div className="bg-slate-900/50 p-2 rounded-lg min-w-[200px]">
                        <audio controls src={msg.fileUrl} className="w-full h-8" />
                    </div>
                )
            case 'file':
                return (
                    <a href={msg.fileUrl} download={msg.fileName} className="flex items-center gap-3 bg-slate-800/80 p-3 rounded-lg hover:bg-slate-700 transition border border-slate-700">
                        <div className="p-2 bg-slate-900 rounded-lg text-primary">
                            <FileText size={20} />
                        </div>
                        <div className="overflow-hidden">
                            <p className="font-medium text-sm truncate max-w-[150px]">{msg.fileName}</p>
                            <p className="text-xs text-slate-400">{(msg.fileSize / 1024).toFixed(1)} KB</p>
                        </div>
                        <Download size={16} className="text-slate-400" />
                    </a>
                );
            case 'sticker':
                return (
                    <div className="w-32 h-32 md:w-40 md:h-40">
                        <img src={msg.fileUrl} alt="Sticker" className="w-full h-full object-contain drop-shadow-md hover:scale-105 transition-transform" />
                    </div>
                );
            default:
                return <p className="whitespace-pre-wrap break-words">{msg.content}</p>;
        }
    };

    const formatMessageTime = (timestamp) => {
        if (!timestamp) return '';
        try {
            // Check if it's the SQLite default string 'YYYY-MM-DD HH:MM:SS' (likely UTC)
            // If so, append 'Z' to treat it as UTC so toLocaleTimeString works correctly against local timezone
            let ts = timestamp;
            if (typeof ts === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(ts)) {
                ts = ts.replace(' ', 'T') + 'Z';
            }
            return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '';
        }
    };

    const formatLastSeen = (timestamp) => {
        if (!timestamp) return '';
        try {
            let ts = timestamp;
            if (typeof ts === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(ts)) {
                ts = ts.replace(' ', 'T') + 'Z';
            }
            const date = new Date(ts);
            const now = new Date();
            const isToday = date.toDateString() === now.toDateString();
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return isToday ? `Last seen today at ${timeStr}` : `Last seen on ${date.toLocaleDateString()} at ${timeStr}`;
        } catch (e) {
            return '';
        }
    };

    return (
        <div className="flex bg-dark text-slate-200 font-sans overflow-hidden fixed inset-0 w-full" style={{ height: '100dvh' }}>
            {/* Sidebar (Responsive) */}
            <div className={`
                ${selectedUser ? 'hidden md:flex' : 'flex'} 
                w-full md:w-80 flex-col border-r border-slate-800 bg-dark-lighter transition-all duration-300
            `}>
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20">
                            {user.username[0].toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-bold text-white tracking-wide">{user.username}</h3>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                <span className="text-xs text-green-500 font-medium">Online</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={onSettings} title="Settings" className="p-2.5 hover:bg-slate-700/50 rounded-xl transition text-slate-400 hover:text-white">
                            <SettingsIcon size={20} />
                        </button>
                        <button onClick={onLogout} title="Logout" className="p-2.5 hover:bg-red-500/10 rounded-xl transition text-slate-400 hover:text-red-400">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-4 overflow-y-auto flex-1 bg-gradient-to-b from-dark-lighter to-dark">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-2">Users</div>
                    <div className="space-y-2">
                        {isLoadingUsers ? (
                            // Skeleton Loader for Users
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="p-3 rounded-xl border border-slate-700/30 bg-slate-800/30 flex items-center gap-3 animate-pulse">
                                    <div className="w-10 h-10 rounded-full bg-slate-700"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-slate-700 rounded w-24"></div>
                                        <div className="h-3 bg-slate-700 rounded w-16"></div>
                                    </div>
                                </div>
                            ))
                        ) : users.length === 0 ? (
                            <div className="text-center py-10 text-slate-500 italic text-sm">
                                No other users found. Invite someone!
                            </div>
                        ) : (
                            users.map((u, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setSelectedUser(u.username)}
                                    className={`
                                        p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all duration-200
                                        ${selectedUser === u.username
                                            ? 'bg-primary/10 border-primary/50 shadow-md shadow-primary/5'
                                            : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/80 hover:border-slate-600'
                                        }
                                    `}
                                >
                                    <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-white font-bold transition-colors ${selectedUser === u.username ? 'bg-primary' : 'bg-slate-700'}`}>
                                        {u.username[0].toUpperCase()}
                                        {u.is_online === 1 && (
                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-dark rounded-full"></span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`font-semibold ${selectedUser === u.username ? 'text-white' : 'text-slate-200'}`}>{u.username}</h4>
                                        <p className="text-xs text-slate-500 truncate">
                                            {u.is_online === 1 ? 'Online' : 'Offline'}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className={`
                ${!selectedUser ? 'hidden md:flex' : 'flex'} 
                flex-1 flex-col h-full relative bg-dark
            `}>
                {!selectedUser ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center animate-fade-in">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-600">
                            <MessageSquare size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-300 mb-2">Select a user to chat</h2>
                        <p className="max-w-md">Choose someone from the sidebar to start a private conversation.</p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-slate-800 bg-dark-lighter/95 backdrop-blur flex items-center justify-between z-10 shadow-sm sticky top-0 flex-none">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setSelectedUser(null)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white">
                                    <ArrowLeft size={20} />
                                </button>
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                    {selectedUser[0].toUpperCase()}
                                </div>
                                {(() => {
                                    const targetUserObj = users.find(u => u.username === selectedUser);
                                    const isOnline = targetUserObj?.is_online;
                                    const lastSeen = targetUserObj?.last_seen;

                                    return (
                                        <>
                                            <span className="font-bold text-white block truncate mb-0.5">{selectedUser}</span>
                                            {typingUser === selectedUser ? (
                                                <span className="text-xs text-primary font-medium animate-pulse block truncate">
                                                    typing...
                                                </span>
                                            ) : isOnline ? (
                                                <span className="text-xs text-primary font-medium block truncate">
                                                    Online
                                                </span>
                                            ) : lastSeen ? (
                                                <span className="text-xs text-slate-400 block truncate">
                                                    {formatLastSeen(lastSeen)}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400 block truncate">
                                                    Offline
                                                </span>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>



                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-700" style={{ backgroundImage: 'radial-gradient(circle at center, #1e293b 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
                            {isLoadingMessages ? (
                                <div className="flex-1 flex flex-col items-center justify-center h-full">
                                    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                    <p className="text-slate-500 mt-4 text-sm font-medium animate-pulse">Loading conversation...</p>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-10 text-slate-500">
                                    <p>No messages yet. Say hello!</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMe = msg.sender === user.username;
                                    return (
                                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                                            <div className={`flex flex-col max-w-[85%] md:max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
                                                <span className="text-[10px] text-slate-500 mb-1 px-1 flex items-center gap-1">
                                                    {msg.sender} • {formatMessageTime(msg.timestamp)}
                                                    {isMe && (
                                                        msg.status === 'read' ?
                                                            <CheckCheck size={14} className="text-blue-500" /> :
                                                            <Check size={14} className="text-slate-500" />
                                                    )}
                                                </span>
                                                <div className={`p-3 md:p-4 rounded-2xl shadow-md ${isMe
                                                    ? (msg.type === 'sticker' ? 'bg-transparent shadow-none p-0' : 'bg-gradient-to-br from-primary to-secondary text-white rounded-tr-none')
                                                    : (msg.type === 'sticker' ? 'bg-transparent shadow-none p-0' : 'bg-dark-lighter border border-slate-800 text-slate-200 rounded-tl-none')
                                                    }`}>
                                                    {renderMessageContent(msg)}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 md:p-6 bg-dark-lighter/90 border-t border-slate-800 backdrop-blur-md flex-none z-10">
                            {isRecording ? (
                                <div className="flex-1 flex items-center gap-4 bg-slate-900 border border-red-500/30 rounded-full py-2 px-4 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse-subtle">
                                    <div className="flex items-center gap-2 text-red-500 font-medium whitespace-nowrap min-w-[80px]">
                                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                        <span>{Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
                                    </div>

                                    <div className="flex-1 h-8 flex items-center gap-1 opacity-50 overflow-hidden">
                                        {Array.from({ length: 20 }).map((_, i) => (
                                            <div key={i} className="w-1 bg-red-500 rounded-full animate-wave" style={{
                                                height: `${Math.random() * 100}%`,
                                                animationDelay: `${i * 0.05}s`
                                            }} />
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={cancelRecording}
                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-full transition"
                                            title="Cancel"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                        <button
                                            onClick={stopRecording}
                                            disabled={isUploading}
                                            className="p-2 bg-red-500 text-white hover:bg-red-600 rounded-full shadow-lg shadow-red-500/20 transition transform hover:scale-105 active:scale-95"
                                            title="Send Audio"
                                        >
                                            {isUploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={20} />}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="max-w-4xl mx-auto flex items-center gap-3 w-full">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                    {/* Emoji Picker Popover */}
                                    <div className="relative">
                                        {showPicker && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
                                                <div className="absolute bottom-12 left-0 z-50">
                                                    <ExpressionPicker
                                                        onEmojiClick={handleEmojiClick}
                                                        onStickerClick={handleStickerClick}
                                                        onCustomStickerUpload={handleCustomStickerUpload}
                                                    />
                                                </div>
                                            </>
                                        )}
                                        <button
                                            onClick={() => setShowPicker(!showPicker)}
                                            className={`p-3 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition border border-slate-700 ${showPicker ? 'text-primary border-primary/50' : ''}`}
                                        >
                                            <Smile size={20} />
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className={`p-3 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition border border-slate-700 ${isUploading ? 'animate-pulse' : ''}`}
                                    >
                                        <Paperclip size={20} />
                                    </button>

                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={inputText}
                                            onChange={handleInputChange}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                            onPaste={(e) => {
                                                const items = e.clipboardData?.items;
                                                if (items) {
                                                    for (let i = 0; i < items.length; i++) {
                                                        if (items[i].type.indexOf("image") !== -1) {
                                                            const blob = items[i].getAsFile();
                                                            if (blob) {
                                                                handleCustomStickerUpload(blob);
                                                                e.preventDefault(); // Prevent pasting the filename text
                                                            }
                                                        }
                                                    }
                                                }
                                            }}
                                            placeholder={`Message ${selectedUser}...`}
                                            className="w-full bg-slate-900 border border-slate-700 text-white rounded-full py-3 px-5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition placeholder-slate-500"
                                        />
                                    </div>

                                    {inputText.trim() ? (
                                        <button
                                            onClick={handleSend}
                                            className="p-3 bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg shadow-primary/25 transition transform hover:scale-105 active:scale-95"
                                        >
                                            <Send size={20} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={startRecording}
                                            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full border border-slate-700 transition transform hover:scale-105 active:scale-95"
                                            title="Record Audio"
                                        >
                                            <Mic size={20} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Fullscreen Image Overlay */}
            {
                fullscreenImage && (
                    <div
                        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 animate-fade-in"
                        onClick={() => setFullscreenImage(null)}
                    >
                        <button
                            onClick={() => setFullscreenImage(null)}
                            className="absolute top-4 right-4 p-2 bg-slate-800/50 hover:bg-slate-700 text-white rounded-full transition"
                        >
                            <X size={24} />
                        </button>
                        <img
                            src={fullscreenImage}
                            alt="Fullscreen view"
                            className="max-h-full max-w-full object-contain"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )
            }
        </div >
    );
}
