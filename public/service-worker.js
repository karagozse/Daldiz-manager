self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    // payload parse edilemezse boş bırak
  }

  const title = data.title || 'DALDIZ Bildirim';
  const options = {
    body: data.body || '',
    icon: '/icons/daldiz-192.png',
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // İleride tıklama ile özel sayfa açmak istersek buraya logic eklenebilir
});
