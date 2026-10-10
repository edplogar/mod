import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      {
        name: 'vite-hmr-suppressor',
        transformIndexHtml: {
          order: 'pre',
          handler() {
            return [
              {
                tag: 'script',
                attrs: { type: 'text/javascript' },
                children: `(function() {
  var RealWebSocket = window.WebSocket;
  if (RealWebSocket) {
    function ViteMockWebSocket(url, protocols) {
      var isViteHmr = (
        (typeof protocols === 'string' && (protocols === 'vite-hmr' || protocols === 'vite-ping')) ||
        (Array.isArray(protocols) && (protocols.indexOf('vite-hmr') !== -1 || protocols.indexOf('vite-ping') !== -1)) ||
        (typeof url === 'string' && (url.indexOf('vite') !== -1 || url.indexOf('token=') !== -1))
      );
      if (isViteHmr) {
        var target = new EventTarget();
        var ws = {
          readyState: 1,
          CONNECTING: 0,
          OPEN: 1,
          CLOSING: 2,
          CLOSED: 3,
          url: String(url),
          protocol: typeof protocols === 'string' ? protocols : 'vite-hmr',
          extensions: '',
          binaryType: 'blob',
          bufferedAmount: 0,
          send: function() {},
          close: function() {
            ws.readyState = 3;
            var ev = new Event('close');
            target.dispatchEvent(ev);
            if (typeof ws.onclose === 'function') ws.onclose(ev);
          },
          addEventListener: function(type, listener, options) {
            target.addEventListener(type, listener, options);
            if (type === 'open') {
              setTimeout(function() {
                var ev = new Event('open');
                target.dispatchEvent(ev);
                if (typeof ws.onopen === 'function') ws.onopen(ev);
              }, 0);
            }
          },
          removeEventListener: function(type, listener, options) {
            target.removeEventListener(type, listener, options);
          },
          dispatchEvent: function(event) {
            return target.dispatchEvent(event);
          },
          onopen: null,
          onclose: null,
          onerror: null,
          onmessage: null
        };
        setTimeout(function() {
          if (typeof ws.onopen === 'function') {
            ws.onopen(new Event('open'));
          }
        }, 0);
        return ws;
      }
      return new RealWebSocket(url, protocols);
    }
    ViteMockWebSocket.CONNECTING = RealWebSocket.CONNECTING;
    ViteMockWebSocket.OPEN = RealWebSocket.OPEN;
    ViteMockWebSocket.CLOSING = RealWebSocket.CLOSING;
    ViteMockWebSocket.CLOSED = RealWebSocket.CLOSED;
    ViteMockWebSocket.prototype = RealWebSocket.prototype;
    window.WebSocket = ViteMockWebSocket;
  }
  var origConsoleError = console.error;
  console.error = function() {
    var args = Array.prototype.slice.call(arguments);
    if (args.some(function(arg) {
      return typeof arg === 'string' && (
        arg.indexOf('WebSocket closed without opened') !== -1 ||
        arg.indexOf('[vite] connecting...') !== -1 ||
        arg.indexOf('[vite] failed to connect to websocket') !== -1
      );
    })) {
      return;
    }
    origConsoleError.apply(console, args);
  };
  window.addEventListener('error', function(e) {
    if (e && e.message && (
      e.message.indexOf('WebSocket closed without opened') !== -1 ||
      e.message.indexOf('WebSocket') !== -1
    )) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);
  window.addEventListener('unhandledrejection', function(e) {
    var reason = e && e.reason ? (e.reason.message || String(e.reason)) : '';
    if (reason.indexOf('WebSocket closed without opened') !== -1 || reason.indexOf('WebSocket') !== -1) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);
})();`,
                injectTo: 'head-prepend',
              },
            ];
          },
        },
      },
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'MOD REPORT LOGAR - Hotel Lombok Garden',
          short_name: 'MOD LOGAR',
          description: 'Sistem Laporan & Inspeksi Resmi Manager on Duty Hotel Lombok Garden',
          theme_color: '#95A823',
          background_color: '#231E1B',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      hmr: false,
      watch: null,
    },
  };
});
