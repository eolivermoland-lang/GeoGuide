import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import https from 'node:https';
import { URL } from 'node:url';

/* I dev: proxy /api/* til OSM-tjenester.
 * I prod: samme URL-er håndteres av Vercel-funksjoner i /api-mappen. */
function apiProxy() {
  const OVERPASS_MIRRORS = [
    'https://overpass.private.coffee/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://overpass.openstreetmap.fr/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  function pipeRequest(targetHost, targetPath, req, res) {
    return new Promise((resolve, reject) => {
      const upstream = https.request({
        host: targetHost,
        port: 443,
        path: targetPath,
        method: req.method,
        family: 4,
        headers: {
          'User-Agent': 'GeoGuide/0.1 (dev)',
          'Accept': 'application/json'
        },
        timeout: 15000
      }, (proxyRes) => {
        res.statusCode = proxyRes.statusCode;
        const ct = proxyRes.headers['content-type'];
        if (ct) res.setHeader('Content-Type', ct);
        const chunks = [];
        proxyRes.on('data', (c) => chunks.push(c));
        proxyRes.on('end', () => {
          const buf = Buffer.concat(chunks);
          res.end(buf);
          resolve(proxyRes.statusCode);
        });
      });
      upstream.on('error', reject);
      upstream.on('timeout', () => upstream.destroy(new Error('timeout')));
      upstream.end();
    });
  }

  return {
    name: 'api-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url.startsWith('/api/nominatim')) {
          const qs = req.url.slice('/api/nominatim'.length).replace(/^\?/, '');
          try {
            await pipeRequest('nominatim.openstreetmap.org', '/search?' + qs, req, res);
          } catch (e) {
            res.statusCode = 502;
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }
        if (req.url.startsWith('/api/overpass')) {
          const qs = req.url.slice('/api/overpass'.length).replace(/^\?/, '');
          for (const mirror of OVERPASS_MIRRORS) {
            try {
              const u = new URL(mirror);
              const status = await pipeRequest(u.hostname, u.pathname + '?' + qs, req, res);
              if (status >= 200 && status < 300) return;
            } catch {}
          }
          if (!res.writableEnded) {
            res.statusCode = 502;
            res.end(JSON.stringify({ error: 'all mirrors failed' }));
          }
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), apiProxy()],
  server: { port: 5173, open: true },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          leaflet: ['leaflet', 'react-leaflet'],
          firebase: ['firebase/app', 'firebase/auth']
        }
      }
    }
  }
});
