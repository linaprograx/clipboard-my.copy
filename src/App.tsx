import { useState, useEffect, useRef } from 'react';
import { Search, Clock, Star, Copy, Image, Link, Trash2 } from 'lucide-react';
import { ClipboardCard } from './components/ClipboardCard';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Actually, since electron.d.ts exports it, we can import it if we treat it as a module.
// But usually in this setup we might just rely on the global interface.
// However, to satisfy the linter for 'ClipboardItem[]', let's redefine it cleanly or alias it if global is tricky.
// Better: Define it matching the d.ts exactly to avoid "not assignable" errors.

interface ClipboardItem {
  id: string;
  type: 'text' | 'image' | 'rtf' | 'html';
  content: string;
  preview?: string;
  timestamp: number;
  pinned: boolean;
}

export function App() {
  const [history, setHistory] = useState<ClipboardItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editingItem, setEditingItem] = useState<{ id: string, content: string } | null>(null);

  const handleEdit = (id: string, currentContent: string) => {
    setEditingItem({ id, content: currentContent });
  };

  const saveEdit = () => {
    if (editingItem && window.electronAPI) {
      window.electronAPI.updateItemContent(editingItem.id, editingItem.content);
      setEditingItem(null);
    }
  };

  const cn = (...inputs: (string | undefined | null | false)[]) => twMerge(clsx(inputs));

  // Clipboard Listener & Mock Data
  useEffect(() => {
    if (window.electronAPI) {
      // Initial Load
      window.electronAPI.getHistory().then(h => {
        setHistory(h);
      });

      // Listen for updates
      const cleanup = window.electronAPI.onClipboardUpdate((newHistory: ClipboardItem[]) => {
        setHistory(newHistory);
      });
      // Poll listener
      window.electronAPI.onClipboardChanged((newItem: ClipboardItem) => {
        console.log('[Frontend] Received Clipboard Update:', newItem.id, newItem.type);
        setHistory(prev => {
          if (prev.find(p => p.id === newItem.id)) return prev;
          return [newItem, ...prev];
        });
      });

      return cleanup;
    }
  }, []);

  const filteredHistory = history.filter(item => {
    if (activeCategory === 'pinned' && !item.pinned) return false;
    if (activeCategory === 'text' && item.type !== 'text') return false;
    if (activeCategory === 'image' && item.type !== 'image') return false;
    if (activeCategory === 'links' && !item.content.startsWith('http')) return false;
    return item.content.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Sort: Pinned first
  const sortedHistory = [...filteredHistory].sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (b.timestamp - a.timestamp));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.electronAPI?.hideWithoutPaste();
      } else if (e.key === 'ArrowRight') {
        setSelectedIndex(prev => Math.min(prev + 1, sortedHistory.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'ArrowDown') {
        setSelectedIndex(prev => Math.min(prev + 4, sortedHistory.length - 1));
      } else if (e.key === 'ArrowUp') {
        setSelectedIndex(prev => Math.max(prev - 4, 0));
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        const item = sortedHistory[selectedIndex];
        if (item) {
          navigator.clipboard.writeText(item.content);
        }
      } else if (e.key === 'Enter') {
        const item = sortedHistory[selectedIndex];
        if (item) window.electronAPI?.pasteItem(item.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sortedHistory, selectedIndex]);

  const categories = [
    { id: 'all', icon: Clock, label: 'Todo' },
    { id: 'pinned', icon: Star, label: 'Fijado' },
    { id: 'text', icon: Copy, label: 'Texto' },
    { id: 'image', icon: Image, label: 'Imágenes' },
    { id: 'links', icon: Link, label: 'Enlaces' },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-transparent font-sans overflow-hidden">

      {/* Main Content Area - Dark Paste Theme */}
      <div className="flex-1 flex flex-col h-full bg-[#1c1c1e]/95 backdrop-blur-2xl relative border-t border-white/10 shadow-[0_-1px_0_0_rgba(255,255,255,0.1)]">

        {/* Top Bar: Floating/Glassy Aesthetic */}
        <div className="h-[60px] w-full max-w-[95%] mx-auto px-4 flex items-center justify-between shrink-0 app-region-drag z-50">

          {/* Categories (Pill-shaped, centered look) */}
          <div className="flex-1 flex justify-start no-drag">
            <div className="flex items-center gap-4 p-1.5 rounded-full bg-black/20 border border-white/5 backdrop-blur-md shadow-lg w-full max-w-2xl justify-between px-6">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 px-2 py-1.5 rounded-full transition-all duration-300 text-[11px] font-semibold tracking-wide select-none whitespace-nowrap",
                    activeCategory === cat.id
                      ? "bg-white text-black shadow-md scale-105"
                      : "text-white/60 hover:text-white hover:bg-white/10"
                  )}
                >
                  <cat.icon size={13} strokeWidth={2.5} />
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Clear All Button */}
            <button
              onClick={() => {
                if (confirm('¿Borrar todo el historial?')) {
                  window.electronAPI?.clearHistory();
                }
              }}
              className="ml-4 p-2.5 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-white/40 transition-all border border-transparent hover:border-red-500/30 backdrop-blur-md"
              title="Borrar todo"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Search (Minimalist glass) */}
          <div className="w-64 ml-8 group no-drag flex justify-end">

            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white/80 transition-colors" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="w-full bg-black/20 border border-white/5 focus:border-white/20 focus:bg-black/40 rounded-full pl-9 pr-4 py-1.5 text-xs text-white placeholder:text-white/30 outline-none transition-all shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* Horizontal Scroll Content */}
        <div
          className="flex-1 overflow-x-auto overflow-y-hidden px-10 pt-2 pb-6 no-scrollbar flex items-center"
          style={{ gap: '25px' }} // Reduced gap to 25px
        >

          {sortedHistory.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-gray-500 opacity-50">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-2">
                <Copy size={24} />
              </div>
              <p className="text-xs font-medium">Portapapeles vacío</p>
            </div>
          ) : (
            sortedHistory.map((item, index) => (
              <div
                key={item.id}
                className="h-[180px] aspect-square shrink-0 transition-transform duration-300"
              >
                <ClipboardCard
                  item={item}
                  isActive={index === selectedIndex}
                  onClick={() => window.electronAPI ? window.electronAPI.pasteItem(item.id) : console.log("Click Paste", item.id)}
                  onEdit={handleEdit}
                />
              </div>
            ))
          )}
        </div>

        {/* Bottom App Region (Drag) */}
        <div className="h-3 w-full app-region-drag shrink-0 bg-transparent absolute bottom-0 left-0" />
      </div>

      {/* Edit Modal Overlay */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-[90%] max-w-md bg-[#2c2c2e] border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <h3 className="text-white font-bold text-lg">Editar Contenido</h3>
            <textarea
              value={editingItem.content}
              onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
              className="w-full h-32 bg-black/20 border border-white/5 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-white/20 resize-none"
              placeholder="Escribe aquí..."
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white shadow-lg transition-all text-sm font-bold"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
