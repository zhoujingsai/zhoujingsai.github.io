importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/3.1.0/workbox-sw.js"
);

var cacheStorageKey = "tax-pwa-20260604-20";
var cacheList = [
  "/tax/",
  "/tax/index.html",
  "/tax/detail.html",
  "/tax/detail-bonus.html",
  "/tax/calculation.html",
  "/tax/index.css",
  "/tax/data.js",
  "/tax/tax-calculator.js",
  "/tax/app.js",
  "/tax/detail.js",
  "/tax/detail-bonus.js",
  "/tax/calculation.js",
  "/tax/logo.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(cacheStorageKey)
      .then((cache) => cache.addAll(cacheList))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("fetch", function (e) {
  e.respondWith(
    caches.match(e.request).then(function (response) {
      if (response != null) {
        return response;
      }
      return fetch(e.request.url);
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    //获取所有cache名称
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          // 获取所有不同于当前版本名称cache下的内容
          cacheNames
            .filter((cacheNames) => {
              return cacheNames !== cacheStorageKey;
            })
            .map((cacheNames) => {
              return caches.delete(cacheNames);
            })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});
