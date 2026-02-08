import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Lock, Copy, Edit2, Trash2 } from 'lucide-react';

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
    onEdit: (id: string, currentContent: string) => void;
}

export function ClipboardCard({ item, isActive, onClick, onEdit }: ClipboardCardProps) {
    if (item.type === 'image') {
        console.log('[Card] RENDER IMAGE:', JSON.stringify(item, null, 2));
    }
    const cn = (...inputs: (string | undefined | null | false)[]) => twMerge(clsx(inputs));

    const getTheme = () => {
        // ... (existing theme logic) ...
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
                "relative flex flex-col w-full aspect-square rounded-[24px] overflow-hidden cursor-pointer transition-all duration-200 group", // Added aspect-square
                "bg-[#2c2c2e]/90 shadow-2xl backdrop-blur-sm",
                isActive
                    ? "ring-[4px] ring-white shadow-[0_0_30px_rgba(255,255,255,0.25)] z-20 scale-[1.02]"
                    : "hover:brightness-110 hover:scale-[1.01] border border-white/5",
                item.pinned && !isActive ? "ring-1 ring-amber-400/30" : ""
            )}
        >
            {/* Action Buttons (Moved to global scope to ensure visibility) */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-100 group-hover:opacity-100 transition-opacity z-50">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit(item.id, item.content);
                    }}
                    className="p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md"
                    title="Editar"
                >
                    <Edit2 size={10} />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("¿Borrar elemento?")) {
                            window.electronAPI?.deleteItem(item.id);
                        }
                    }}
                    className="p-1.5 rounded-full bg-red-500/80 hover:bg-red-600 text-white backdrop-blur-md"
                    title="Borrar"
                >
                    <Trash2 size={10} />
                </button>
            </div>

            {/* Header: Compact Vibrant Color Block (Approx 35% height) */}
            <div className={cn("h-[35%] px-4 py-3 flex items-start justify-between relative overflow-hidden", theme.bg)}>

                {/* Subtle gradient overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />

                <div className="flex flex-col overflow-hidden z-10 w-full">
                    <div className="flex justify-between items-start w-full">
                        <span className="text-white font-black text-[13px] leading-none tracking-tight drop-shadow-sm">
                            {theme.name}
                        </span>
                        {/* Icon in Header - scaled down */}
                        <div className="shrink-0 scale-75 origin-top-right opacity-90 -mt-1 -mr-1">
                            {theme.icon}
                        </div>
                    </div>
                    <span className="text-white/80 text-[9px] font-medium mt-auto opacity-90 truncate">
                        {getTimeAgo(item.timestamp)}
                    </span>
                </div>
            </div>

            {/* Body: Dark Content */}
            <div className="flex-1 p-3 flex flex-col relative bg-[#1e1e1e]">
                {/* Content Text or Image */}
                <div className="flex-1 overflow-hidden mask-linear-fade relative w-full h-full">
                    {item.type === 'image' && item.preview ? (
                        <img
                            src={item.preview}
                            alt="Clipboard Preview"
                            className="w-full h-full object-cover rounded-md opacity-90 hover:opacity-100 transition-opacity"
                            onError={(e) => {
                                console.error('Image Load Error:', item.preview, e);
                                e.currentTarget.style.display = 'none'; // Hide broken image
                                e.currentTarget.parentElement?.classList.add('bg-red-500/20'); // Visual indicator
                            }}
                        />
                    ) : item.content.trim().length > 0 ? (
                        <p className={cn(
                            "text-[10px] leading-[1.4] break-words whitespace-pre-wrap select-none", // Prevent text selection on card click
                            item.pinned ? "text-white font-medium" : "text-gray-400 font-mono"
                        )}>
                            {item.content.substring(0, 100)}
                        </p>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-20">
                            <Copy size={20} className="text-white" />
                        </div>
                    )}
                </div>

                {/* Footer Char Count & Actions */}
                <div className="mt-1 flex justify-between items-end text-gray-500 relative z-30">
                    <span className="text-[9px] font-bold tracking-wider opacity-60">
                        {item.type === 'image' ? 'IMG' : `${item.content.length} c`}
                    </span>

                    <div className="flex gap-2">
                        {/* Pin Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                window.electronAPI?.togglePin(item.id);
                            }}
                            className={cn(
                                "p-1.5 rounded-full backdrop-blur-md transition-colors border border-white/10",
                                item.pinned
                                    ? "bg-amber-400 text-black hover:bg-amber-300"
                                    : "bg-black/40 text-white hover:bg-black/60 hover:text-amber-400"
                            )}
                            title={item.pinned ? "Desfijar" : "Fijar"}
                        >
                            <Lock size={12} fill={item.pinned ? "currentColor" : "none"} />
                        </button>

                        {/* Copy Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                window.electronAPI?.copyItem(item.id);
                            }}
                            className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors border border-white/10"
                            title="Copiar"
                        >
                            <Copy size={12} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
