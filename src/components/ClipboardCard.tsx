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

// --- Theme Logic ---

const getOriginTheme = (item: ClipboardItem) => {
    // 1. Try to get domain from OpenGraph URL or Content if it's a link
    const url = item.metadata?.openGraphValues?.url || (item.type === 'text' && item.content.startsWith('http') ? item.content : null);

    // Future: Check 'sourceApp' if we had it. For now, rely on URL.

    if (!url) return null;

    try {
        const domain = new URL(url).hostname.toLowerCase();

        // Google
        if (domain.includes('google.com')) return {
            container: "bg-white/95 border-neutral-300 shadow-sm",
            active: "border-blue-500 ring-2 ring-blue-500/20 bg-white",
            iconColor: "text-neutral-600",
            badgeBg: "bg-neutral-200",
            label: "Google",
            textColor: "text-neutral-900",
            subTextColor: "text-neutral-500",
            gradient: "from-blue-500/5 to-transparent"
        };

        // YouTube
        if (domain.includes('youtube.com') || domain.includes('youtu.be')) return {
            container: "bg-[#1f0505] border-red-500/30",
            active: "border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)] bg-[#2b0a0a]",
            iconColor: "text-red-500",
            badgeBg: "bg-red-500/20",
            label: "YouTube",
            textColor: "text-white",
            subTextColor: "text-red-200/70",
            gradient: "from-red-600/20 to-transparent"
        };

        // Figma
        if (domain.includes('figma.com')) return {
            container: "bg-[#1e1e1e] border-purple-500/40",
            active: "border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.3)] bg-[#2c2c2c]",
            iconColor: "text-purple-400",
            badgeBg: "bg-purple-500/20",
            label: "Figma",
            textColor: "text-white",
            subTextColor: "text-gray-400",
            gradient: "from-purple-600/20 to-transparent"
        };

        // GitHub
        if (domain.includes('github.com')) return {
            container: "bg-[#0d1117] border-neutral-600",
            active: "border-white/50 shadow-[0_0_30px_rgba(255,255,255,0.1)] bg-[#161b22]",
            iconColor: "text-white",
            badgeBg: "bg-white/10",
            label: "GitHub",
            textColor: "text-white",
            subTextColor: "text-gray-400",
            gradient: "from-white/5 to-transparent"
        };

        // Notion
        if (domain.includes('notion.so')) return {
            container: "bg-[#fffefc] border-neutral-300 shadow-sm", // Notion-ish white
            active: "border-neutral-400 ring-2 ring-neutral-500/10 bg-white",
            iconColor: "text-neutral-700",
            badgeBg: "bg-neutral-200",
            label: "Notion",
            textColor: "text-neutral-900",
            subTextColor: "text-neutral-500",
            gradient: "from-neutral-500/5 to-transparent"
        };

    } catch (e) {
        // invalid url, ignore
    }
    return null;
};

