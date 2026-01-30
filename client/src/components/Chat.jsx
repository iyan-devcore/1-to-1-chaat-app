import { useState, useEffect, useRef } from 'react';
import { initiateSocket, disconnectSocket, sendMessage, subscribeToMessages, subscribeToHistory, joinChat, leaveChat, sendTyping, sendStopTyping, subscribeToTyping } from '../services/socket';
import { uploadFile, getUsers } from '../services/api';
import { Send, Paperclip, FileText, Download, LogOut, Image as ImageIcon, Mic, User, Settings as SettingsIcon, MessageSquare, ArrowLeft, Smile } from 'lucide-react';
import { compressImage } from '../utils/imageCompression';
import ExpressionPicker from './ExpressionPicker';

export default function Chat({ user, onLogout, onSettings }) {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [typingUser, setTypingUser] = useState(null);
    const [showPicker, setShowPicker] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);

    // Initialize socket only once
    useEffect(() => {
        initiateSocket(user.token);

        // Load available users
        getUsers(user.token).then(setUsers).catch(console.error);

        return () => {
            disconnectSocket();
        };
    }, [user.token]);

    // Handle user selection and room joining
    useEffect(() => {
        if (selectedUser) {
            setMessages([]); // Clear previous messages
            joinChat(selectedUser);

            // Subscribe to history for this specific room
            subscribeToHistory((history) => {
                setMessages(history);
            });

            // Subscribe to live messages
            subscribeToMessages((err, msg) => {
                if (!err) {
                    setMessages(prev => [...prev, msg]);
                }
            });

            // Subscribe to typing events
            subscribeToTyping(({ user, isTyping }) => {
                if (user === selectedUser) {
                    setTypingUser(isTyping ? user : null);
                }
            });

            return () => {
                leaveChat(selectedUser);
            };
        }
    }, [selectedUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
                        <img src={msg.fileUrl} alt="Uploaded content" className="max-w-full sm:max-w-xs rounded-lg shadow-md border border-slate-700/50" />
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

    return (
        <div className="flex h-screen h-[100dvh] bg-dark text-slate-200 font-sans overflow-hidden fixed inset-0">
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
                        {users.map((u, idx) => (
                            <div
                                key={idx}
                                onClick={() => setSelectedUser(u)}
                                className={`
                                    p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all duration-200
                                    ${selectedUser === u
                                        ? 'bg-primary/10 border-primary/50 shadow-md shadow-primary/5'
                                        : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/80 hover:border-slate-600'
                                    }
                                `}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold transition-colors ${selectedUser === u ? 'bg-primary' : 'bg-slate-700'}`}>
                                    {u[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`font-semibold ${selectedUser === u ? 'text-white' : 'text-slate-200'}`}>{u}</h4>
                                    <p className="text-xs text-slate-500 truncate">Tap to chat</p>
                                </div>
                            </div>
                        ))}
                        {users.length === 0 && (
                            <div className="text-center py-10 text-slate-500 italic text-sm">
                                No other users found. Invite someone!
                            </div>
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
                                <div className="flex flex-col justify-center min-w-0">
                                    <span className="font-bold text-white block truncate mb-0.5">{selectedUser}</span>
                                    {typingUser === selectedUser ? (
                                        <span className="text-xs text-primary font-medium animate-pulse block truncate">
                                            typing...
                                        </span>
                                    ) : (
                                        <span className="text-xs text-slate-400 block truncate">
                                            Active now
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-700" style={{ backgroundImage: 'radial-gradient(circle at center, #1e293b 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
                            {messages.length === 0 && (
                                <div className="text-center py-10 text-slate-500">
                                    <p>No messages yet. Say hello!</p>
                                </div>
                            )}
                            {messages.map((msg, idx) => {
                                const isMe = msg.sender === user.username;
                                return (
                                    <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                                        <div className={`flex flex-col max-w-[85%] md:max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
                                            <span className="text-[10px] text-slate-500 mb-1 px-1">{msg.sender} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <div className={`p-3 md:p-4 rounded-2xl shadow-md ${isMe
                                                ? (msg.type === 'sticker' ? 'bg-transparent shadow-none p-0' : 'bg-gradient-to-br from-primary to-secondary text-white rounded-tr-none')
                                                : (msg.type === 'sticker' ? 'bg-transparent shadow-none p-0' : 'bg-dark-lighter border border-slate-800 text-slate-200 rounded-tl-none')
                                                }`}>
                                                {renderMessageContent(msg)}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 md:p-6 bg-dark-lighter/90 border-t border-slate-800 backdrop-blur-md sticky bottom-0 flex-none z-10">
                            <div className="max-w-4xl mx-auto flex items-center gap-3">
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

                                <button
                                    onClick={handleSend}
                                    className="p-3 bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg shadow-primary/25 transition transform hover:scale-105 active:scale-95"
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
