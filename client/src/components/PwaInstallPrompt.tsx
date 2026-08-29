import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // 1. Check if app is already running in standalone PWA mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) return;

    // Check if dismissed previously
    const dismissed = localStorage.getItem("pwa_install_dismissed");
    if (dismissed) return;

    // 2. Check if on iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // 3. Android / Chrome beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // If on iOS and not dismissed, show prompt after 5 seconds
    if (isIosDevice && !isStandalone && !dismissed) {
      const timer = setTimeout(() => setShowPrompt(true), 4000);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  async function handleInstallClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    }
  }

  function handleDismiss() {
    setShowPrompt(false);
    setShowIosGuide(false);
    localStorage.setItem("pwa_install_dismissed", "true");
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:w-96 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-[#0B3024] text-white p-4 rounded-3xl border border-white/20 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Subtle Luxury Pattern */}
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-xl flex-shrink-0">
            ⛳
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold font-display text-white">Install Chip &amp; Chill App</h4>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-white/60 hover:text-white text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-white/75 mt-0.5 leading-snug">
              Instant offline scorecards, quick tee time booking, and clubhouse passes on your home screen.
            </p>

            {showIosGuide ? (
              <div className="mt-3 p-2.5 rounded-xl bg-white/10 text-[11px] text-sand space-y-1">
                <p className="font-bold">📱 To install on iOS:</p>
                <p>1. Tap the <strong>Share</strong> button <span className="inline-block">⎋</span> at the bottom of Safari.</p>
                <p>2. Scroll down &amp; tap <strong>Add to Home Screen ⊞</strong>.</p>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="px-3.5 py-1.5 rounded-xl bg-gold text-fairway text-[11px] font-extrabold hover:bg-gold/90 transition-all shadow-sm"
                >
                  {isIos ? "Install on iPhone / iPad" : "Add to Home Screen"}
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-2.5 py-1.5 rounded-xl text-white/60 hover:text-white text-[11px] font-semibold"
                >
                  Not now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
