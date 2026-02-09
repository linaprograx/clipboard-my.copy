import { useState, useEffect } from 'react';
import { X, Command, Power, Database } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs: (string | undefined | null | false)[]) => twMerge(clsx(inputs));

interface UserPreferences {
    globalShortcut: string;
    launchAtLogin: boolean;
    historyLimit: number;
}

interface SettingsModalProps {
    onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
    const [prefs, setPrefs] = useState<UserPreferences | null>(null);
    const [recording, setRecording] = useState(false);

    useEffect(() => {
        window.electronAPI?.getPreferences().then(setPrefs);

        const cleanup = window.electronAPI?.onPreferencesUpdated((newPrefs: UserPreferences) => {
            setPrefs(newPrefs);
        });
        return cleanup;
    }, []);

    const updatePref = (key: keyof UserPreferences, value: any) => {
        setPrefs(prev => prev ? { ...prev, [key]: value } : null);
        window.electronAPI?.updatePreference(key, value);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!recording) return;
        e.preventDefault();
        e.stopPropagation();

        const modifiers = [];
        if (e.metaKey) modifiers.push('Command');
        if (e.ctrlKey) modifiers.push('Control');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');

        let key = e.key.toUpperCase();
        if (['META', 'CONTROL', 'ALT', 'SHIFT'].includes(key)) return; // Wait for the actual key

        // Map generic keys if needed, for now simplistic
        const shortcut = [...modifiers, key].join('+');
        updatePref('globalShortcut', shortcut);
        setRecording(false);
    };

    if (!prefs) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-[90%] max-w-sm bg-neutral-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-0 overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h3 className="text-neutral-200 font-semibold text-sm tracking-wide">Settings</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-neutral-500 hover:text-neutral-200 hover:bg-white/10 transition-all">
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col gap-6">

                    {/* Shortcut */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold flex items-center gap-2">
                            <Command size={12} />
                            Global Shortcut
                        </label>
                        <button
                            onClick={() => setRecording(true)}
                            onKeyDown={handleKeyDown}
                            className={cn(
                                "h-10 rounded-lg border flex items-center justify-center text-sm font-mono transition-all outline-none shadow-inner",
                                recording
                                    ? "bg-red-500/10 border-red-500/30 text-red-200 animate-pulse ring-1 ring-red-500/20"
                                    : "bg-black/20 border-white/5 text-neutral-300 hover:border-white/10 hover:bg-black/30"
                            )}
                        >
                            {recording ? "Press new keys..." : prefs.globalShortcut}
                        </button>
                        <div className="text-[10px] text-neutral-600 px-1">
                            Click to record. Press <span className="text-neutral-400">Esc</span> to cancel.
                        </div>
                    </div>

                    <div className="h-[1px] bg-white/5 w-full" />

                    {/* Launch at Login */}
                    <div className="flex items-center justify-between group">
                        <label className="text-sm text-neutral-300 font-medium flex items-center gap-2">
                            <Power size={14} className="text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                            Launch at Login
                        </label>
                        <button
                            onClick={() => updatePref('launchAtLogin', !prefs.launchAtLogin)}
                            className={cn(
                                "w-11 h-6 rounded-full relative transition-colors border",
                                prefs.launchAtLogin ? "bg-blue-600 border-blue-500" : "bg-neutral-800 border-neutral-700"
                            )}
                        >
                            <div className={cn(
                                "absolute w-4 h-4 rounded-full top-[3px] bg-white shadow-sm transition-all duration-200",
                                prefs.launchAtLogin ? "left-[22px]" : "left-[3px]"
                            )} />
                        </button>
                    </div>

                    {/* History Limit */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold flex items-center gap-2">
                            <Database size={12} />
                            History Limit
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={prefs.historyLimit}
                                onChange={(e) => updatePref('historyLimit', parseInt(e.target.value))}
                                className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-neutral-200 text-sm focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all"
                                min={10}
                                max={500}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-600 pointer-events-none">items</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 bg-black/20 text-center border-t border-white/5">
                    <span className="text-[10px] text-neutral-600 font-medium">Nexus Clipboard v0.1.0</span>
                </div>
            </div>
        </div>
    );
}
