import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellRing, CheckCheck, Loader2, Smartphone, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuthStore } from '../../store/useAuthStore';

const decodeVapidKey = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (character) => character.charCodeAt(0));
};

const NotificationCenter = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [isOpen, setIsOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushError, setPushError] = useState('');
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [isDisablingPush, setIsDisablingPush] = useState(false);
  const pushSupported = typeof window !== 'undefined'
    && typeof navigator !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['notifications', user?._id],
    queryFn: async () => {
      const response = await axiosInstance.get('/notifications');
      return response.data.data;
    },
    refetchInterval: 30000,
    enabled: Boolean(user?._id),
  });

  const { data: vapidData, isError: vapidError, isLoading: isLoadingVapidKey } = useQuery({
    queryKey: ['push-public-key'],
    queryFn: async () => {
      const response = await axiosInstance.get('/notifications/push/public-key');
      return response.data.data;
    },
    enabled: isOpen && pushSupported,
    retry: false,
  });
  const isPushEnabled = pushEnabled && Boolean(vapidData?.publicKey);

  const markReadMutation = useMutation({
    mutationFn: (id) => axiosInstance.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (error) => setPushError(error.response?.data?.error || 'Could not update notification status.'),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => axiosInstance.patch('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (error) => setPushError(error.response?.data?.error || 'Could not update notification status.'),
  });

  useEffect(() => {
    if (!isOpen || !pushSupported) return undefined;

    if (!vapidData?.publicKey) return undefined;

    let active = true;
    navigator.serviceWorker.getRegistration().then(async (registration) => {
      const subscription = registration ? await registration.pushManager.getSubscription() : null;
      if (!subscription) {
        if (active) setPushEnabled(false);
        return;
      }

      await axiosInstance.post('/notifications/push/subscription', {
        subscription: subscription.toJSON(),
      });
      if (active) setPushEnabled(true);
    }).catch((error) => {
      console.error('Could not inspect mobile notification subscription:', error);
      if (active) setPushError('Could not check this device’s notification settings.');
    });

    return () => {
      active = false;
    };
  }, [isOpen, pushSupported, vapidData?.publicKey, vapidError]);

  const enablePushNotifications = async () => {
    setPushError('');
    if (!pushSupported) {
      setPushError('This browser does not support mobile push alerts.');
      return;
    }

    setIsEnablingPush(true);
    try {
      const permission = await window.Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error(permission === 'denied'
          ? 'Notifications are blocked in browser settings. Allow them for monexafx.com and try again.'
          : 'Please allow notifications to receive account updates.');
      }

      const registration = await navigator.serviceWorker.register('/service-worker.js');
      const subscription = await registration.pushManager.getSubscription()
        || await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(vapidData.publicKey),
        });

      await axiosInstance.post('/notifications/push/subscription', {
        subscription: subscription.toJSON(),
      });
      setPushEnabled(true);
    } catch (error) {
      console.error('Could not enable mobile notifications:', error);
      setPushError(error.response?.data?.error || error.message || 'Could not enable mobile alerts.');
    } finally {
      setIsEnablingPush(false);
    }
  };

  const disablePushNotifications = async () => {
    setPushError('');
    setIsDisablingPush(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = registration ? await registration.pushManager.getSubscription() : null;
      if (subscription) {
        await axiosInstance.delete('/notifications/push/subscription', {
          data: { endpoint: subscription.endpoint },
        });
        await subscription.unsubscribe();
      }
      setPushEnabled(false);
    } catch (error) {
      console.error('Could not disable mobile notifications:', error);
      setPushError(error.response?.data?.error || 'Could not disable mobile alerts.');
    } finally {
      setIsDisablingPush(false);
    }
  };

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        className="relative p-1.5 sm:p-2 rounded-xl bg-slate-900/80 text-gray-300 hover:text-cyan-400 border border-slate-800 transition"
        title="Notifications"
      >
        {unreadCount ? <BellRing className="w-4 h-4 sm:w-5 sm:h-5" /> : <Bell className="w-4 h-4 sm:w-5 sm:h-5" />}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-cyan-400 text-slate-950 text-[9px] font-extrabold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed left-3 right-3 top-[4.75rem] z-[60] mx-auto max-w-sm rounded-2xl border border-cyan-800/60 bg-[#0b1322] shadow-2xl shadow-black/60 overflow-hidden sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[calc(100vw-1.5rem)]">
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white">Notifications</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Account activity and MonexaFX updates</p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  className="p-2 rounded-lg text-cyan-300 hover:bg-cyan-950/60"
                  title="Mark all as read"
                  aria-label="Mark all notifications as read"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="Close notifications"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80">
            {isLoading ? (
              <div className="p-8 flex justify-center text-cyan-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : isError ? (
              <p className="p-5 text-xs text-rose-300">Could not load notifications. Please try again.</p>
            ) : notifications.length === 0 ? (
              <div className="p-7 text-center">
                <Bell className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">You’re all caught up.</p>
              </div>
            ) : notifications.map((notification) => (
              <Link
                key={notification._id}
                to={notification.url || '/dashboard-home'}
                onClick={() => {
                  if (!notification.readAt) markReadMutation.mutate(notification._id);
                  setIsOpen(false);
                }}
                className={`block p-4 hover:bg-slate-900/80 transition ${
                  notification.readAt ? 'opacity-75' : 'bg-cyan-950/20'
                }`}
              >
                <div className="flex gap-3">
                  <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                    notification.readAt ? 'bg-slate-700' : 'bg-cyan-400'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">{notification.title}</p>
                    <p className="text-[11px] leading-relaxed text-slate-400 mt-1">{notification.message}</p>
                    <time className="text-[10px] text-slate-500 mt-2 block">
                      {new Date(notification.createdAt).toLocaleString()}
                    </time>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="p-3 border-t border-slate-800 bg-slate-950/40">
            {isPushEnabled ? (
              <button
                type="button"
                onClick={disablePushNotifications}
                disabled={isDisablingPush}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 hover:bg-emerald-950/70 text-xs font-bold disabled:opacity-60"
              >
                {isDisablingPush
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Smartphone className="w-4 h-4" />}
                Mobile alerts enabled · Tap to disable
              </button>
            ) : pushSupported && vapidError ? (
              <p className="text-center text-[11px] text-slate-400">
                Mobile alerts need server setup. In-app notifications are available now.
              </p>
            ) : pushSupported ? (
              <button
                type="button"
                onClick={enablePushNotifications}
                disabled={isEnablingPush || isLoadingVapidKey}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-700/60 text-cyan-200 hover:bg-cyan-500/25 text-xs font-bold disabled:opacity-60"
              >
                {isEnablingPush || isLoadingVapidKey
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Smartphone className="w-4 h-4" />}
                {isLoadingVapidKey ? 'Checking mobile alerts…' : 'Enable mobile alerts'}
              </button>
            ) : (
              <p className="text-center text-[11px] text-slate-400">
                Mobile alerts are not supported in this browser.
              </p>
            )}
            {pushError && <p className="text-[10px] text-rose-300 text-center mt-2">{pushError}</p>}
            {!isPushEnabled && pushSupported && /iPhone|iPad|iPod/.test(navigator.userAgent) && (
              <p className="text-[10px] text-slate-500 text-center mt-2">
                On iPhone or iPad, add MonexaFX to your Home Screen first.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
