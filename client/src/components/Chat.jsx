import { useState, useEffect, useRef } from 'react';
import { initiateSocket, disconnectSocket, sendMessage, subscribeToMessages, subscribeToHistory } from '../services/socket';
import { uploadFile } from '../services/api';
import { Send, Paperclip, FileText, Download, LogOut, Image as ImageIcon, Mic, User } from 'lucide-react';

export default function Chat({ user, onLogout }) {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const socket = initiateSocket(user.token);

        subscribeToHistory((history) => {
            setMessages(history);
        });

        subscribeToMessages((err, msg) => {
            if (!err) {
                setMessages(prev => [...prev, msg]);
            }
        });

        return () => {
            disconnectSocket();
        };
    }, [user.token]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = () => {
        if (!inputText.trim()) return;
        sendMessage({ content: inputText, type: 'text' });
        setInputText('');
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const data = await uploadFile(file, user.token);
            let type = 'file';
            if (file.type.startsWith('image/')) type = 'image';
            if (file.type.startsWith('audio/')) type = 'audio';

            sendMessage({
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
            default:
                return <p className="whitespace-pre-wrap break-words">{msg.content}</p>;
        }
    };

    return (
        <div className="flex h-screen bg-dark text-slate-200 font-sans overflow-hidden">
            {/* Sidebar (Desktop only) */}
            <div className="hidden md:flex w-80 flex-col border-r border-slate-800 bg-dark-lighter">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                            {user.username[0].toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-bold text-white">{user.username}</h3>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                <span className="text-xs text-green-500">Online</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onLogout} title="Logout" className="p-2 hover:bg-slate-700 rounded-full transition text-slate-400 hover:text-white">
                        <LogOut size={20} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Direct Messages</div>
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 flex items-center gap-3 cursor-pointer hover:bg-slate-800 transition shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
                            <User size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-200">Chat Room</h4>
                            <p className="text-xs text-slate-500 truncate">Join the conversation</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col h-full relative">
                {/* Header (Mobile only logout) */}
                <div className="md:hidden p-4 border-b border-slate-800 bg-dark-lighter flex justify-between items-center z-10">
                    <span className="font-bold text-white">Chat</span>
                    <button onClick={onLogout} className="text-slate-400"><LogOut size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-700" style={{ backgroundImage: 'radial-gradient(circle at center, #1e293b 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
                    {messages.map((msg, idx) => {
                        const isMe = msg.sender === user.username;
                        return (
                            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                                <div className={`flex flex-col max-w-[85%] md:max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
                                    <span className="text-[10px] text-slate-500 mb-1 px-1">{msg.sender} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <div className={`p-3 md:p-4 rounded-2xl shadow-md ${isMe
                                        ? 'bg-gradient-to-br from-primary to-secondary text-white rounded-tr-none'
                                        : 'bg-dark-lighter border border-slate-800 text-slate-200 rounded-tl-none'
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
                <div className="p-4 md:p-6 bg-dark-lighter/90 border-t border-slate-800 backdrop-blur-md">
                    <div className="max-w-4xl mx-auto flex items-center gap-3">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                        />
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
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Type a message..."
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
            </div>
        </div>
    );
}
