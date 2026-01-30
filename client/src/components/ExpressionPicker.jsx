import React, { useState, useRef } from 'react';
import EmojiPicker, { EmojiStyle } from 'emoji-picker-react';
import { Smile, Sticker, Plus } from 'lucide-react';

const STICKERS = [
    { url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', name: 'Cat Typing' },
    { url: 'https://media.giphy.com/media/4Zo41lhzKt6iZ8xff9/giphy.gif', name: 'Dog Hello' },
    { url: 'https://media.giphy.com/media/LpDmM2wSt6Hm5fKJVa/giphy.gif', name: 'Heart' },
    { url: 'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif', name: 'Cat Shock' },
    { url: 'https://media.giphy.com/media/VbnUQpnihPSIgIXuZv/giphy.gif', name: 'Success' },
    { url: 'https://media.giphy.com/media/mlvseqRN4JEmu59yv9/giphy.gif', name: 'Party' },
];

export default function ExpressionPicker({ onEmojiClick, onStickerClick, onCustomStickerUpload }) {
    const [activeTab, setActiveTab] = useState('emoji'); // 'emoji' | 'sticker'
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            onCustomStickerUpload(file);
            // Reset input
            e.target.value = '';
        }
    };

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col w-[350px] h-[450px]">
            {/* Tabs */}
            <div className="flex border-b border-slate-700 bg-slate-900">
                <button
                    onClick={() => setActiveTab('emoji')}
                    className={`flex-1 p-3 flex items-center justify-center gap-2 transition-colors ${activeTab === 'emoji' ? 'bg-slate-800 text-primary' : 'text-slate-400 hover:text-white'}`}
                >
                    <Smile size={20} />
                    <span className="text-sm font-medium">Emojis</span>
                </button>
                <button
                    onClick={() => setActiveTab('sticker')}
                    className={`flex-1 p-3 flex items-center justify-center gap-2 transition-colors ${activeTab === 'sticker' ? 'bg-slate-800 text-primary' : 'text-slate-400 hover:text-white'}`}
                >
                    <Sticker size={20} />
                    <span className="text-sm font-medium">Stickers</span>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden bg-slate-800 relative">
                {activeTab === 'emoji' ? (
                    <div className="h-full w-full">
                        <EmojiPicker
                            onEmojiClick={onEmojiClick}
                            theme="dark"
                            width="100%"
                            height="100%"
                            lazyLoadEmojis={true}
                            searchDisabled={false}
                            skinTonesDisabled={false}
                            emojiStyle={EmojiStyle.APPLE}
                            previewConfig={{ showPreview: false }}
                        />
                    </div>
                ) : (
                    <div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto h-full scrollbar-thin scrollbar-thumb-slate-600">
                        {/* Upload Button */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-slate-700/30 rounded-xl border border-dashed border-slate-600 hover:bg-slate-700/50 hover:border-primary/50 transition flex flex-col items-center justify-center gap-2 aspect-square group"
                        >
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary transition">
                                <Plus size={20} />
                            </div>
                            <span className="text-xs text-slate-400 font-medium">Create</span>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </button>

                        {STICKERS.map((sticker, idx) => (
                            <button
                                key={idx}
                                onClick={() => onStickerClick(sticker.url)}
                                className="group relative aspect-square bg-slate-700/30 rounded-xl overflow-hidden hover:bg-slate-700/50 transition border border-transparent hover:border-primary/50"
                            >
                                <img
                                    src={sticker.url}
                                    alt={sticker.name}
                                    className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-200"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
