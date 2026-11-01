const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 816, height: 1056 } });
  await p.goto('file://' + path.resolve(__dirname, 'flyer.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const over = await p.evaluate(() => { const pg = document.querySelector('.page'); return [...pg.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.bottom > 1056.5 || r.right > 816.5; }).map(e => e.className || e.tagName).slice(0, 5); });
  console.log('overflow', over);
  await p.pdf({ path: path.resolve(__dirname, '../FenceQuote-Pro-Features.pdf'), format: 'Letter', printBackground: true, preferCSSPageSize: true });
  await p.screenshot({ path: path.resolve(__dirname, 'preview.png'), scale: 'device' });
  await b.close();
})();
