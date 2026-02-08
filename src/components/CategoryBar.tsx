import { Plus, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CategoryBarProps {
    activeCategory: string;
    onSelectCategory: (category: string) => void;
}

export function CategoryBar({ activeCategory, onSelectCategory }: CategoryBarProps) {
    const cn = (...inputs: (string | undefined | null | false)[]) => twMerge(clsx(inputs));

    const categories = [
        { id: 'clipboard', label: 'Portapapeles', icon: 'clock' },
        { id: 'links', label: 'Enlaces útiles', icon: 'circle-red' },
        { id: 'programming', label: 'PROGRAMING', icon: 'circle-black' },
    ];

    return (
        <div className="flex items-center gap-1 p-1 bg-[#1e1e1e]/80 backdrop-blur-2xl px-2 py-1.5 rounded-full border border-white/10 shadow-2xl w-fit mx-auto select-none">
            <div className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer">
                <Search size={16} />
            </div>

            <div className="w-[1px] h-4 bg-white/10 mx-1" />

            {categories.map((cat) => (
                <button
                    key={cat.id}
                    onClick={() => onSelectCategory(cat.id)}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200",
                        activeCategory === cat.id
                            ? "bg-white/15 text-white shadow-sm ring-1 ring-white/5"
                            : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                    )}
                >
                    {/* Mock Icons for now - can use Lucide for Clock, custom for colored dots */}
                    {cat.icon === 'clock' && <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-current" />}
                    {cat.icon === 'circle-red' && <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />}
                    {cat.icon === 'circle-black' && <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />}

                    {cat.label}
                </button>
            ))}

            <button className="ml-1 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                <Plus size={16} />
            </button>
        </div>
    );
}
