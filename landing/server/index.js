/* eslint-disable */
const express = require('express');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 5173;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Static files
app.use(
  express.static(PUBLIC_DIR, {
    extensions: ['html'],
    setHeaders: (res, filePath) => {
      // Cache assets, not HTML
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else if (filePath.includes('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    },
  }),
);

// Explicit routes
app.get('/', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));
app.get('/signup', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'signup.html')));

// 404 fallback → home
app.use((_req, res) => res.redirect('/'));

app.listen(PORT, () => {
  console.log(`✅ Landing server running on http://localhost:${PORT}`);
  console.log(`   /          → index.html`);
  console.log(`   /signup    → signup.html`);
  console.log(`   /assets/*  → static assets`);
});
