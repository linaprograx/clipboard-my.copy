import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
    Lock, Edit2, Trash2, Link, FileText, Image as ImageIcon,
    Calendar
} from 'lucide-react';

// --- Types ---

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

// --- Utility Functions ---

const cn = (...inputs: (string | undefined | null | false)[]) => twMerge(clsx(inputs));

const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'ahora';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
};

// --- Sub-Components ---

// 1. Card Shell: Handles the container, border, shadow, animations
const CardShell = ({ children, isActive, isPinned, onClick }: { children: React.ReactNode, isActive: boolean, isPinned: boolean, onClick: () => void }) => (
    <div
        onClick={onClick}
        className={cn(
            "group relative flex flex-col w-full h-full rounded-[20px] overflow-hidden cursor-pointer transition-all duration-300",
            // Base styles
            "bg-[#1c1c1e] border",
            // Active State
            isActive
                ? "border-amber-400/50 shadow-[0_0_30px_rgba(251,191,36,0.15)] scale-[1.02] z-10"
                : "border-white/5 hover:border-white/10 hover:bg-[#252527] hover:scale-[1.01]",
            // Pinned State (Subtle ring if not active)
            isPinned && !isActive ? "ring-1 ring-amber-500/20" : ""
        )}
    >
        {children}
    </div>
);

// 2. Card Header: Icon, Type Label, Actions
const CardHeader = ({ item, onEdit }: { item: ClipboardItem, onEdit: (id: string, c: string) => void }) => {
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("¿Borrar elemento?")) window.electronAPI?.deleteItem(item.id);
    };

    const handlePin = (e: React.MouseEvent) => {
        e.stopPropagation();
        window.electronAPI?.togglePin(item.id);
    };



    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit(item.id, item.content);
    };

    // Determine Icon & Label
    let Icon = FileText;
    let label = "Texto";
    let colorClass = "text-blue-400";
    let bgClass = "bg-blue-500/10";

    if (item.type === 'image') {
        Icon = ImageIcon;
        label = "Imagen";
        colorClass = "text-purple-400";
        bgClass = "bg-purple-500/10";
    } else if (item.metadata?.openGraphValues?.title) {
        Icon = Link;
        label = "Enlace";
        colorClass = "text-orange-400";
        bgClass = "bg-orange-500/10";
    } else if (item.type === 'file') {
        Icon = FileText; // Or a FileIcon if we had one specific
        label = "Archivo";
        colorClass = "text-emerald-400";
        bgClass = "bg-emerald-500/10";
    }

    if (item.pinned) {
        colorClass = "text-amber-400";
        bgClass = "bg-amber-500/10";
    }

    return (
        <div className="flex items-center justify-between px-3 py-2.5 shrink-0 border-b border-white/5 bg-black/20">
            {/* Left: Icon & Label */}
            <div className="flex items-center gap-2">
                <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", bgClass)}>
                    <Icon size={12} className={colorClass} />
                </div>
                <span className={cn("text-[10px] font-bold tracking-wide uppercase opacity-70", colorClass)}>
                    {item.pinned ? "Fijado" : label}
                </span>
            </div>

            {/* Right: Actions (Visible on Hover/Active) */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={handlePin} className={cn("p-1 rounded hover:bg-white/10", item.pinned ? "text-amber-400" : "text-white/40")}>
                    <Lock size={12} fill={item.pinned ? "currentColor" : "none"} />
                </button>
                <button onClick={handleEditClick} className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white">
                    <Edit2 size={12} />
                </button>
                <button onClick={handleDelete} className="p-1 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400">
                    <Trash2 size={12} />
                </button>
            </div>
            {/* Always visible copy/options trigger if needed, or just timestamp? */}
        </div>
    );
};

// 3. Card Footer: Metadata
const CardFooter = ({ item }: { item: ClipboardItem }) => (
    <div className="flex items-center justify-between px-3 py-2 mt-auto border-t border-white/5 bg-black/10">
        <span className="text-[9px] font-medium text-white/30 flex items-center gap-1">
            <Calendar size={8} />
            {getTimeAgo(item.timestamp)}
        </span>
        <span className="text-[9px] font-mono text-white/20">
            {item.type === 'text' ? `${item.content.length} chars` :
                item.type === 'image' && item.metadata?.width ? `${item.metadata.width}x${item.metadata.height}` : ''}
        </span>
    </div>
);

// --- Content Variants ---

