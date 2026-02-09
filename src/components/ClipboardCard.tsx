import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
    Lock, Edit2, Trash2, Link, FileText, Image as ImageIcon
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

// --- Utility Functions ---

const cn = (...inputs: (string | undefined | null | false)[]) => twMerge(clsx(inputs));

const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

// --- Theme Logic ---

const getOriginTheme = (item: ClipboardItem) => {
    // 1. Pinned (Overrides everything)
    if (item.pinned) return {
        container: "bg-[#252525] border-amber-500/50",
        headerBg: "!bg-amber-500", // FORCE SOLID
        headerStyle: { backgroundColor: '#f59e0b' },
        headerText: "text-black",
        active: "ring-2 ring-amber-500 shadow-2xl scale-[1.02]",
        iconColor: "text-black",
        label: "Pinned",
        subTextColor: "text-neutral-400",
        gradient: "from-amber-500/10 to-transparent"
    };

    // 2. Origins (Refined Palettes)
    const url = item.metadata?.openGraphValues?.url || (item.type === 'text' && item.content.startsWith('http') ? item.content : null);

    if (url) {
        try {
            const domain = new URL(url).hostname.toLowerCase();

            if (domain.includes('google.com')) return {
                container: "bg-[#202124] border-blue-500/20",
                headerBg: "!bg-blue-600",
                headerStyle: { backgroundColor: '#2563eb' },
                headerText: "text-white",
                active: "ring-2 ring-blue-500 shadow-xl",
                iconColor: "text-white",
                label: "Google",
                subTextColor: "text-neutral-400",
                gradient: "from-blue-500/10 to-transparent"
            };
            if (domain.includes('github.com')) return {
                container: "bg-[#0d1117] border-neutral-500/20",
                headerBg: "!bg-neutral-800",
                headerStyle: { backgroundColor: '#262626' },
                headerText: "text-white",
                active: "ring-2 ring-white/50 shadow-xl",
                iconColor: "text-white",
                label: "GitHub",
                subTextColor: "text-neutral-400",
                gradient: "from-white/5 to-transparent"
            };
            if (domain.includes('youtube.com') || domain.includes('youtu.be')) return {
                container: "bg-[#1f1010] border-red-500/20",
                headerBg: "!bg-red-600",
                headerStyle: { backgroundColor: '#dc2626' },
                headerText: "text-white",
                active: "ring-2 ring-red-500 shadow-xl",
                iconColor: "text-white",
                label: "YouTube",
                subTextColor: "text-neutral-400",
                gradient: "from-red-500/10 to-transparent"
            };
            if (domain.includes('figma.com')) return {
                container: "bg-[#1e1e1e] border-purple-500/20",
                headerBg: "!bg-purple-600",
                headerStyle: { backgroundColor: '#9333ea' },
                headerText: "text-white",
                active: "ring-2 ring-purple-500 shadow-xl",
                iconColor: "text-white",
                label: "Figma",
                subTextColor: "text-neutral-400",
                gradient: "from-purple-500/10 to-transparent"
            };
            if (domain.includes('notion.so')) return {
                container: "bg-[#fffefc] border-neutral-300",
                headerBg: "!bg-neutral-800",
                headerStyle: { backgroundColor: '#262626' },
                headerText: "text-white",
                active: "ring-2 ring-neutral-400 shadow-xl",
                iconColor: "text-white",
                label: "Notion",
                subTextColor: "text-neutral-500",
                gradient: "from-neutral-500/5 to-transparent"
            };
        } catch (e) {
            // Invalid URL, fall through
        }
    }

    // 3. Types (Default Fallbacks - Vivid Solid Headers)
    switch (item.type) {
        case 'image': return {
            container: "bg-neutral-900 border-purple-500/20",
            headerBg: "!bg-purple-600",
            headerStyle: { backgroundColor: '#9333ea' },
            headerText: "text-white",
            active: "ring-2 ring-purple-500 shadow-xl",
            iconColor: "text-white",
            label: "Image",
            subTextColor: "text-neutral-400",
            gradient: "from-purple-500/10 to-transparent"
        };
        case 'rtf':
        case 'html':
        case 'text': return {
            container: "bg-neutral-900 border-blue-500/20",
            headerBg: "!bg-blue-600",
            headerStyle: { backgroundColor: '#2563eb' },
            headerText: "text-white",
            active: "ring-2 ring-blue-500 shadow-xl",
            iconColor: "text-white",
            label: item.type === 'text' ? "Text" : (item.type === 'html' ? "HTML" : "Rich Text"),
            subTextColor: "text-neutral-400",
            gradient: "from-blue-500/10 to-transparent"
        };
        case 'file': return {
            container: "bg-neutral-900 border-emerald-500/20",
            headerBg: "!bg-emerald-600",
            headerStyle: { backgroundColor: '#059669' },
            headerText: "text-white",
            active: "ring-2 ring-emerald-500 shadow-xl",
            iconColor: "text-white",
            label: "File",
            subTextColor: "text-neutral-400",
            gradient: "from-emerald-500/10 to-transparent"
        };
        default: return {
            container: "bg-neutral-900 border-white/10",
            headerBg: "!bg-neutral-700",
            headerStyle: { backgroundColor: '#404040' },
            headerText: "text-white",
            active: "ring-2 ring-white/30 shadow-xl",
            iconColor: "text-white",
            label: "Unknown",
            subTextColor: "text-neutral-400",
            gradient: "from-white/5 to-transparent"
        };
    }
};

