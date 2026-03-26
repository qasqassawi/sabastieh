import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export function usePushNotifications() {
  useEffect(() => {
    // Only run on native Android/iOS
    if (!Capacitor.isNativePlatform()) return;

    const registerPush = async () => {
      // 1. Request permission
      const permStatus = await PushNotifications.requestPermissions();

      if (permStatus.receive !== 'granted') {
        console.warn('Push notification permission denied');
        return;
      }

      // 2. Register with FCM
      await PushNotifications.register();
    };

    // 3. FCM registration successful → get token
    const regListener = PushNotifications.addListener(
      'registration',
      (token) => {
        console.log('FCM Token:', token.value);
        // Save token to localStorage so admin can use it
        localStorage.setItem('fcm_token', token.value);
      }
    );

    // 4. Registration error
    const regErrListener = PushNotifications.addListener(
      'registrationError',
      (error) => {
        console.error('FCM Registration Error:', error);
      }
    );

    // 5. Notification received while app is in foreground
    const notifListener = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification) => {
        console.log('Push received:', notification);
        // Show browser-style alert or handle in-app
        const event = new CustomEvent('push-notification', {
          detail: notification,
        });
        window.dispatchEvent(event);
      }
    );

    // 6. Notification tapped (app in background/closed)
    const actionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action) => {
        console.log('Push action:', action);
        // Navigate to orders page for admin
        if (window.location.pathname !== '/admin') {
          // Could trigger a navigation here if needed
        }
      }
    );

    registerPush();

    // Cleanup listeners on unmount
    return () => {
      regListener.then((l) => l.remove());
      regErrListener.then((l) => l.remove());
      notifListener.then((l) => l.remove());
      actionListener.then((l) => l.remove());
    };
  }, []);
}
