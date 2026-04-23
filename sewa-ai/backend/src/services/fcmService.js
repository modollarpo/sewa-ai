"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFCMPush = sendFCMPush;
exports.sendFCMToTopic = sendFCMToTopic;
// SEWA AI — src/services/fcmService.ts
// Firebase Cloud Messaging push notifications
const axios_1 = __importDefault(require("axios"));
const FCM_KEY = process.env.FCM_SERVER_KEY || '';
const FCM_URL = 'https://fcm.googleapis.com/fcm/send';
async function sendFCMPush({ token, title, body, data }) {
    if (!token || !FCM_KEY)
        return;
    await axios_1.default.post(FCM_URL, {
        to: token,
        notification: { title, body, sound: 'default', badge: '1' },
        data: data || {},
        priority: 'high',
    }, { headers: { Authorization: `key=${FCM_KEY}`, 'Content-Type': 'application/json' } });
}
async function sendFCMToTopic(topic, title, body, data) {
    if (!FCM_KEY)
        return;
    await axios_1.default.post(FCM_URL, {
        to: `/topics/${topic}`,
        notification: { title, body, sound: 'default' },
        data: data || {},
        priority: 'high',
    }, { headers: { Authorization: `key=${FCM_KEY}`, 'Content-Type': 'application/json' } });
}
