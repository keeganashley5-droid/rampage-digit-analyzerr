import React from 'react';
import { ArrowRight, LogIn, X } from 'lucide-react';
import { BullLogo } from './BullLogo';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'bright';
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark',
}) => {
  if (!isOpen) return null;
  const isBright = theme === 'bright';

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="login-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ${
        isBright ? 'bg-[#faf8f5] border-amber-300 text-slate-900' : 'bg-[#070b16] border-amber-500/30 text-slate-100'
      }`}>
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-amber-500/20">
          <div className="flex items-center gap-2.5">
            <BullLogo size={32} className="w-8 h-8" glow={true} borderStyle="gold" />
            <div>
              <h3 id="login-modal-title" className="text-sm font-bold font-mono uppercase">
                Connect Deriv Account
              </h3>
              <p className="text-[10px] font-mono opacity-70">Official OAuth authentication</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close login"
            className="p-1.5 rounded-lg hover:bg-slate-800/20">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs leading-relaxed opacity-80">
            Continue to Deriv's official sign-in page to securely authorize your account.
          </p>
          <a href="/oauth/deriv/login"
            className="w-full min-h-[46px] py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-slate-950 font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
            <LogIn className="w-4 h-4" />
            <span>Log in with Deriv</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};