// --- Sub-Components ---

// 1. Card Shell: Super Rounded Container
const CardShell = ({ children, isActive, theme, onClick }: { children: React.ReactNode, isActive: boolean, theme: ReturnType<typeof getOriginTheme>, onClick: () => void }) => (
    <div
        onClick={onClick}
        className={cn(
            "group relative flex flex-col w-full h-full rounded-[24px] overflow-hidden cursor-pointer transition-all duration-300 ease-out",
            isActive ? theme.active : "border border-white/5 hover:border-white/10 hover:shadow-xl hover:-translate-y-1",
            theme.container
        )}
    >
        {children}
    </div>
);

// 2. Card Header: Solid Colored Top Bar
const CardHeader = ({ item, theme, onEdit }: { item: ClipboardItem, theme: ReturnType<typeof getOriginTheme>, onEdit: (id: string, c: string) => void }) => {
    const handlePin = (e: React.MouseEvent) => {
        e.stopPropagation();
        window.electronAPI?.togglePin(item.id);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete item?')) window.electronAPI?.deleteItem(item.id);
    };

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit(item.id, item.content);
    };

    // Icon logic
    let Icon = FileText;
    if (item.type === 'image') Icon = ImageIcon;
    else if (item.metadata?.openGraphValues?.title || (item.type === 'text' && item.content.startsWith('http'))) Icon = Link;
    else if (item.type === 'file') Icon = FileText;

    return (
        <div className={cn("flex items-center justify-between px-4 py-2 shrinks-0 h-10 select-none", theme.headerBg)} style={theme.headerStyle}>
            {/* Icon & Label */}
            <div className="flex items-center gap-2">
                <Icon size={14} className={cn("opacity-90", theme.headerText)} />
                <span className={cn("text-[11px] font-bold tracking-wide uppercase opacity-90", theme.headerText)}>
                    {theme.label}
                </span>
            </div>

            {/* Actions (Distinct Colors & Rounded) */}
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                    onClick={handlePin}
                    className="p-1.5 rounded-full bg-amber-500/20 text-amber-100 hover:bg-amber-500 hover:text-white transition-all shadow-sm backdrop-blur-md"
                    title="Pin"
                >
                    <Lock size={11} fill={item.pinned ? "currentColor" : "none"} />
                </button>
                <button
                    onClick={handleEditClick}
                    className="p-1.5 rounded-full bg-blue-500/20 text-blue-100 hover:bg-blue-500 hover:text-white transition-all shadow-sm backdrop-blur-md"
                    title="Edit"
                >
                    <Edit2 size={11} />
                </button>
                <button
                    onClick={handleDelete}
                    className="p-1.5 rounded-full bg-red-500/20 text-red-100 hover:bg-red-500 hover:text-white transition-all shadow-sm backdrop-blur-md"
                    title="Delete"
                >
                    <Trash2 size={11} />
                </button>
            </div>
        </div>
    );
};

