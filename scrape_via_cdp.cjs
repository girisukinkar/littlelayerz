const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('Connecting to existing browser via CDP on http://127.0.0.1:9222...');
  
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  console.log('Connected!');

  const contexts = browser.contexts();
  console.log('Contexts count:', contexts.length);

  const context = contexts[0];
  const pages = context.pages();
  console.log('Pages count:', pages.length);

  let targetPage = pages.find(p => p.url().includes('makerworld.com'));
  if (!targetPage) {
    console.log('MakerWorld page not found among open tabs. Opening new tab in context...');
    targetPage = await context.newPage();
    await targetPage.goto('https://makerworld.com/en/collections/31475311-kids-puzzle', { waitUntil: 'domcontentloaded' });
  } else {
    console.log('Found open MakerWorld page:', targetPage.url());
  }

  await targetPage.bringToFront();
  await targetPage.waitForTimeout(3000);

  const title = await targetPage.title();
  console.log('Page Title:', title);

  const html = await targetPage.content();
  fs.writeFileSync('makerworld_cdp_page.html', html);
  console.log('Saved makerworld_cdp_page.html');

  // Extract model links
  const links = await targetPage.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href*="/models/"], a[href*="/makerlab/"]'));
    return anchors.map(a => ({
      href: a.href,
      text: a.innerText.trim(),
      title: a.getAttribute('title') || ''
    }));
  });

  console.log('Extracted links count:', links.length);
  fs.writeFileSync('makerworld_links.json', JSON.stringify(links, null, 2));
  console.log('Saved makerworld_links.json');

  // Also take screenshot
  await targetPage.screenshot({ path: 'makerworld_cdp_screenshot.png' });
  console.log('Saved makerworld_cdp_screenshot.png');
}

main().catch(console.error);
