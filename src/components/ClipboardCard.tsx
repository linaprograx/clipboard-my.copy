import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Lock, Copy, Edit2, Trash2, Image as ImageIcon, Type, Globe, File } from 'lucide-react';

interface ClipboardItem {
    id: string;
    type: 'text' | 'image' | 'rtf' | 'html' | 'file';
    content: string;
    preview?: string;
    timestamp: number;
    pinned: boolean;
    metadata?: {
        openGraphValues?: {
            title?: string;
            image?: string;
            description?: string;
            url?: string;
        };
        width?: number;
        height?: number;
    };
}

interface ClipboardCardProps {
    item: ClipboardItem;
    isActive: boolean;
    onClick: () => void;
    onEdit: (id: string, currentContent: string) => void;
}

export function ClipboardCard({ item, isActive, onClick, onEdit }: ClipboardCardProps) {
    const cn = (...inputs: (string | undefined | null | false)[]) => twMerge(clsx(inputs));

    const getTimeAgo = (timestamp: number) => {
        // eslint-disable-next-line
        const diff = Date.now() - timestamp;
        if (diff < 60000) return 'Ahora';
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        return '1d+';
    };

    // --- CONFIGURATION BY TYPE ---
    const getConfig = () => {
        if (item.pinned) return {
            color: 'text-amber-400',
            bg: 'bg-amber-400',
            label: 'Keep',
            icon: <Lock size={14} className="text-amber-950" fill="currentColor" />
        };

        switch (item.type) {
            case 'image':
                return {
                    color: 'text-orange-400',
                    bg: 'bg-orange-400',
                    label: 'Image',
                    icon: <ImageIcon size={14} className="text-orange-950" />
                };
            case 'file':
                return {
                    color: 'text-blue-400',
                    bg: 'bg-blue-400',
                    label: 'File',
                    icon: <File size={14} className="text-blue-950" />
                };
            case 'text':
            case 'rtf':
            case 'html':
                if (item.metadata?.openGraphValues?.title || item.content.startsWith('http')) {
                    return {
                        color: 'text-rose-400',
                        bg: 'bg-rose-400',
                        label: 'Link',
                        icon: <Globe size={14} className="text-rose-950" />
                    };
                }
                return {
                    color: 'text-emerald-400',
                    bg: 'bg-emerald-400',
                    label: 'Text',
                    icon: <Type size={14} className="text-emerald-950" />
                };
            default:
                return {
                    color: 'text-neutral-400',
                    bg: 'bg-neutral-400',
                    label: 'Item',
                    icon: <Copy size={14} className="text-neutral-950" />
                };
        }
    };

    const config = getConfig();
    const isLink = !!item.metadata?.openGraphValues?.title || item.content.startsWith('http');

    // --- RENDER VARIANTS ---

    const renderBody = () => {
        // 1. IMAGE VARIANT
        if (item.type === 'image' || (item.preview && item.type !== 'file')) {
            return (
                <div className="w-full h-full relative group/image bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
                    {item.preview ? (
                        <img
                            src={item.preview}
                            alt="Preview"
                            className="w-full h-full object-cover opacity-90 group-hover/card:opacity-100 transition-opacity duration-500"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'bg-neutral-800');
                                // Force fallback display
                            }}
                        />
                    ) : null}
                    {/* Fallback Label if image missing/hidden */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -z-0">
                        <ImageIcon size={32} className="text-white/10 mb-2" />
                        <span className="text-white/20 font-black text-xs tracking-[0.2em]">IMG</span>
                    </div>
                </div>
            );
        }

        // 2. LINK VARIANT
        if (isLink && item.metadata?.openGraphValues) {
            const og = item.metadata.openGraphValues;
            return (
                <div className="flex flex-col h-full w-full bg-[#1A1A1A]">
                    {/* OG Image Part */}
                    <div className="h-[60%] w-full relative overflow-hidden bg-black/40 border-b border-white/5">
                        {og.image ? (
                            <img src={og.image} className="w-full h-full object-cover opacity-80 group-hover/card:scale-105 transition-transform duration-700" alt="OG" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Globe size={32} className={cn("opacity-20", config.color)} />
                            </div>
                        )}
                    </div>
                    {/* Meta Part */}
                    <div className="h-[40%] p-3 flex flex-col justify-center bg-gradient-to-t from-black/60 to-transparent">
                        <span className="text-white font-bold text-[11px] leading-tight line-clamp-2 mb-1">
                            {og.title || item.content}
                        </span>
                        <span className={cn("text-[9px] truncate opacity-60 font-medium", config.color)}>
                            {og.url ? new URL(og.url).hostname : 'Enlace web'}
                        </span>
                    </div>
                </div>
            );
        }

        // 3. FILE VARIANT
        if (item.type === 'file' || item.preview) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 relative bg-[#18181b]">
                    {item.preview ? (
                        <div className="w-16 h-16 mb-3 rounded-lg overflow-hidden shadow-lg ring-1 ring-white/10 bg-white">
                            <img src={item.preview} className="w-full h-full object-cover" alt="File" />
                        </div>
                    ) : (
                        <div className={cn("w-14 h-14 mb-3 rounded-xl flex items-center justify-center bg-white/5", config.color)}>
                            <File size={28} />
                        </div>
                    )}
                    <span className="text-white/90 font-medium text-[10px] text-center line-clamp-2 px-2 leading-relaxed">
                        {item.content}
                    </span>
                    <div className="absolute top-2 right-2">
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/50 border border-white/5">
                            {item.content.split('.').pop()?.toUpperCase() || 'FILE'}
                        </span>
                    </div>
                </div>
            );
        }

        // 4. TEXT VARIANT (Default)
        return (
            <div className="w-full h-full p-4 flex flex-col bg-[#1A1A1A]">
                <p className={cn(
                    "text-[11px] leading-relaxed break-words whitespace-pre-wrap font-mono tracking-tight",
                    item.pinned ? "text-white/90" : "text-neutral-400 group-hover/card:text-neutral-300 transition-colors"
                )}>
                    {item.content.substring(0, 180)}
                </p>
                {/* Fade out at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#1A1A1A] to-transparent pointer-events-none" />
            </div>
        );
    };


    // --- MAIN RENDER ---
    return (
        <div
            onClick={onClick}
            className={cn(
                "group/card relative flex flex-col w-full aspect-square rounded-[22px] overflow-hidden cursor-pointer select-none",
                "bg-[#1e1e1e] shadow-xl backdrop-blur-md transition-all duration-300",
                isActive
                    ? "ring-[3px] ring-white shadow-[0_10px_40px_-10px_rgba(255,255,255,0.2)] scale-[1.02] z-20"
                    : "hover:scale-[1.01] hover:shadow-2xl border border-white/5 hover:border-white/10 opacity-90 hover:opacity-100",
                item.pinned && !isActive ? "ring-1 ring-amber-400/40" : ""
            )}
        >
            {/* 1. HEADER (Compact, Identifiable) */}
            <div className="h-[36px] px-3 flex items-center justify-between shrink-0 bg-[#252525] border-b border-white/5 relative z-10">
                <div className="flex items-center gap-2">
                    <div className={cn("w-5 h-5 rounded-md flex items-center justify-center shadow-sm", config.bg)}>
                        {config.icon}
                    </div>
                    <span className={cn("text-[10px] font-bold tracking-wide uppercase", config.color)}>
                        {config.label}
                    </span>
                </div>

                {/* Right side actions - Visible on hover or active */}
                <div className="flex gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
                    <button
                        onClick={(e) => { e.stopPropagation(); window.electronAPI?.togglePin(item.id); }}
                        className={cn("p-1 rounded bg-white/10 hover:bg-white/20 transition-colors", item.pinned ? "text-amber-400" : "text-neutral-400")}
                    >
                        <Lock size={10} fill={item.pinned ? "currentColor" : "none"} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(item.id, item.content); }}
                        className="p-1 rounded bg-white/10 hover:bg-white/20 text-neutral-400 transition-colors"
                    >
                        <Edit2 size={10} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); window.electronAPI.deleteItem(item.id); }}
                        className="p-1 rounded bg-white/10 hover:bg-red-500/80 text-neutral-400 hover:text-white transition-colors"
                    >
                        <Trash2 size={10} />
                    </button>
                </div>
            </div>

            {/* 2. BODY (Main Content) */}
            <div className="flex-1 min-h-0 w-full relative">
                {renderBody()}
            </div>

            {/* 3. FOOTER (Metadata) */}
            <div className="h-[28px] px-3 flex items-center justify-between shrink-0 bg-[#151515] border-t border-white/5 text-[9px] font-medium text-neutral-500">
                <span>
                    {item.type === 'image' && item.metadata?.width
                        ? `${item.metadata.width}x${item.metadata.height}px`
                        : `${item.content.length} chars`
                    }
                </span>
                <span className="opacity-60">{getTimeAgo(item.timestamp)}</span>
            </div>

            {/* pinned Glow overlay (ambient) */}
            {item.pinned && (
                <div className="absolute inset-0 rounded-[22px] pointer-events-none ring-1 ring-inset ring-amber-400/20 shadow-[inset_0_0_20px_rgba(251,191,36,0.05)] z-20" />
            )}
        </div>
    );
}
