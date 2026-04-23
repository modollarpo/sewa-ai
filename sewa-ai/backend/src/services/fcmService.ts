// SEWA AI — src/services/fcmService.ts
// Firebase Cloud Messaging push notifications
import axios from 'axios';
const FCM_KEY = process.env.FCM_SERVER_KEY || '';
const FCM_URL = 'https://fcm.googleapis.com/fcm/send';

export async function sendFCMPush({ token, title, body, data }: {
  token: string; title: string; body: string; data?: Record<string, string>;
}): Promise<void> {
  if (!token || !FCM_KEY) return;
  await axios.post(FCM_URL, {
    to: token,
    notification: { title, body, sound: 'default', badge: '1' },
    data: data || {},
    priority: 'high',
  }, { headers: { Authorization: `key=${FCM_KEY}`, 'Content-Type': 'application/json' } });
}

export async function sendFCMToTopic(topic: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
  if (!FCM_KEY) return;
  await axios.post(FCM_URL, {
    to: `/topics/${topic}`,
    notification: { title, body, sound: 'default' },
    data: data || {},
    priority: 'high',
  }, { headers: { Authorization: `key=${FCM_KEY}`, 'Content-Type': 'application/json' } });
}
