import { sendNotification, setVapidDetails } from 'web-push';
import Notification from '../models/Notification.js';
import PushSubscription from '../models/PushSubscription.js';
import User from '../models/User.js';

let missingVapidWarningLogged = false;

const getVapidConfiguration = () => {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) return null;
  return { publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY, subject: VAPID_SUBJECT };
};

export const getPublicVapidKey = () => getVapidConfiguration()?.publicKey || null;

const sendPushNotification = async (userId, notification) => {
  const subscriptions = await PushSubscription.find({ user: userId });
  if (!subscriptions.length) return;

  const vapid = getVapidConfiguration();
  if (!vapid) {
    if (!missingVapidWarningLogged) {
      console.warn('Push delivery is disabled: configure VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT.');
      missingVapidWarningLogged = true;
    }
    return;
  }

  setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  const payload = JSON.stringify({
    title: notification.title,
    body: notification.message,
    url: notification.url,
    tag: String(notification._id),
  });

  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        },
        payload
      );
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await PushSubscription.deleteOne({ _id: subscription._id });
        return;
      }
      console.error(`Push delivery failed for subscription ${subscription._id}:`, error.message);
    }
  }));
};

export const notifyUser = async ({ userId, type, title, message, url = '/dashboard-home' }) => {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      url,
    });
    sendPushNotification(userId, notification).catch((error) => {
      console.error(`Push delivery could not be started for notification ${notification._id}:`, error.message);
    });
    return notification;
  } catch (error) {
    console.error(`Could not create or deliver ${type} notification for user ${userId}:`, error.message);
    return null;
  }
};

export const publishAnnouncement = async ({ title, message }) => {
  const users = await User.find({ role: 'user' }).select('_id');
  const batchSize = 50;
  let createdCount = 0;

  for (let offset = 0; offset < users.length; offset += batchSize) {
    const batch = users.slice(offset, offset + batchSize);
    const results = await Promise.all(batch.map((user) => notifyUser({
      userId: user._id,
      type: 'ANNOUNCEMENT',
      title,
      message,
      url: '/dashboard-home',
    })));
    createdCount += results.filter(Boolean).length;
  }

  return createdCount;
};
