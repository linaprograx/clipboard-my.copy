import type { ClipboardItem } from '../electron';
import { FileText, Image, Code, Pin } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ClipboardCardProps {
    item: ClipboardItem;
    isActive: boolean;
    onClick: () => void;
}

export function ClipboardCard({ item, isActive, onClick }: ClipboardCardProps) {
    const cn = (...inputs: (string | undefined | null | false)[]) => twMerge(clsx(inputs));

    const getIcon = () => {
        switch (item.type) {
            case 'image': return <Image size={16} className="text-blue-400" />;
            case 'html': return <Code size={16} className="text-green-400" />;
            default: return <FileText size={16} className="text-gray-400" />;
        }
    };

    return (
        <div
            onClick={onClick}
            className={cn(
                "relative min-w-[200px] max-w-[200px] h-[180px] rounded-xl p-4 transition-all duration-200 cursor-pointer border",
                // Glassmorphism base
                "bg-white/5 backdrop-blur-md shadow-lg",
                // Active state
                isActive
                    ? "border-blue-500/50 bg-white/10 scale-105 z-10 shadow-blue-500/20"
                    : "border-white/10 hover:bg-white/10 hover:border-white/20"
            )}
        >
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <div className="p-1.5 rounded-md bg-black/20">
                    {getIcon()}
                </div>
                {item.pinned && <Pin size={14} className="text-yellow-400 fill-yellow-400 rotate-45" />}
            </div>

            {/* Content Preview */}
            <div className="h-[100px] overflow-hidden text-sm text-gray-300 font-mono break-words leading-relaxed mask-linear-fade">
                {item.preview || item.content}
            </div>

            {/* Footer Info */}
            <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {isActive && <span className="text-[10px] text-blue-400 font-bold tracking-wider">ENTER</span>}
            </div>
        </div>
    );
}
