import React from 'react';
import { Moon, Palette, Sun, X } from 'lucide-react';
import { RampageThemeConfig } from '../types/deriv';

interface ThemeCustomizerModalProps {
  isOpen: boolean;
  isBrightAppearance: boolean;
  onClose: () => void;
  config: RampageThemeConfig;
  onUpdateConfig: (updates: Partial<RampageThemeConfig>) => void;
}

export const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({
  isOpen,
  isBrightAppearance,
  onClose,
  config,
  onUpdateConfig,
}) => {
  if (!isOpen) return null;

  const surface = isBrightAppearance ? '#F3EBDD' : '#171717';
  const foreground = isBrightAppearance ? '#171717' : '#F3EBDD';
  const selected = config.appearance;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(23,23,23,0.78)' }}
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-dialog-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl"
        style={{ backgroundColor: surface, color: foreground, borderColor: '#B9572B' }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b p-5" style={{ borderColor: '#B9572B' }}>
          <div className="flex items-center gap-3">
            <Palette size={20} style={{ color: '#B9572B' }} />
            <div>
              <h2 id="theme-dialog-title" className="text-base font-bold tracking-wide">
                Appearance
              </h2>
              <p className="mt-1 text-xs opacity-75">
                Choose your Rampage display mode
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close appearance settings"
            className="rounded-lg p-2 transition-opacity hover:opacity-70"
          >
            <X size={19} />
          </button>
        </header>

        <div className="space-y-3 p-5">
          <button
            type="button"
            aria-pressed={selected === 'light'}
            onClick={() => onUpdateConfig({ appearance: 'light' })}
            className="flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all"
            style={{
              backgroundColor: selected === 'light' ? '#B9572B' : surface,
              color: selected === 'light' ? '#F3EBDD' : foreground,
              borderColor: selected === 'light' ? '#B9572B' : foreground,
            }}
          >
            <Sun size={23} />
            <span className="flex-1">
              <span className="block text-sm font-bold">Light Mode</span>
              <span className="mt-1 block text-xs opacity-80">
                Cream surfaces with ink structure and burnt-orange emphasis
              </span>
            </span>
            {selected === 'light' && <span className="text-xs font-bold">ACTIVE</span>}
          </button>

          <button
            type="button"
            aria-pressed={selected === 'dark'}
            onClick={() => onUpdateConfig({ appearance: 'dark' })}
            className="flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all"
            style={{
              backgroundColor: selected === 'dark' ? '#B9572B' : surface,
              color: selected === 'dark' ? '#F3EBDD' : foreground,
              borderColor: selected === 'dark' ? '#B9572B' : foreground,
            }}
          >
            <Moon size={23} />
            <span className="flex-1">
              <span className="block text-sm font-bold">Dark Mode</span>
              <span className="mt-1 block text-xs opacity-80">
                Ink surfaces with cream structure and burnt-orange emphasis
              </span>
            </span>
            {selected === 'dark' && <span className="text-xs font-bold">ACTIVE</span>}
          </button>
        </div>

        <footer className="border-t px-5 py-4" style={{ borderColor: '#B9572B' }}>
          <p className="text-[11px] leading-relaxed opacity-70">
            Rampage uses one fixed colour system in both modes.
          </p>
        </footer>
      </section>
    </div>
  );
};
