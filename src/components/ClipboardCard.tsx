import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Lock, CornerDownLeft, Copy } from 'lucide-react';

interface ClipboardItem {
    id: string;
    type: 'text' | 'image' | 'rtf' | 'html';
    content: string;
    preview?: string;
    timestamp: number;
    pinned: boolean;
}

interface ClipboardCardProps {
    item: ClipboardItem;
    isActive: boolean;
    onClick: () => void;
}

export function ClipboardCard({ item, isActive, onClick }: ClipboardCardProps) {
    const cn = (...inputs: (string | undefined | null | false)[]) => twMerge(clsx(inputs));

    const getTheme = () => {
        if (item.pinned) return {
            bg: 'bg-[#fbbf24]', // Amber
            text: 'text-white',
            name: 'Organizar',
            icon: <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"><span className="font-bold text-white text-lg">P</span></div>
        };
        if (item.type === 'image') return {
            bg: 'bg-[#fb923c]', // Orange (matches screenshot 'Buscar'/'Mantener' style)
            text: 'text-white',
            name: 'Imágen',
            icon: <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"><span className="font-bold text-white text-lg">I</span></div>
        };
        if (item.content.startsWith('http')) return {
            bg: 'bg-[#ef4444]', // Red/Pink
            text: 'text-white',
            name: 'Enlace',
            icon: <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"><span className="font-bold text-white text-lg">@</span></div>
        };
        // Default Blue
        return {
            bg: 'bg-[#3b82f6]', // Blue
            text: 'text-white',
            name: 'Texto',
            icon: <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center"><img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg" className="w-5 h-5" alt="Chrome" /></div>
        };
    };

    const theme = getTheme();

    const getTimeAgo = (timestamp: number) => {
        // eslint-disable-next-line
        const diff = Date.now() - timestamp;
        if (diff < 60000) return 'ahora';
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `hace ${mins} minutos`;
        return 'hace mucho';
    };

    return (
        <div
            onClick={onClick}
            className={cn(
                "relative flex flex-col w-full h-full rounded-[24px] overflow-hidden cursor-pointer transition-all duration-200",
                "bg-[#2c2c2e]/90 shadow-2xl backdrop-blur-sm", // Slight transparency
                isActive
                    ? "ring-[4px] ring-white shadow-[0_0_30px_rgba(255,255,255,0.25)] z-20 scale-[1.02]" // Vibrant White Border + Glow
                    : "hover:brightness-110 hover:scale-[1.01] border border-white/5",
                item.pinned && !isActive ? "ring-1 ring-amber-400/30" : ""
            )}
        >
            {/* Header: Compact Vibrant Color Block (Approx 40% height) */}
            <div className={cn("h-[45%] px-5 py-4 flex items-start justify-between relative overflow-hidden", theme.bg)}>

                {/* Subtle gradient overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />

                <div className="flex flex-col overflow-hidden z-10">
                    <span className="text-white font-black text-[15px] leading-none tracking-tight drop-shadow-sm">
                        {theme.name}
                    </span>
                    <span className="text-white/80 text-[10px] font-medium mt-0.5 opacity-90 truncate">
                        {getTimeAgo(item.timestamp)}
                    </span>
                </div>

                {/* Icon in Header - scaled down */}
                <div className="shrink-0 scale-90 origin-top-right opacity-90">
                    {theme.icon}
                </div>
            </div>

            {/* Body: Dark Content */}
            <div className="flex-1 p-3 flex flex-col relative bg-[#1e1e1e]">
                {/* Content Text */}
                <div className="flex-1 overflow-hidden mask-linear-fade">
                    {item.content.trim().length > 0 ? (
                        <p className={cn(
                            "text-[11px] leading-[1.5]",
                            item.pinned ? "text-white font-medium" : "text-gray-400 font-mono"
                        )}>
                            {item.content.substring(0, 150)}
                        </p>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-20">
                            <Copy size={24} className="text-white" />
                        </div>
                    )}
                </div>

                {/* Footer Char Count */}
                <div className="mt-2 flex justify-between items-center text-gray-500">
                    <span className="text-[10px] font-bold tracking-wider">
                        {item.content.length} c
                    </span>

                    {/* Lock Overlay (Small) */}
                    {item.pinned && (
                        <div className="flex items-center gap-1 text-amber-500/80">
                            <Lock size={12} strokeWidth={2.5} />
                        </div>
                    )}

                    {/* Enter Hint */}
                    {isActive && (
                        <div className="flex items-center gap-1 text-blue-500 animate-pulse">
                            <CornerDownLeft size={10} strokeWidth={3} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
