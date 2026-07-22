const { chromium } = require('playwright');

async function main() {
  console.log('Connecting to browser via CDP...');
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = context.pages().find(p => p.url().includes('makerworld.com') || p.url().includes('localhost')) || await context.newPage();

  console.log('Navigating active tab to http://localhost:5173/catalog...');
  await page.goto('http://localhost:5173/catalog', { waitUntil: 'domcontentloaded' });
  await page.bringToFront();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'catalog_live_preview.png', fullPage: true });
  console.log('Saved catalog_live_preview.png');
}

main().catch(console.error);