const getItemTheme = (item: ClipboardItem) => {
    // 1. Pinned (Overrides everything)
    if (item.pinned) return {
        container: "bg-amber-900/10 border-amber-500/50",
        active: "border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.3)] bg-amber-900/20",
        iconColor: "text-amber-500",
        badgeBg: "bg-amber-500/20",
        label: "Fijado",
        textColor: "text-amber-100",
        subTextColor: "text-amber-500/70",
        gradient: "from-amber-500/20 to-transparent"
    };

    // 2. Check Origin
    const originTheme = getOriginTheme(item);
    if (originTheme) return originTheme;

    // 3. Fallback to Type-based Themes
    switch (item.type) {
        case 'image': return {
            container: "bg-indigo-950/30 border-indigo-500/40",
            active: "border-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.3)] bg-indigo-900/40",
            iconColor: "text-indigo-400",
            badgeBg: "bg-indigo-500/20",
            label: "Imagen",
            textColor: "text-gray-200",
            subTextColor: "text-indigo-300/70",
            gradient: "from-indigo-600/20 to-transparent"
        };
        case 'file': return {
            container: "bg-orange-950/30 border-orange-500/40",
            active: "border-orange-400 shadow-[0_0_30px_rgba(249,115,22,0.3)] bg-orange-900/40",
            iconColor: "text-orange-400",
            badgeBg: "bg-orange-500/20",
            label: "Archivo",
            textColor: "text-gray-200",
            subTextColor: "text-orange-300/70",
            gradient: "from-orange-600/20 to-transparent"
        };
        case 'text':
            if (item.metadata?.openGraphValues?.title) return { // Generic Link
                container: "bg-emerald-950/30 border-emerald-500/40",
                active: "border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] bg-emerald-900/40",
                iconColor: "text-emerald-400",
                badgeBg: "bg-emerald-500/20",
                label: "Enlace",
                textColor: "text-gray-200",
                subTextColor: "text-emerald-300/70",
                gradient: "from-emerald-600/20 to-transparent"
            };
            // Default Text
            return {
                container: "bg-[#252528] border-white/10",
                active: "border-white/60 shadow-[0_0_20px_rgba(255,255,255,0.1)] bg-[#2a2a2d]",
                iconColor: "text-neutral-400",
                badgeBg: "bg-white/10",
                label: "Texto",
                textColor: "text-gray-300",
                subTextColor: "text-gray-500",
                gradient: "from-white/5 to-transparent"
            };
        default: return {
            container: "bg-red-900/20 border-red-500/40",
            active: "border-red-400",
            iconColor: "text-red-500",
            badgeBg: "bg-red-500/20",
            label: "Desconocido",
            textColor: "text-gray-200",
            subTextColor: "text-gray-500",
            gradient: "from-red-500/20 to-transparent"
        };
    }
};

// --- Sub-Components ---

