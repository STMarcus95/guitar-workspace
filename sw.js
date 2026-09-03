/* 吉他教学工作台 PWA Service Worker
 * 缓存当前 HTML 与图标资源，支持离线打开。
 * 缓存策略：network-first（优先网络，离线 fallback 缓存）
 * 缓存版本：与下方 CACHE_NAME 一致（v112 起注释随版本同步更新）
 */
var CACHE_NAME = 'guitar-workspace-v115';
var ASSETS_TO_CACHE = [
  './',
  './index.html',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './manifest.webmanifest',
  './splash-750x1334.png',
  './splash-828x1792.png',
  './splash-1080x2340.png',
  './splash-1125x2436.png',
  './splash-1170x2532.png',
  './splash-1179x2556.png',
  './splash-1242x2688.png',
  './splash-1290x2796.png'
];

self.addEventListener('install', function (event) {
  /* 立即激活新 SW，不等待旧 SW 退出 */
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      /* 缓存关键资源；个别资源失败时不影响整体 */
      return Promise.all(
        ASSETS_TO_CACHE.map(function (url) {
          return cache.add(url).catch(function (err) {
            console.warn('[SW] cache.add failed:', url, err);
          });
        })
      );
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

/* network-first：先尝试网络（强制绕过 HTTP 缓存拿最新版），成功则更新缓存；失败则返回缓存 */
self.addEventListener('fetch', function (event) {
  var req = event.request;
  /* 只处理 GET */
  if (req.method !== 'GET') return;
  /* 跳过非同源请求 */
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    /* cache:'reload' 强制绕过浏览器 HTTP 缓存，直接打网络拿最新版本（解决 PWA 缓存导致的"看到的还是旧版"问题） */
    fetch(req, { cache: 'reload' }).then(function (resp) {
      /* 成功：克隆响应并存入缓存 */
      if (resp && resp.status === 200 && resp.type === 'basic') {
        var clone = resp.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(req, clone);
        });
      }
      return resp;
    }).catch(function () {
      /* 网络失败：返回缓存 */
      return caches.match(req).then(function (cached) {
        if (cached) return cached;
        /* 缓存也 miss 时，对导航请求返回根 index.html */
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});
