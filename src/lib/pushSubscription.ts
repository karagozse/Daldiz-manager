import { apiPost } from '@/lib/api';

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function enableWebPushNotifications(): Promise<{ ok: boolean; message?: string }> {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { ok: false, message: 'Tarayıcınız push bildirimlerini desteklemiyor.' };
    }

    if (!vapidPublicKey || String(vapidPublicKey).trim() === '') {
      console.warn('VITE_VAPID_PUBLIC_KEY tanımlı değil, push subscription oluşturulamaz.');
      return { ok: false, message: 'Bildirim anahtarı eksik (VAPID public key).' };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { ok: false, message: 'Bildirim izni verilmedi.' };
    }

    const registration = await navigator.serviceWorker.register('/service-worker.js');

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    const raw = subscription.toJSON() as { keys?: { p256dh?: string; auth?: string } };
    const endpoint = subscription.endpoint;
    const p256dh = raw?.keys?.p256dh;
    const auth = raw?.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      console.error('Push subscription bilgileri eksik:', { endpoint, p256dh: !!p256dh, auth: !!auth });
      return { ok: false, message: 'Tarayıcı bildirim bilgileri eksik.' };
    }

    const res = await apiPost<{ success?: boolean }>('/notifications/subscriptions', {
      endpoint,
      p256dh,
      auth,
      userAgent: navigator.userAgent,
    });
    if (res && (res as { success?: boolean }).success === false) {
      return { ok: false, message: 'Bildirimler etkinleştirilemedi. Lütfen daha sonra tekrar deneyin.' };
    }
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.name === 'NotAllowedError') {
      console.error('PUSH_SUBSCRIPTION_DEBUG: NotAllowedError - user denied permission', error);
      return { ok: false, message: 'Tarayıcı bildirim izni vermedi. Lütfen tarayıcı ayarlarından bu site için bildirimlere izin verin.' };
    }
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('no active Service Worker'))) {
      console.error('PUSH_SUBSCRIPTION_DEBUG: AbortError or SW error', error);
    } else {
      console.error('PUSH_SUBSCRIPTION_DEBUG: unexpected error', error);
    }
    return { ok: false, message: 'Bildirimler etkinleştirilemedi. Lütfen daha sonra tekrar deneyin.' };
  }
}
