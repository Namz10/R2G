import React, { useState } from 'react';
import { Key, Shield, Eye, EyeOff, X, Check } from 'lucide-react';
import { getApiKey, setApiKey, clearApiKey } from '../lib/apiKey.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [key, setLocalKey] = useState<string>(() => getApiKey());
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setApiKey(key);
    setSavedSuccess(true);
    onSaved();
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const handleClear = () => {
    clearApiKey();
    setLocalKey('');
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-[#121821] border border-[#1F2937] rounded-xl max-w-md w-full p-6 shadow-2xl relative text-left">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Close settings"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg">Bring Your Own Key (BYOK)</h3>
            <p className="text-xs text-slate-400">Google Gemini API Key</p>
          </div>
        </div>

        <div className="mb-4 text-xs text-slate-300 space-y-2 bg-[#0B0F14] p-3 rounded-lg border border-[#1F2937]">
          <div className="flex items-start gap-2 text-emerald-400">
            <Shield className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              <strong>Private & ephemeral:</strong> Your key is stored strictly in your browser's{' '}
              <code className="text-slate-200">sessionStorage</code>. It is never logged, never committed, never in code, env files, or URLs.
            </span>
          </div>
          <p className="text-slate-400 text-[11px]">
            You can get a free Gemini API key from{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-rose-400 hover:underline"
            >
              Google AI Studio
            </a>.
          </p>
        </div>

        <div className="space-y-1.5 mb-5">
          <label className="block text-xs font-medium text-slate-300">Gemini API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={key}
              onChange={(e) => setLocalKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-[#0B0F14] border border-[#1F2937] focus:border-rose-500 rounded-lg px-3 py-2 pr-10 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              aria-label={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#1F2937]">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-rose-400 hover:text-rose-300 hover:underline transition-colors"
          >
            Clear key
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[#1F2937] text-xs text-slate-300 hover:bg-[#1A2230] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 font-medium text-xs text-white shadow-lg shadow-rose-500/20 transition-all"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Saved
                </>
              ) : (
                'Save Key'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
