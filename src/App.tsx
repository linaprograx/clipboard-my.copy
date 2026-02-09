import { useState, useEffect } from 'react';
import { Search, Clock, Star, Copy, Image, Link, Trash2, Settings } from 'lucide-react';
import { ClipboardCard } from './components/ClipboardCard';
import { SettingsModal } from './components/SettingsModal'; // Import Settings Modal
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
      url?: string;
      description?: string;
    }
  };
}

export function App() {
  const [history, setHistory] = useState<ClipboardItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editingItem, setEditingItem] = useState<{ id: string, content: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false); // Settings State

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

  // Clipboard Listener
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getHistory().then(h => setHistory(h));
      const cleanup = window.electronAPI.onClipboardUpdate(newHistory => setHistory(newHistory));
      window.electronAPI.onClipboardChanged(newItem => {
        setHistory(prev => prev.find(p => p.id === newItem.id) ? prev : [newItem, ...prev]);
      });
      return cleanup;
    }
  }, []);

  // Enhanced Search Filtering
  const filteredHistory = history.filter(item => {
    // 1. Category Filter
    if (activeCategory === 'pinned' && !item.pinned) return false;
    if (activeCategory === 'text' && item.type !== 'text') return false;
    if (activeCategory === 'image' && item.type !== 'image') return false;
    if (activeCategory === 'links' && !item.content.startsWith('http')) return false;

    // 2. Search Query (Metadata Aware)
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();

    // Check Content
    if (item.content.toLowerCase().includes(query)) return true;

    // Check Metadata (Title, URL, Description)
    if (item.metadata?.openGraphValues) {
      if (item.metadata.openGraphValues.title?.toLowerCase().includes(query)) return true;
      if (item.metadata.openGraphValues.url?.toLowerCase().includes(query)) return true;
      if (item.metadata.openGraphValues.description?.toLowerCase().includes(query)) return true;
    }

    return false;
  });

  const sortedHistory = [...filteredHistory].sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (b.timestamp - a.timestamp));

  // Keyboard Shortcuts (Filters + Navigation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Quick Filters (Alt+1...5)
      if (e.altKey) {
        if (e.key === '1') setActiveCategory('all');
        if (e.key === '2') setActiveCategory('pinned');
        if (e.key === '3') setActiveCategory('text');
        if (e.key === '4') setActiveCategory('image');
        if (e.key === '5') setActiveCategory('links');
        return;
      }

      if (e.key === 'Escape') {
        if (searchQuery) setSearchQuery('');
        else window.electronAPI?.hideWithoutPaste();
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
        if (item) navigator.clipboard.writeText(item.content);
      } else if (e.key === 'Enter') {
        const item = sortedHistory[selectedIndex];
        if (item) window.electronAPI?.pasteItem(item.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sortedHistory, selectedIndex, searchQuery]);

  const categories = [
    { id: 'all', icon: Clock, label: 'Todo' },
    { id: 'pinned', icon: Star, label: 'Fijado' },
    { id: 'text', icon: Copy, label: 'Texto' },
    { id: 'image', icon: Image, label: 'Imágenes' },
    { id: 'links', icon: Link, label: 'Enlaces' },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-neutral-950 font-sans overflow-hidden text-neutral-200 selection:bg-white/20">

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative">

        {/* Top Bar: Full Width, Spaced, Connected */}
        <div className="h-[60px] w-full px-6 grid grid-cols-[1fr_auto_1fr] items-center shrink-0 app-region-drag z-50 bg-[#1c1c1e]/90 backdrop-blur-xl border-b border-white/5 shadow-sm relative">

          {/* Left: Spacer to balance the grid for perfect centering */}
          <div className="pointer-events-none" />

          {/* Center: Categories */}
          <div className="flex items-center justify-center no-drag h-full" style={{ gap: '2px' }}>
            {categories.map((cat, idx) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                title={`Alt+${idx + 1}`}
                className={cn(
                  "flex-none relative h-9 w-40 flex items-center justify-center gap-2 text-[13px] font-medium transition-all duration-200 outline-none rounded-full border shadow-sm",
                  activeCategory === cat.id
                    ? "bg-blue-600 text-white border-blue-500 shadow-blue-900/20"
                    : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white border-white/5 hover:border-white/10"
                )}
              >
                <cat.icon size={15} className={activeCategory === cat.id ? "text-white" : "opacity-70"} />
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Right: Search & Actions */}
          <div className="flex items-center justify-end gap-4 no-drag">

            {/* Search (Integrated & Expanded) */}
            <div className="relative group w-64 xl:w-72 transition-all">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-black/20 border border-white/5 focus:border-white/10 focus:bg-black/40 rounded-full pl-9 pr-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 outline-none transition-all"
              />
            </div>

            <div className="h-5 w-[1px] bg-white/10" />

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (confirm('Clear entire history?')) window.electronAPI?.clearHistory();
                }}
                className="p-2 rounded-full hover:bg-white/5 text-neutral-500 hover:text-red-400 transition-colors"
                title="Clear All"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-full hover:bg-white/5 text-neutral-500 hover:text-white transition-colors"
                title="Settings"
              >
                <Settings size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Scroll Content */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-8 pb-4 no-scrollbar flex items-center bg-neutral-900/30" style={{ gap: '10px' }}>
          {sortedHistory.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-neutral-600 opacity-60">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 ring-1 ring-white/5">
                <Copy size={24} strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium">Clipboard is empty</p>
              <p className="text-xs text-neutral-700 mt-1">Copy something to get started</p>
            </div>
          ) : (
            sortedHistory.map((item, index) => (
              <div key={item.id} className="h-[200px] aspect-[4/5] shrink-0 transform transition-all duration-300">
                <ClipboardCard
                  item={item}
                  isActive={index === selectedIndex}
                  onClick={() => window.electronAPI ? window.electronAPI.pasteItem(item.id) : null}
                  onEdit={handleEdit}
                />
              </div>
            ))
          )}
        </div>

        {/* Bottom App Region (Drag) */}
        <div className="h-4 w-full app-region-drag shrink-0 bg-transparent absolute bottom-0 left-0 z-50" />
      </div>

      {/* Modals */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {editingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-[90%] max-w-md bg-[#2c2c2e] border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <h3 className="text-white font-bold text-lg">Editar Contenido</h3>
            <textarea
              value={editingItem.content}
              onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
              className="w-full h-32 bg-black/20 border border-white/5 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-white/20 resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditingItem(null)} className="px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium">Cancelar</button>
              <button onClick={saveEdit} className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white shadow-lg transition-all text-sm font-bold">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
