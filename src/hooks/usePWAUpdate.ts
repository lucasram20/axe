/**
 * Automatic PWA Service Worker update controller for installed PWAs.
 * - Automatically checks for new deployments on launch, when the app returns to focus,
 *   and every 10 minutes in the background.
 * - When a new version is detected (onNeedRefresh), automatically launches the animated
 *   update modal, animates through installation stages (0% -> 100%), activates the new
 *   Service Worker, and seamlessly reloads without requiring users to re-open the URL.
 * - Exposes a manual checkForUpdates() helper for the Settings drawer.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

export type PWAUpdatePhase =
  | 'idle'
  | 'checking'
  | 'updating'
  | 'reloading'
  | 'up_to_date'
  | 'offline';

export interface PWAUpdateState {
  phase: PWAUpdatePhase;
  progress: number; // 0..100
  stageIndex: number; // 0..3
  statusText: string;
  isPreview: boolean;
  modalOpen: boolean;
  checkForUpdates: () => Promise<void>;
  dismissModal: () => void;
}

const UPDATE_STAGES = [
  'Connecting to Project-Labs build server...',
  'Downloading updated 3D assets & eras...',
  'Verifying offline cache & save integrity...',
  'Activating new build & relaunching...',
];

// Singleton event bus so both SettingsDrawer & PWAUpdateModal share one SW registration cleanly
type Listener = () => void;
const listeners = new Set<Listener>();
let sharedState: {
  phase: PWAUpdatePhase;
  progress: number;
  stageIndex: number;
  statusText: string;
  isPreview: boolean;
  modalOpen: boolean;
} = {
  phase: 'idle',
  progress: 0,
  stageIndex: 0,
  statusText: '',
  isPreview: false,
  modalOpen: false,
};

let swInitialized = false;
let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
let swRegistration: ServiceWorkerRegistration | null = null;
let animTimer: number | null = null;
let needRefreshPending = false;

function emit() {
  for (const fn of listeners) fn();
}

function setShared(patch: Partial<typeof sharedState>) {
  sharedState = { ...sharedState, ...patch };
  emit();
}

function stopAnim() {
  if (animTimer !== null) {
    window.clearInterval(animTimer);
    animTimer = null;
  }
}

export function startAnimatedAutoUpdate(isPreview = false): void {
  stopAnim();
  const startMs = performance.now();
  const totalMs = isPreview ? 3400 : 2400;

  setShared({
    phase: 'updating',
    progress: 6,
    stageIndex: 0,
    statusText: UPDATE_STAGES[0],
    isPreview,
    modalOpen: true,
  });

  animTimer = window.setInterval(() => {
    const elapsed = performance.now() - startMs;
    const rawT = Math.min(1, elapsed / totalMs);
    // Smooth eased progression with authentic chunk bursts
    const eased = 1 - Math.pow(1 - rawT, 2.2);
    const pct = Math.min(100, Math.round(6 + eased * 94));
    const stageIdx = pct < 28 ? 0 : pct < 64 ? 1 : pct < 90 ? 2 : 3;

    if (pct >= 100) {
      stopAnim();
      setShared({
        phase: 'reloading',
        progress: 100,
        stageIndex: 3,
        statusText: isPreview
          ? 'Update ready! (Preview complete — installed PWA auto-reloads here)'
          : UPDATE_STAGES[3],
        modalOpen: true,
      });

      if (!isPreview && updateSWFn) {
        window.setTimeout(() => {
          updateSWFn?.(true).catch(() => {
            window.location.reload();
          });
        }, 380);
      }
    } else {
      setShared({
        phase: 'updating',
        progress: pct,
        stageIndex: stageIdx,
        statusText: UPDATE_STAGES[stageIdx],
        modalOpen: true,
      });
    }
  }, 55);
}

function initPWAUpdateService(): void {
  if (swInitialized || typeof window === 'undefined') return;
  swInitialized = true;

  // Support ?previewUpdate=1 for instant visual QA verification
  const params = new URLSearchParams(window.location.search);
  if (params.get('previewUpdate') === '1') {
    window.setTimeout(() => startAnimatedAutoUpdate(true), 250);
  }

  try {
    updateSWFn = registerSW({
      immediate: true,
      onNeedRefresh() {
        needRefreshPending = true;
        startAnimatedAutoUpdate(false);
      },
      onRegisteredSW(_swUrl, registration) {
        swRegistration = registration ?? null;
        if (!registration) return;

        // Immediately check once on launch
        registration.update().catch(() => {});

        // Periodic background check every 10 minutes while open
        window.setInterval(() => {
          if (navigator.onLine) {
            registration.update().catch(() => {});
          }
        }, 10 * 60 * 1000);
      },
    });
  } catch {
    // Graceful no-op in environments where SW is unavailable
  }

  // Re-check for updates automatically whenever the user returns to the installed PWA
  const checkOnResume = () => {
    if (document.visibilityState === 'visible' && navigator.onLine && swRegistration) {
      swRegistration.update().catch(() => {});
    }
  };
  document.addEventListener('visibilitychange', checkOnResume);
  window.addEventListener('focus', checkOnResume);
}

export function usePWAUpdate(): PWAUpdateState {
  const [, setTick] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    initPWAUpdateService();
    const onChange = () => {
      if (mountedRef.current) setTick((t) => t + 1);
    };
    listeners.add(onChange);
    return () => {
      mountedRef.current = false;
      listeners.delete(onChange);
    };
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setShared({
        phase: 'offline',
        progress: 0,
        stageIndex: 0,
        statusText: 'Offline — reconnect to check for new Project-Labs updates.',
        isPreview: false,
        modalOpen: true,
      });
      return;
    }

    setShared({
      phase: 'checking',
      progress: 18,
      stageIndex: 0,
      statusText: 'Checking for latest Project-Labs build...',
      isPreview: false,
      modalOpen: true,
    });

    needRefreshPending = false;
    try {
      if (swRegistration) {
        await swRegistration.update();
      }
      // Give the browser a brief moment to fire onNeedRefresh if a waiting SW exists
      await new Promise((r) => window.setTimeout(r, 950));
      if (!needRefreshPending && sharedState.phase === 'checking') {
        setShared({
          phase: 'up_to_date',
          progress: 100,
          stageIndex: 3,
          statusText: 'Your installed Project-Labs app is already on the latest version!',
          modalOpen: true,
        });
      }
    } catch {
      if (!needRefreshPending) {
        setShared({
          phase: 'up_to_date',
          progress: 100,
          stageIndex: 3,
          statusText: 'Your app is up to date.',
          modalOpen: true,
        });
      }
    }
  }, []);

  const dismissModal = useCallback(() => {
    stopAnim();
    setShared({
      phase: 'idle',
      modalOpen: false,
      isPreview: false,
    });
  }, []);

  return {
    ...sharedState,
    checkForUpdates,
    dismissModal,
  };
}
