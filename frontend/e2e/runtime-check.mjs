// Read-only inspection of the local production preview, not a load benchmark.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { URL } from 'node:url';
const browser = await chromium.launch({ channel: 'chrome' });
const samples = [];
const checks = [];
try {
  for (let i = 0; i < 3; i++) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    await page.goto('http://127.0.0.1:4173/');
    await page.locator('.welcome h1').waitFor();
    samples.push(
      await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd),
          pageReadyMeasuredMs: Math.round(performance.now()),
          resourceTransferBytes: performance
            .getEntriesByType('resource')
            .reduce((n, r) => n + r.transferSize, 0),
        };
      }),
    );
    if (i === 0) {
      const metrics = (await cdp.send('Performance.getMetrics')).metrics;
      checks.push({
        javascriptHeapBytes: metrics.find((m) => m.name === 'JSHeapUsedSize')
          ?.value,
      });
      for (const width of [1440, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        const tree = await cdp.send('Accessibility.getFullAXTree');
        const unnamed = tree.nodes
          .filter(
            (n) =>
              !n.ignored &&
              ['button', 'link', 'textbox', 'combobox'].includes(
                n.role?.value,
              ) &&
              !n.name?.value,
          )
          .map((n) => n.role.value);
        checks.push({ width, unnamedControls: unnamed });
        if (unnamed.length)
          throw new Error(
            `Điều khiển thiếu tên ở ${width}px: ${unnamed.join(', ')}`,
          );
      }
    }
    await context.close();
  }
  const luminance = (hex) => {
    const rgb = hex
      .match(/[a-f0-9]{2}/gi)
      .map((v) => parseInt(v, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const contrast = [
    ['#f1f5f8', '#1b3042'],
    ['#b5c6d4', '#1b3042'],
    ['#102637', '#a7e0ed'],
  ].map(([foreground, background]) => {
    const values = [luminance(foreground), luminance(background)].sort(
      (a, b) => b - a,
    );
    const ratio = (values[0] + 0.05) / (values[1] + 0.05);
    if (ratio < 4.5)
      throw new Error('Cặp màu chính không đạt tương phản chữ thường.');
    return { foreground, background, ratio: Number(ratio.toFixed(2)) };
  });
  const report = {
    measuredAt: new Date().toISOString(),
    environment:
      'Chrome headless, local Vite production preview, no CPU/network throttling, fresh context each run',
    samples,
    checks,
    contrast,
    limitations:
      'Only initial guest dashboard controls and three base palette pairs. Not a Lighthouse/WCAG audit, Core Web Vitals field measurement or production HTTPS verification.',
  };
  writeFileSync(
    new URL('../../docs/phase-6-runtime.json', import.meta.url),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
