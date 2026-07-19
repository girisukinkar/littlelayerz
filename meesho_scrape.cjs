#!/usr/bin/env node
/**
 * Meesho Supplier Category API Sniffer
 * 
 * Uses Chrome's existing login session (Default profile) to:
 * 1. Intercept all network requests on the category page
 * 2. Identify the category API endpoint
 * 3. Record full request/response details
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TARGET_URL = 'https://supplier.meesho.com/panel/v3/new/cataloging/req4n/catalogs/single/select-category';
const CHROME_PROFILE = path.join(process.env.HOME, 'Library/Application Support/Google/Chrome');
const OUTPUT_DIR = './meesho_output';
const SNIFFER_LOG = path.join(OUTPUT_DIR, 'api_requests.json');

// Patterns to capture (category/catalog related)
const CAPTURE_PATTERNS = [
  /categor/i, /catalog/i, /attribute/i, /product.*form/i, /listing/i,
  /metadata/i, /taxonomy/i, /vertical/i, /subcategor/i, /leaf/i,
  /gst/i, /hsn/i, /brand/i, /variant/i, /size.chart/i,
];

// Patterns to ignore
const IGNORE_PATTERNS = [
  /analytics/i, /telemetry/i, /logging/i, /monitoring/i, /ads/i,
  /mixpanel/i, /segment/i, /sentry/i, /datadog/i, /amplitude/i,
  /facebook/i, /google-analytics/i, /hotjar/i, /clarity/i,
  /cdn\./, /fonts\./i, /\.woff/, /\.png/, /\.jpg/, /\.svg/, /\.css/,
  /sockjs/, /websocket/,
];

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const capturedRequests = [];

async function run() {
  console.log('Launching Chrome with existing profile (Default)...');
  
  const browser = await chromium.launchPersistentContext(CHROME_PROFILE, {
    headless: false,
    channel: 'chrome',
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions-except',
      '--start-maximized',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
    viewport: null,
  });

  const page = await browser.newPage();

  // Intercept ALL network requests
  await page.route('**/*', async (route, request) => {
    const url = request.url();
    const resourceType = request.resourceType();

    // Only intercept fetch/xhr requests
    if (['fetch', 'xhr'].includes(resourceType)) {
      const isIgnored = IGNORE_PATTERNS.some(p => p.test(url));
      
      if (!isIgnored) {
        try {
          const response = await route.fetch();
          let body = '';
          let responseBody = null;
          
          try {
            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('json')) {
              body = await response.text();
              responseBody = JSON.parse(body);
            }
          } catch (e) {
            // ignore parse errors
          }

          const entry = {
            url,
            method: request.method(),
            resourceType,
            headers: request.headers(),
            postData: request.postData(),
            status: response.status(),
            responseHeaders: response.headers(),
            responseBody,
            timestamp: new Date().toISOString(),
          };

          capturedRequests.push(entry);
          
          // Print category-related ones immediately
          const isCategoryRelated = CAPTURE_PATTERNS.some(p => p.test(url));
          if (isCategoryRelated) {
            console.log('\n🎯 CATEGORY API FOUND:');
            console.log('  URL:', url);
            console.log('  Method:', request.method());
            if (request.postData()) {
              console.log('  Body:', request.postData().substring(0, 300));
            }
            if (responseBody) {
              const preview = JSON.stringify(responseBody).substring(0, 500);
              console.log('  Response preview:', preview);
            }
          } else {
            console.log('  ↳ API:', url.substring(0, 100));
          }

          await route.fulfill({ response });
        } catch (e) {
          await route.continue();
        }
      } else {
        await route.continue();
      }
    } else {
      await route.continue();
    }
  });

  console.log(`\nNavigating to: ${TARGET_URL}`);
  
  try {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    console.log('Navigation error (may be ok):', e.message);
  }

  console.log('\nWaiting 15 seconds for all requests to complete...');
  await page.waitForTimeout(15000);

  // Try clicking on different categories to trigger lazy-load API calls
  console.log('\nLooking for category items to click...');
  
  const categorySelectors = [
    '[class*="category"]',
    '[class*="Category"]',
    '[data-testid*="category"]',
    'li[role="option"]',
    '[class*="item"]',
    '[class*="tree"]',
    '[class*="node"]',
    'button',
  ];

  for (const selector of categorySelectors) {
    try {
      const elements = await page.locator(selector).all();
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        // Click the first few to trigger API
        for (let i = 0; i < Math.min(3, elements.length); i++) {
          try {
            await elements[i].click({ timeout: 2000 });
            await page.waitForTimeout(2000);
            console.log(`  Clicked item ${i + 1}`);
          } catch (e) {
            // ignore click errors
          }
        }
        break;
      }
    } catch (e) {
      // ignore selector errors
    }
  }

  await page.waitForTimeout(5000);

  // Save all captured requests
  fs.writeFileSync(SNIFFER_LOG, JSON.stringify(capturedRequests, null, 2));
  console.log(`\n✅ Saved ${capturedRequests.length} captured requests to ${SNIFFER_LOG}`);

  // Print summary of all unique API endpoints
  console.log('\n📋 UNIQUE API ENDPOINTS DISCOVERED:');
  const uniqueEndpoints = {};
  capturedRequests.forEach(req => {
    const baseUrl = req.url.split('?')[0];
    if (!uniqueEndpoints[baseUrl]) {
      uniqueEndpoints[baseUrl] = { method: req.method, count: 0, url: req.url };
    }
    uniqueEndpoints[baseUrl].count++;
  });

  Object.values(uniqueEndpoints).forEach(ep => {
    console.log(`  [${ep.method}] ${ep.url.substring(0, 120)} (${ep.count}x)`);
  });

  // Print specifically category-related
  console.log('\n🎯 CATEGORY-RELATED ENDPOINTS:');
  capturedRequests.filter(r => CAPTURE_PATTERNS.some(p => p.test(r.url))).forEach(r => {
    console.log(`  [${r.method}] ${r.url}`);
    if (r.postData) console.log(`    Body: ${r.postData.substring(0, 200)}`);
    if (r.responseBody) console.log(`    Response: ${JSON.stringify(r.responseBody).substring(0, 300)}`);
  });

  console.log('\nKeeping browser open — press Ctrl+C to exit');
  // Keep open for manual inspection
  await page.waitForTimeout(60000);

  await browser.close();
}

run().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
