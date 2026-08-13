self.addEventListener("push", (event) => {
  let data = { title: "SmartYugam LMS", body: "You have an update", link: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      data: { link: data.link },
      icon: "/favicon.ico",
    })
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/";
  event.waitUntil(clients.openWindow(link));
});
