import { useEffect, useState } from 'react';
import LOGO_IMAGE_PATH from '../../assets/startup-splash-logo.png';
import './StartupSplash.css';

function isInstalledApp() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function StartupSplash() {
  const [isVisible, setIsVisible] = useState(isInstalledApp);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isLogoLoaded, setIsLogoLoaded] = useState(false);

  useEffect(() => {
    if (!isVisible) return undefined;

    if (!isLogoLoaded) {
      const loadTimeout = window.setTimeout(() => {
        console.error('Startup splash logo did not load in time.');
        setIsVisible(false);
      }, 5000);
      return () => window.clearTimeout(loadTimeout);
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const exitDelay = prefersReducedMotion ? 500 : 2600;
    const hideDelay = prefersReducedMotion ? 750 : 3050;
    const exitTimer = window.setTimeout(() => setIsLeaving(true), exitDelay);
    const hideTimer = window.setTimeout(() => setIsVisible(false), hideDelay);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, [isVisible, isLogoLoaded]);

  if (!isVisible) return null;

  return (
    <div
      className={`startup-splash${isLeaving ? ' startup-splash--leaving' : ''}`}
      role="status"
      aria-label="Loading MonexaFX"
    >
      <img
        className={`startup-splash__logo${isLogoLoaded ? ' startup-splash__logo--loaded' : ''}`}
        src={LOGO_IMAGE_PATH}
        alt=""
        onLoad={() => setIsLogoLoaded(true)}
        onError={() => {
          console.error('Failed to load the startup splash logo.');
          setIsVisible(false);
        }}
      />
    </div>
  );
}

export default StartupSplash;
