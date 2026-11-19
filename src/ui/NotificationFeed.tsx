/**
 * Compact pixel-framed notification feed in the upper-right below the TopBar.
 */

import { useGameStore } from '../store/useGameStore';

export function NotificationFeed() {
  const notifications = useGameStore((s) => s.game.notifications);
  const buildTool = useGameStore((s) => s.buildTool);
  const recent = notifications.slice(0, 3);

  if (recent.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed top-[98px] sm:top-[64px] [@media(max-height:500px)]:top-[58px] right-2 sm:right-3 z-10 flex-col gap-1.5 w-[min(320px,calc(100vw-16px))] ${
        buildTool !== 'select' ? 'hidden sm:flex [@media(max-height:500px)]:hidden' : 'flex'
      }`}
    >
      {recent.map((n, idx) => {
        const accent =
          n.tone === 'good'
            ? '#8ce063'
            : n.tone === 'warn'
              ? '#ffe478'
              : n.tone === 'alert'
                ? '#e0534f'
                : '#8de4ff';
        return (
          <div
            key={n.id}
            style={{ opacity: idx === 0 ? 1 : idx === 1 ? 0.85 : 0.65 }}
            className={`pixel-inset px-2.5 py-1.5 [@media(max-height:500px)]:py-1 text-[11px] sm:text-xs text-[#faf7eb] border-[#45506b] ${
              idx > 0 ? 'hidden sm:block [@media(max-height:500px)]:hidden' : ''
            }`}
          >
            <span className="font-pixel-display mr-1.5" style={{ color: accent }}>
              •
            </span>
            <span>{n.text}</span>
          </div>
        );
      })}
    </div>
  );
}
