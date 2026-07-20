const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || '';

type EventParams = Record<string, string | number | boolean>;

function gtag(...args: unknown[]) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag(...args);
  }
}

export const analytics = {
  init() {
    if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return;
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: false,
      anonymize_ip: true,
    });
  },

  pageView(path: string, title?: string) {
    if (!GA_MEASUREMENT_ID) return;
    gtag('event', 'page_view', {
      page_path: path,
      page_title: title || document.title,
      page_location: window.location.href,
    });
  },

  event(action: string, params?: EventParams) {
    if (!GA_MEASUREMENT_ID) return;
    gtag('event', action, params);
  },

  consentGranted() {
    if (!GA_MEASUREMENT_ID) return;
    gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
    });
  },

  consentDenied() {
    if (!GA_MEASUREMENT_ID) return;
    gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
    });
  },
};
