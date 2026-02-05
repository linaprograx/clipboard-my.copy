import { useEffect, useState, useRef } from 'react';
import type { ClipboardItem } from './electron';
import { ClipboardCard } from './components/ClipboardCard';
import { Search } from 'lucide-react';

function App() {
  const [history, setHistory] = useState<ClipboardItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter items
  const filteredHistory = history.filter(item =>
    item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort: Pinned first
  const sortedHistory = [...filteredHistory].sort((a, b) => {
    if (a.pinned === b.pinned) return 0; // Keep FIFO for same pin status
    return a.pinned ? -1 : 1;
  });

  // Load Initial History
  useEffect(() => {
    window.electronAPI.getHistory().then(setHistory);
    const cleanup = window.electronAPI.onClipboardUpdate((newHistory) => {
      setHistory(newHistory);
      setSelectedIndex(0); // Reset selection on new item
    });
    return cleanup;
  }, []);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSearchActive) {
          setIsSearchActive(false);
          setSearchQuery('');
        } else {
          window.electronAPI.hideWithoutPaste();
        }
      } else if (e.key === 'ArrowRight') {
        setSelectedIndex(prev => Math.min(prev + 1, sortedHistory.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        const item = sortedHistory[selectedIndex];
        if (item) window.electronAPI.pasteItem(item);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        // Pin logic
        const item = sortedHistory[selectedIndex];
        if (item) window.electronAPI.pinItem(item.id);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        setIsSearchActive(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sortedHistory, selectedIndex, isSearchActive]);

  // Scroll to active
  useEffect(() => {
    if (containerRef.current) {
      const activeEl = containerRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedIndex]);

  return (
    <div className="h-screen w-screen flex flex-col justify-center bg-transparent overflow-hidden px-4 md:px-10">

      {/* Search Bar (Conditional) */}
      <div className={`
          absolute top-4 left-1/2 -translate-x-1/2 transition-all duration-300
          ${isSearchActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}
      `}>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-full py-2 pl-10 pr-4 text-white text-sm outline-none w-[300px]"
            onBlur={() => { if (!searchQuery) setIsSearchActive(false) }}
          />
        </div>
      </div>

      {/* Main List */}
      <div
        ref={containerRef}
        className="flex gap-4 overflow-x-auto no-scrollbar py-10 px-4 snap-x relative items-center"
      >
        {sortedHistory.length === 0 && (
          <div className="text-white/30 text-center w-full">No items found</div>
        )}

        {sortedHistory.map((item, index) => (
          <div key={item.id} className="snap-center">
            <ClipboardCard
              item={item}
              isActive={index === selectedIndex}
              onClick={() => window.electronAPI.pasteItem(item)}
            />
          </div>
        ))}
      </div>

      {/* Footer Hints */}
      <div className="fixed bottom-4 left-0 right-0 flex justify-center gap-6 text-[10px] text-gray-500 font-medium uppercase tracking-widest opacity-60">
        <span className="flex items-center gap-1"><span className="bg-white/10 px-1.5 py-0.5 rounded">↵</span> Paste</span>
        <span className="flex items-center gap-1"><span className="bg-white/10 px-1.5 py-0.5 rounded">Esc</span> Close</span>
        <span className="flex items-center gap-1"><span className="bg-white/10 px-1.5 py-0.5 rounded">⌘ P</span> Pin</span>
        <span className="flex items-center gap-1"><span className="bg-white/10 px-1.5 py-0.5 rounded">⌘ F</span> Search</span>
      </div>

    </div>
  );
}

export default App;
