import { chromium } from '/home/ubuntu/repos/superset/superset-frontend/node_modules/playwright/index.mjs';
import fs from 'fs';

const label = process.argv[2]; // e.g. "pr" or "base"
const outDir = `/home/ubuntu/gate/${label}`;
fs.mkdirSync(outDir, { recursive: true });

const themes = ['superset', 'supersetDark'];
const STORY = 'chart-plugins-plugin-chart-ag-grid-table--basic';

const browser = await chromium.launch();
const results = {};
for (const theme of themes) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 2 });
  const url = `http://127.0.0.1:6006/iframe.html?id=${STORY}&globals=theme:${theme}`;
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForSelector('.ag-row', { timeout: 120000 });
  await page.waitForTimeout(3000);

  const data = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.ag-row')];
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const out = rows.map(r => {
      const cells = [...r.querySelectorAll('.ag-cell')].map(c => {
        const cs = getComputedStyle(c);
        return {
          colId: c.getAttribute('col-id'),
          text: c.textContent,
          color: cs.color,
          bg: cs.backgroundColor,
          classes: c.className,
        };
      });
      return { rowIndex: r.getAttribute('row-index'), cells };
    });
    return { bodyBg, rows: out };
  });
  // hover the row containing the NULL category cell, then measure again
  const hoverTarget = page.locator('.ag-row', { hasText: 'NullCategory' }).first();
  await hoverTarget.hover();
  await page.waitForTimeout(1000);
  const hovered = await page.evaluate(() => {
    const row = [...document.querySelectorAll('.ag-row')].find(r =>
      r.textContent.includes('NullCategory'),
    );
    if (!row) return null;
    return [...row.querySelectorAll('.ag-cell')].map(c => {
      const cs = getComputedStyle(c);
      return {
        colId: c.getAttribute('col-id'),
        text: c.textContent,
        color: cs.color,
        bg: cs.backgroundColor,
        classes: c.className,
      };
    });
  });
  data.hoveredNullRow = hovered;
  results[theme] = data;
  await page.locator('.panel').first().screenshot({ path: `${outDir}/${label}-${theme}.png` });
  await page.close();
}
fs.writeFileSync(`${outDir}/measurements.json`, JSON.stringify(results, null, 2));
await browser.close();
console.log('done', label);
