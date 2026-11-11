import Notification from '../models/Notification.js';
import PushSubscription from '../models/PushSubscription.js';
import { getPublicVapidKey } from '../services/notificationService.js';

const ALLOWED_PUSH_HOSTS = [
  'fcm.googleapis.com',
  'push.services.mozilla.com',
  'web.push.apple.com',
];

const isAllowedPushEndpoint = (endpoint) => {
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:'
      && !url.port
      && ALLOWED_PUSH_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
};

export const getNotifications = async (req, res, next) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30),
      Notification.countDocuments({ user: req.user._id, readAt: null }),
    ]);

    res.status(200).json({ success: true, data: { notifications, unreadCount } });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, readAt: null },
      { $set: { readAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found or already read.' });
    }

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, readAt: null },
      { $set: { readAt: new Date() } }
    );
    res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
};

export const getPushPublicKey = (req, res) => {
  const publicKey = getPublicVapidKey();
  if (!publicKey) {
    return res.status(503).json({ success: false, error: 'Mobile push alerts are not configured yet.' });
  }
  res.status(200).json({ success: true, data: { publicKey } });
};

export const savePushSubscription = async (req, res, next) => {
  try {
    const subscriptionData = req.body?.subscription;
    if (!subscriptionData || typeof subscriptionData !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid mobile notification subscription.' });
    }
    const { endpoint, keys, expirationTime } = subscriptionData;
    if (
      typeof endpoint !== 'string'
      || !isAllowedPushEndpoint(endpoint)
      || typeof keys?.p256dh !== 'string'
      || typeof keys?.auth !== 'string'
    ) {
      return res.status(400).json({ success: false, error: 'Invalid mobile notification subscription.' });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        $set: {
          user: req.user._id,
          endpoint,
          keys: { p256dh: keys.p256dh, auth: keys.auth },
          expirationTime: Number.isFinite(expirationTime) ? expirationTime : null,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, message: 'Mobile alerts enabled on this device.' });
  } catch (error) {
    next(error);
  }
};

export const removePushSubscription = async (req, res, next) => {
  try {
    const endpoint = req.body?.endpoint;
    if (typeof endpoint !== 'string' || !isAllowedPushEndpoint(endpoint)) {
      return res.status(400).json({ success: false, error: 'Invalid mobile notification subscription.' });
    }

    await PushSubscription.deleteOne({ user: req.user._id, endpoint });
    res.status(200).json({ success: true, message: 'Mobile alerts disabled on this device.' });
  } catch (error) {
    next(error);
  }
};
