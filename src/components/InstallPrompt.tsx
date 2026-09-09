"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

export default function InstallPrompt() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const pathname = usePathname();

  const sliderDelay = 15000; // 15 seconds

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (pathname?.startsWith("/admin")) return;
    if (localStorage.getItem("pwa_installed") === "true") return;
    if (sessionStorage.getItem("pwa_prompt_dismissed") === "true") return;

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", () => {
      localStorage.setItem("pwa_installed", "true");
      setIsVisible(false);
    });

    let showTimer: NodeJS.Timeout;
    let hideTimer: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;

    const schedulePrompt = () => {
      showTimer = setTimeout(() => {
        setIsVisible(true);
        setProgress(100);

        // Start progress bar and hide timeout (e.g. 10 seconds)
        const displayDuration = 10000;
        const updateInterval = 50;
        const step = (updateInterval / displayDuration) * 100;

        progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev - step <= 0) {
              clearInterval(progressInterval);
              return 0;
            }
            return prev - step;
          });
        }, updateInterval);

        hideTimer = setTimeout(() => {
          setIsVisible(false);
          clearInterval(progressInterval);
          // Reschedule after hiding
          schedulePrompt();
        }, displayDuration);

      }, sliderDelay); // 30 seconds interval
    };

    schedulePrompt();

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearInterval(progressInterval);
    };
  }, [pathname]);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      alert("Please use your browser's menu to install the app or try again later.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem("pwa_prompt_dismissed", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm md:top-4 md:bottom-auto md:right-4 md:left-auto md:translate-x-0 md:w-[380px] z-[9999] animate-in slide-in-from-bottom-8 md:slide-in-from-top-8 fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden flex flex-col relative">
        <div className="relative p-2 pt-6 flex justify-center items-center gap-4">
          <button
            onClick={handleDismiss}
            className="absolute font-bold top-1 right-1 p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <img src="/favicon.png" alt="Nomo Cars" className="w-12 h-12 rounded-xl object-cover" />
          <div className="">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Install Nomo Cars</h4>
            <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-0.5">For a faster, app-like experience.</p>
          </div>
          <div>
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-lg hover:bg-brand-primary/90 transition-colors"
            >
              Install
            </button>
          </div>
        </div>

        {/* Progress Bar indicator */}
        <div className="h-1 w-full bg-gray-100 dark:bg-slate-800 absolute bottom-0 left-0">
          <div
            className="h-full bg-brand-primary transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