// 1. Card Shell: Handles the container, border, shadow, animations
const CardShell = ({ children, isActive, theme, onClick }: { children: React.ReactNode, isActive: boolean, theme: ReturnType<typeof getItemTheme>, onClick: () => void }) => (
    <div
        onClick={onClick}
        className={cn(
            "group relative flex flex-col w-full h-full rounded-[20px] overflow-hidden cursor-pointer transition-all duration-300",
            "border-2", // Base border width
            // Apply base container styles (background + border color)
            // isActive ? theme.active : theme.container, // This line is removed as styles are now inline

            // Active State Enhancements (Scale, Z-Index)
            isActive
                ? "scale-[1.02] z-10"
                : "hover:scale-[1.01] hover:brightness-105",
            // Dynamic classes
            isActive ? theme.active : theme.container,
        )}
    >
        {/* Gradient Hint */}
        {isActive && <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none opacity-100", theme.gradient)} />}
        {!isActive && <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500", theme.gradient)} />}

        {/* Content Container */}
        <div className="relative z-10 flex flex-col w-full h-full">
            {children}
        </div>
    </div>
);

// 2. Card Header: Icon, Type Label, Actions
const CardHeader = ({ item, theme, onEdit }: { item: ClipboardItem, theme: ReturnType<typeof getItemTheme>, onEdit: (id: string, c: string) => void }) => {
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

    // Icon logic
    let Icon = FileText;
    if (item.type === 'image') Icon = ImageIcon;
    else if (item.metadata?.openGraphValues?.title) Icon = Link;
    else if (item.type === 'file') Icon = FileText;

    return (
        <div className={cn("flex items-center justify-between px-3 py-2.5 shrink-0 border-b", theme.container?.includes('bg-white') ? "border-black/5 bg-black/5" : "border-white/5 bg-black/20")}>
            {/* Left: Icon & Label */}
            <div className="flex items-center gap-2">
                <div className={cn("w-6 h-6 rounded-md flex items-center justify-center transition-colors", theme.badgeBg)}>
                    <Icon size={12} className={theme.iconColor} />
                </div>
                <span className={cn("text-[10px] font-bold tracking-wide uppercase opacity-90 transition-colors", theme.iconColor)}>
                    {theme.label}
                </span>
            </div>

            {/* Right: Actions (Visible on Hover/Active) */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={handlePin} className={cn("p-1 rounded transition-colors", item.pinned ? "text-amber-400 hover:bg-amber-500/10" : theme.subTextColor ? theme.subTextColor + " hover:text-black hover:bg-black/5" : "text-white/40 hover:text-white hover:bg-white/10")}>
                    <Lock size={12} fill={item.pinned ? "currentColor" : "none"} />
                </button>
                <button onClick={handleEditClick} className={cn("p-1 rounded transition-colors", theme.subTextColor ? theme.subTextColor + " hover:text-black hover:bg-black/5" : "text-white/40 hover:text-white hover:bg-white/10")}>
                    <Edit2 size={12} />
                </button>
                <button onClick={handleDelete} className="p-1 rounded hover:bg-red-500/20 text-red-400/60 hover:text-red-500 transition-colors">
                    <Trash2 size={12} />
                </button>
            </div>
        </div>
    );
};

// 3. Card Footer: Metadata
const CardFooter = ({ item, theme }: { item: ClipboardItem, theme: ReturnType<typeof getItemTheme> }) => (
    <div className={cn("flex items-center justify-between px-3 py-2 mt-auto border-t border-black/5", theme.container?.includes('bg-white') ? "bg-black/5" : "bg-white/5")}>
        <span className={cn("text-[9px] font-medium flex items-center gap-1", theme.subTextColor || "text-white/30")}>
            <Calendar size={8} />
            {getTimeAgo(item.timestamp)}
        </span>
        <span className={cn("text-[9px] font-mono", theme.subTextColor || "text-white/20")}>
            {item.type === 'text' ? `${item.content.length} chars` :
                item.type === 'image' && item.metadata?.width ? `${item.metadata.width}x${item.metadata.height}` : ''}
        </span>
    </div>
);

// --- Content Variants ---

const TextCard = ({ item, theme }: { item: ClipboardItem, theme: ReturnType<typeof getItemTheme> }) => (
    <div className="p-3 flex-1 overflow-hidden relative">
        <p className={cn(
            "text-[11px] leading-relaxed break-words font-mono line-clamp-[6]",
            "mask-linear-fade",
            theme.textColor // Dynamic text color
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

const LinkCard = ({ item, theme }: { item: ClipboardItem, theme: ReturnType<typeof getItemTheme> }) => {
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
                <div className={cn("h-[60%] w-full flex items-center justify-center", theme.badgeBg)}>
                    <Link size={24} className={theme.iconColor} />
                </div>
            )}

            {/* Content Region (40%) */}
            <div className={cn("flex-1 p-2.5 flex flex-col justify-center", theme.container?.includes('bg-white') ? "bg-white" : "bg-black/20")}>
                <h4 className={cn("text-[10px] font-bold line-clamp-1 leading-tight mb-0.5", theme.textColor)}>
                    {og?.title || "Enlace Desconocido"}
                </h4>
                <p className={cn("text-[9px] truncate font-mono", theme.subTextColor)}>
                    {og?.url || item.content}
                </p>
            </div>
        </div>
    );
};

const FileCard = ({ item, theme }: { item: ClipboardItem, theme: ReturnType<typeof getItemTheme> }) => (
    <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
        {/* Preview or Icon */}
        <div className={cn("w-16 h-16 rounded-xl flex items-center justify-center shadow-inner overflow-hidden relative", theme.container?.includes('bg-white') ? "bg-black/5 border border-black/10" : "bg-white/5 border border-white/10")}>
            {item.preview ? (
                <img src={item.preview} className="w-full h-full object-cover" alt="File" />
            ) : (
                <FileText size={24} className={theme.iconColor} />
            )}
        </div>

        <div className="text-center w-full">
            <p className={cn("text-[10px] font-medium truncate w-full px-2", theme.textColor)}>
                {item.content}
            </p>
            <span className={cn("text-[8px] uppercase tracking-wider font-bold mt-1 block", theme.subTextColor)}>
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

    const theme = getItemTheme(item);



    return (
        <CardShell isActive={isActive} theme={theme} onClick={onClick}>
            {item.type !== 'image' && <CardHeader item={item} theme={theme} onEdit={onEdit} />}
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
                <Content item={item} theme={theme} />
            )}

            {item.type !== 'image' && !item.metadata?.openGraphValues?.title && <CardFooter item={item} theme={theme} />}
        </CardShell>
    );
}
