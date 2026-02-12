'use client';

import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed today
    const dismissedToday = localStorage.getItem('pwa_dismissed_today');
    if (dismissedToday === 'true') {
      setDismissed(true);
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowPrompt(false);
        // Track installation
        trackInstallation();
      }

      setDeferredPrompt(null);
    } catch (err) {
      console.error('Installation failed:', err);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    // Dismiss for 24 hours
    localStorage.setItem('pwa_dismissed_today', 'true');
    setTimeout(() => {
      localStorage.removeItem('pwa_dismissed_today');
    }, 24 * 60 * 60 * 1000);
  };

  const trackInstallation = async () => {
    try {
      await fetch('/api/pwa/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAgent: navigator.userAgent }),
      });
    } catch (err) {
      console.error('Failed to track installation:', err);
    }
  };

  if (isInstalled || !showPrompt || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 max-w-sm z-50">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <span className="text-2xl">📱</span>
            Install Job Portal
          </h3>
          <p className="text-blue-100 text-sm mt-1">Get instant access on your device</p>
        </div>

        {/* Features */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-lg">⚡</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Fast & Responsive</p>
                <p className="text-xs text-gray-600">Works offline with instant loading</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">🔔</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Push Notifications</p>
                <p className="text-xs text-gray-600">Get alerts for job matches and updates</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">📲</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm">App Experience</p>
                <p className="text-xs text-gray-600">Launch like a native app</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 flex gap-3 bg-white border-t border-gray-200">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Not Now
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:shadow-lg transition-all"
          >
            Install Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
