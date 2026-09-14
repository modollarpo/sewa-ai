// SEWA XAI — frontend/src/services/pushRegistration.ts
// Registers the service worker for PWA clinical push notifications
// and subscribes the user to push notifications via FCM.

const SW_URL = '/sw.js';

/**
 * Register the PWA service worker and enable push notifications
 * for clinical alerts (stroke_code, critical_finding, urgent_finding).
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PushReg] Service Workers not supported.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_URL, {
      scope: '/',
    });

    console.info('[PushReg] Service Worker registered:', registration.scope);

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.info('[PushReg] No existing push subscription — prompting user.');
    } else {
      console.info('[PushReg] Existing push subscription found.');
    }

    return registration;
  } catch (err) {
    console.error('[PushReg] Service Worker registration failed:', err);
    return null;
  }
}

/**
 * Subscribe the user to push notifications via FCM.
 * Stores the FCM token in the auth store for backend dispatch.
 */
export async function subscribeToPushNotifications(
  token: string,
  fcmToken: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/v1/notifications/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fcmToken,
        platform: 'web',
        categories: ['stroke_code', 'critical_finding', 'urgent_finding', 'report_ready'],
      }),
    });

    if (!response.ok) {
      throw new Error(`Push subscription failed: ${response.status}`);
    }

    console.info('[PushReg] Push subscription successful.');
    return true;
  } catch (err) {
    console.error('[PushReg] Push subscription error:', err);
    return false;
  }
}

/**
 * Request notification permission and register the service worker.
 * Called on app initialization for radiologists and doctors.
 */
export async function initClinicalPushNotifications(): Promise<void> {
  if (!('Notification' in window)) {
    console.warn('[PushReg] Notifications API not supported.');
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('[PushReg] Notification permission denied.');
    return;
  }

  await registerServiceWorker();
  console.info('[PushReg] Clinical push notifications initialized.');
}

/**
 * Send an acknowledgment for a critical finding.
 * Called when the clinician taps "Review Now" on a critical push notification.
 */
export async function acknowledgeCriticalFinding(scanId: string): Promise<void> {
  try {
    await fetch('/api/v1/ai/clinical-push/acknowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scanId, acknowledged: true }),
    });
    console.info('[PushReg] Critical finding acknowledged:', scanId);
  } catch (err) {
    console.error('[PushReg] Acknowledgment failed:', err);
  }
}