const TextCard = ({ item }: { item: ClipboardItem }) => (
    <div className="p-3 flex-1 overflow-hidden relative">
        <p className={cn(
            "text-[11px] leading-relaxed text-gray-300 break-words font-mono line-clamp-[6]",
            "mask-linear-fade" // Assuming this CSS class exists or we allow overflow hidden logic
        )}>
            {item.content}
        </p>
    </div>
);

const ImageCard = ({ item }: { item: ClipboardItem }) => (
    <div className="flex-1 w-full h-full relative bg-black/50 overflow-hidden flex items-center justify-center p-0">
        {item.preview ? (
            <img
                src={item.preview}
                alt="Preview"
                className="w-full h-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.querySelector('.fallback')?.classList.remove('hidden');
                }}
            />
        ) : null}

        {/* Fallback (Hidden by default unless error/no preview) */}
        <div className={cn("fallback flex flex-col items-center justify-center absolute inset-0", item.preview ? "hidden" : "")}>
            <ImageIcon size={24} className="text-white/20 mb-1" />
            <span className="text-[9px] text-white/20 font-bold uppercase tracking-widest">IMG</span>
        </div>
    </div>
);

const LinkCard = ({ item }: { item: ClipboardItem }) => {
    const og = item.metadata?.openGraphValues;
    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Image Region (60%) */}
            {og?.image ? (
                <div className="h-[60%] w-full relative bg-black/50">
                    <img
                        src={og.image}
                        className="w-full h-full object-cover opacity-80"
                        alt="OG"
                    />
                </div>
            ) : (
                <div className="h-[60%] w-full bg-gradient-to-br from-orange-500/10 to-transparent flex items-center justify-center">
                    <Link size={24} className="text-orange-500/30" />
                </div>
            )}

            {/* Content Region (40%) */}
            <div className="flex-1 p-2.5 flex flex-col justify-center bg-[#18181b]">
                <h4 className="text-[10px] font-bold text-gray-200 line-clamp-1 leading-tight mb-0.5">
                    {og?.title || "Enlace Desconocido"}
                </h4>
                <p className="text-[9px] text-gray-500 truncate font-mono">
                    {og?.url || item.content}
                </p>
            </div>
        </div>
    );
};

const FileCard = ({ item }: { item: ClipboardItem }) => (
    <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3 bg-neutral-900/50">

        {/* Preview or Icon */}
        <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner overflow-hidden relative">
            {item.preview ? (
                <img src={item.preview} className="w-full h-full object-cover" alt="File" />
            ) : (
                <FileText size={24} className="text-emerald-500/50" />
            )}
        </div>

        <div className="text-center w-full">
            <p className="text-[10px] font-medium text-gray-300 truncate w-full px-2">
                {item.content}
            </p>
            <span className="text-[8px] text-gray-500 uppercase tracking-wider font-bold mt-1 block">
                {item.content.split('.').pop() || 'FILE'}
            </span>
        </div>
    </div>
);

// --- Main Component ---

export function ClipboardCard({ item, isActive, onClick, onEdit }: ClipboardCardProps) {
    let Content = TextCard;

    if (item.type === 'image') {
        Content = ImageCard;
    } else if (item.metadata?.openGraphValues?.title) {
        Content = LinkCard;
    } else if (item.type === 'file') {
        Content = FileCard;
    }

    return (
        <CardShell isActive={isActive} isPinned={item.pinned} onClick={onClick}>
            {item.type !== 'image' && <CardHeader item={item} onEdit={onEdit} />}
            {/* Images get full bleed, no header? Or maybe overlay header? 
                 Let's keep standard header for consistency for now, or maybe make it overlay for images?
                 Plan said "Full-bleed or maximized thumbnail". 
                 Let's try: No header for images, just the full image, and actions overlay.
              */}
            {item.type === 'image' ? (
                <>
                    <ImageCard item={item} />
                    {/* Overlay Header/Actions for Image */}
                    <div className="absolute top-0 left-0 w-full p-2 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
                        <span className="bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-bold text-white/80 uppercase tracking-widest border border-white/10">IMG</span>
                        <div className="pointer-events-auto flex gap-1">
                            <button onClick={(e) => { e.stopPropagation(); window.electronAPI?.togglePin(item.id); }} className="p-1 rounded-full bg-black/40 hover:bg-black/60 text-white/60 hover:text-amber-400 backdrop-blur-md">
                                <Lock size={10} fill={item.pinned ? "currentColor" : "none"} />
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <Content item={item} />
            )}

            {item.type !== 'image' && !item.metadata?.openGraphValues?.title && <CardFooter item={item} />}
        </CardShell>
    );
}