// 3. Card Footer: Metadata (Dark)
const CardFooter = ({ item, theme }: { item: ClipboardItem, theme: ReturnType<typeof getOriginTheme> }) => (
    <div className="px-4 pb-3 pt-2 flex items-center justify-between mt-auto border-t border-white/5 bg-black/10">
        <span className={cn("text-[10px] font-medium opacity-60", theme.subTextColor)}>
            {formatTime(item.timestamp)}
        </span>
        {item.type === 'text' && (
            <span className="text-[9px] font-mono text-neutral-500 bg-white/5 px-1.5 py-0.5 rounded">
                {(item.content.length / 1024).toFixed(1)}KB
            </span>
        )}
    </div>
);

// --- Content Variants ---

type CardContentProps = {
    item: ClipboardItem;
    theme: ReturnType<typeof getOriginTheme>;
};

const TextCard = ({ item, theme: _theme }: CardContentProps) => (
    <div className="flex-1 px-4 py-3 overflow-hidden relative bg-neutral-900/50">
        <div className="text-[11px] font-mono leading-relaxed line-clamp-[6] whitespace-pre-wrap break-all text-neutral-300">
            {item.content}
        </div>
        {/* Fade Out */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-neutral-900 to-transparent pointer-events-none" />
    </div>
);

const ImageCard = ({ item, theme: _theme }: CardContentProps) => (
    <div className="flex-1 bg-black/50 relative group overflow-hidden flex items-center justify-center p-2">
        <div className="absolute inset-0 pattern-grid opacity-10" />
        <img
            src={item.preview || item.content}
            className="max-w-full max-h-full object-contain rounded-md shadow-sm"
            alt="Clipboard Image"
        />
    </div>
);

const LinkCard = ({ item, theme: _theme }: CardContentProps) => {
    const og = item.metadata?.openGraphValues;
    return (
        <div className="flex-1 flex flex-col p-3 bg-neutral-900/30">
            <div className="flex-1 bg-black/40 rounded-lg overflow-hidden border border-white/5 flex flex-col">
                {og?.image ? (
                    <div className="h-full w-full relative bg-neutral-800">
                        <img src={og.image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="OG" />
                    </div>
                ) : (
                    <div className="h-full w-full flex items-center justify-center bg-white/5">
                        <Link size={24} className="text-neutral-600 opacity-50" />
                    </div>
                )}
            </div>
            <div className="mt-2">
                <h4 className="text-[11px] font-bold line-clamp-1 text-neutral-200">
                    {og?.title || "Link"}
                </h4>
                <p className="text-[10px] truncate text-neutral-500 opacity-80">
                    {og?.url || item.content}
                </p>
            </div>
        </div>
    );
};

const FileCard = ({ item, theme }: CardContentProps) => (
    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-neutral-900/50">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 bg-white/5 border border-white/10 shadow-inner">
            <FileText size={24} className={theme.subTextColor} />
        </div>
        <span className="text-[11px] font-medium text-center line-clamp-2 px-2 text-neutral-300">
            {item.content}
        </span>
    </div>
);


// --- Main Component ---

export const ClipboardCard = ({ item, isActive, onClick, onEdit }: { item: ClipboardItem, isActive: boolean, onClick: () => void, onEdit: (id: string, c: string) => void }) => {
    const theme = getOriginTheme(item);

    let Content: React.FC<CardContentProps> = TextCard;
    if (item.type === 'image') Content = ImageCard;
    else if (item.type === 'file') Content = FileCard;
    else if (item.metadata?.openGraphValues?.title || (item.type === 'text' && item.content.startsWith('http'))) Content = LinkCard;

    if (!theme) return null;

    return (
        <CardShell isActive={isActive} theme={theme} onClick={onClick}>
            <CardHeader item={item} theme={theme} onEdit={onEdit} />
            <Content item={item} theme={theme} />
            <CardFooter item={item} theme={theme} />
        </CardShell>
    );
};
