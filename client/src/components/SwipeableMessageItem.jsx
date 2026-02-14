import { useState, useRef, useEffect } from 'react';
import { Reply } from 'lucide-react';

export const SwipeableMessageItem = ({ children, onReply, isMe, className }) => {
    const [offset, setOffset] = useState(0);
    const startX = useRef(0);
    const isSwiping = useRef(false);
    const touchId = useRef(null);

    const handleTouchStart = (e) => {
        startX.current = e.touches[0].clientX;
        isSwiping.current = true;
        touchId.current = e.touches[0].identifier;
    };

    const handleTouchMove = (e) => {
        if (!isSwiping.current) return;

        // Find the touch point that started the swipe
        const touch = Array.from(e.changedTouches).find(t => t.identifier === touchId.current);
        if (!touch) return;

        const currentX = touch.clientX;
        const diff = currentX - startX.current;

        // Only allow swiping to the right (pulling message to right to reply)
        // Adjust resistance: 0.5 factor
        if (diff > 0) {
            // Prevent scrolling if swiping horizontally
            if (diff > 10 && e.cancelable) {
                // We can't preventDefault here easily in React 18 passive listeners, 
                // but we can try via ref or just rely on CSS touch-action
            }
            const damped = diff * 0.4;
            // Cap at 100px visual
            setOffset(Math.min(damped, 100));
        }
    };

    const handleTouchEnd = (e) => {
        if (!isSwiping.current) return;
        isSwiping.current = false;
        touchId.current = null;

        if (offset > 40) { // Threshold for activation
            // Trigger reply
            if (navigator.vibrate) navigator.vibrate(50);
            onReply();
        }

        // Snap back
        setOffset(0);
    };

    return (
        <div
            className={`relative touch-pan-y select-none overflow-hidden w-full ${className}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Background Icon Layer */}
            <div
                className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none transition-opacity duration-300"
                style={{
                    opacity: offset > 20 ? Math.min(1, offset / 40) : 0,
                    transform: `translateX(${offset > 40 ? 0 : -20}px) scale(${Math.min(1, offset / 40)})`
                }}
            >
                <div className="bg-slate-700/80 p-2 rounded-full text-white shadow-sm backdrop-blur-sm">
                    <Reply size={20} />
                </div>
            </div>

            {/* Foreground Content Layer */}
            <div
                className={`transition-transform duration-200 ease-out flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
                style={{ transform: `translateX(${offset}px)` }}
            >
                {children}
            </div>
        </div>
    );
};
