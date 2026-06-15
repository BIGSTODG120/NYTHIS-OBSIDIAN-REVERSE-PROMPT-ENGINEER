import { Github } from 'lucide-react';

// Vite injects BASE_URL — works in dev ('/') and on GitHub Pages ('/<repo>/')
const LOGO_SRC = `${import.meta.env.BASE_URL}nythis-logo.png`;

export function Header() {
  return (
    <header className="relative">
      <div className="mx-auto max-w-6xl px-6 pt-8 pb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src={LOGO_SRC}
            alt="NYTHIS Obsidian"
            width={56}
            height={56}
            className="rounded-lg shadow-ignite"
            style={{ filter: 'drop-shadow(0 0 12px rgba(124, 58, 237, 0.45))' }}
          />
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-extrabold tracking-wider text-white">
              NYTHIS <span className="text-violet-glow">OBSIDIAN</span>
            </span>
            <span className="text-[11px] uppercase tracking-[0.25em] text-fracture-dim">
              Reverse Prompt Engineer
            </span>
          </div>
        </div>
        <a
          href="https://github.com/BIGSTODG/nythis-obsidian-reverse-prompt"
          target="_blank"
          rel="noreferrer"
          className="obsidian-button-ghost"
          aria-label="View source on GitHub"
        >
          <Github size={16} />
          <span className="hidden sm:inline">Source</span>
        </a>
      </div>
      <div className="fracture-line mx-6" />
    </header>
  );
}
