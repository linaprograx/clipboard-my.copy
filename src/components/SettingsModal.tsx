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
            <div className="w-[90%] max-w-sm bg-[#2c2c2e] border border-white/10 rounded-2xl shadow-2xl p-0 overflow-hidden flex flex-col">

                {/* Header */}
                <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h3 className="text-white font-bold text-sm">Preferencias</h3>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col gap-6">

                    {/* Shortcut */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-white/50 font-medium flex items-center gap-2">
                            <Command size={12} />
                            Atajo Global
                        </label>
                        <button
                            onClick={() => setRecording(true)}
                            onKeyDown={handleKeyDown}
                            className={cn(
                                "h-10 rounded-lg border flex items-center justify-center text-sm font-mono transition-all outline-none",
                                recording
                                    ? "bg-red-500/20 border-red-500/50 text-red-200 animate-pulse"
                                    : "bg-black/20 border-white/10 text-white hover:border-white/30"
                            )}
                        >
                            {recording ? "Presiona combinación..." : prefs.globalShortcut}
                        </button>
                        <div className="text-[10px] text-white/30">
                            Haz clic para grabar. Escape para cancelar.
                        </div>
                    </div>

                    {/* Launch at Login */}
                    <div className="flex items-center justify-between">
                        <label className="text-xs text-white/50 font-medium flex items-center gap-2">
                            <Power size={12} />
                            Iniciar al arrancar
                        </label>
                        <button
                            onClick={() => updatePref('launchAtLogin', !prefs.launchAtLogin)}
                            className={cn(
                                "w-10 h-6 rounded-full relative transition-colors border",
                                prefs.launchAtLogin ? "bg-green-500/20 border-green-500/50" : "bg-white/5 border-white/10"
                            )}
                        >
                            <div className={cn(
                                "absolute w-4 h-4 rounded-full top-1 transition-all",
                                prefs.launchAtLogin ? "bg-green-400 left-5" : "bg-white/30 left-1"
                            )} />
                        </button>
                    </div>

                    {/* History Limit */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-white/50 font-medium flex items-center gap-2">
                            <Database size={12} />
                            Items en historial
                        </label>
                        <input
                            type="number"
                            value={prefs.historyLimit}
                            onChange={(e) => updatePref('historyLimit', parseInt(e.target.value))}
                            className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-white/30 outline-none"
                            min={10}
                            max={500}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-black/20 text-center">
                    <span className="text-[10px] text-white/20">Nexus Clipboard v0.1.0</span>
                </div>
            </div>
        </div>
    );
}
