
import {
    Type,
    Image as ImageIcon,
    Link,
    Clock,
    Star,
    Hash,
    Plus
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SidebarProps {
    activeCategory: string;
    onSelectCategory: (id: string) => void;
}

export function Sidebar({ activeCategory, onSelectCategory }: SidebarProps) {
    const cn = (...inputs: (string | undefined | null | false)[]) => twMerge(clsx(inputs));

    const menuItems = [
        { id: 'all', label: 'Historial', icon: Clock },
        { id: 'pinned', label: 'Fijado', icon: Star, color: 'text-amber-500' },
    ];

    const typeItems = [
        { id: 'text', label: 'Texto', icon: Type, color: 'text-blue-500' },
        { id: 'images', label: 'Imágenes', icon: ImageIcon, color: 'text-purple-500' },
        { id: 'links', label: 'Enlaces', icon: Link, color: 'text-orange-500' },
    ];

    const tags = [
        { id: 'code', label: 'Code Snippets', count: 12 },
        { id: 'emails', label: 'Emails', count: 5 },
    ];

    const SectionHeader = ({ title }: { title: string }) => (
        <h3 className="px-3 mb-2 mt-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {title}
        </h3>
    );

    const MenuItem = ({ item }: { item: any }) => {
        const Icon = item.icon;
        const isActive = activeCategory === item.id;

        return (
            <button
                onClick={() => onSelectCategory(item.id)}
                className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-left",
                    isActive
                        ? "bg-white shadow-sm ring-1 ring-black/5"
                        : "hover:bg-black/5 hover:text-gray-900"
                )}
            >
                <Icon
                    size={18}
                    className={cn(
                        "transition-colors",
                        isActive
                            ? (item.color || "text-gray-800")
                            : "text-gray-400 group-hover:text-gray-600"
                    )}
                />
                <span className={cn(
                    "text-[13px] font-medium transition-colors",
                    isActive ? "text-gray-900" : "text-gray-500 group-hover:text-gray-700"
                )}>
                    {item.label}
                </span>
            </button>
        );
    };

    return (
        <div className="w-[240px] h-full flex flex-col bg-[#1c1c1e]/90 backdrop-blur-xl border-r border-white/10 pt-8 pb-4 select-none relative z-50">
            {/* Draggable Top Region handled by App wrapper mostly, but safe to keep here too */}

            {/* User Profile - Top for easier access in Dock mode? Or Bottom? Bottom is standard. */}

            <div className="flex-1 overflow-y-auto px-4 no-scrollbar">

                {/* Main */}
                <div className="space-y-1">
                    {menuItems.map(item => <MenuItem key={item.id} item={item} />)}
                </div>

                {/* Types */}
                <SectionHeader title="Tipos" />
                <div className="space-y-1">
                    {typeItems.map(item => <MenuItem key={item.id} item={item} />)}
                </div>

                {/* Boards / Tags */}
                <SectionHeader title="Tableros" />
                <div className="space-y-1">
                    {tags.map(tag => (
                        <button
                            key={tag.id}
                            onClick={() => onSelectCategory(tag.id)}
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 group text-left",
                                activeCategory === tag.id
                                    ? "bg-white/10 shadow-sm ring-1 ring-white/5"
                                    : "hover:bg-white/5"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <Hash size={14} className={cn("transition-colors", activeCategory === tag.id ? "text-gray-200" : "text-gray-500 group-hover:text-gray-400")} />
                                <span className={cn("text-[13px] font-medium", activeCategory === tag.id ? "text-white" : "text-gray-400 group-hover:text-gray-300")}>
                                    {tag.label}
                                </span>
                            </div>
                            <span className="text-[10px] text-gray-500 font-medium bg-white/5 px-1.5 py-0.5 rounded-md">
                                {tag.count}
                            </span>
                        </button>
                    ))}

                    <button className="w-full flex items-center gap-3 px-3 py-2 mt-2 text-gray-500 hover:text-gray-300 transition-colors group">
                        <div className="w-5 h-5 rounded-lg border border-dashed border-gray-600 group-hover:border-gray-400 flex items-center justify-center">
                            <Plus size={12} />
                        </div>
                        <span className="text-[12px] font-medium">Nuevo Tablero</span>
                    </button>
                </div>

            </div>

            {/* Simple Footer */}
            <div className="px-6 py-4 mt-auto border-t border-white/5">
                <div className="flex items-center gap-3 opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 border border-white/10 shadow-sm" />
                    <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-white">Lian Alviz</span>
                        <span className="text-[10px] text-gray-500">Pro Plan</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
