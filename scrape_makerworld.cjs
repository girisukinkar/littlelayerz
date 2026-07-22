const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();

  try {
    console.log('Navigating to Makerworld collection page...');
    await page.goto('https://makerworld.com/en/collections/31475311-kids-puzzle', { waitUntil: 'domcontentloaded', timeout: 30000 });

    await page.waitForTimeout(3000);

    // Check if login is required
    const bodyText = await page.textContent('body');
    const isNotExist = bodyText.includes('The collection does not exist');
    const hasLogInBtn = await page.locator('text=Log In').first().isVisible().catch(() => false);

    console.log(`Page state: isNotExist=${isNotExist}, hasLogInBtn=${hasLogInBtn}`);

    // If we need to login
    if (isNotExist || hasLogInBtn) {
      console.log('Attempting login...');
      // Click Log In button if present
      const loginBtn = page.locator('button:has-text("Log In"), a:has-text("Log In")').first();
      if (await loginBtn.isVisible().catch(() => false)) {
        await loginBtn.click();
        await page.waitForTimeout(3000);
      } else {
        await page.goto('https://makerworld.com/en/login', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
      }

      console.log('Current URL after login click:', page.url());

      // Look for email & password inputs
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="account" i], input[type="text"]').first();
      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('Filling email...');
        await emailInput.fill('girisukinkar@gmail.com');
        
        const nextOrSubmit = page.locator('button[type="submit"], button:has-text("Next"), button:has-text("Log In"), button:has-text("Sign In")').first();
        if (await nextOrSubmit.isVisible().catch(() => false)) {
          await nextOrSubmit.click();
          await page.waitForTimeout(2000);
        }

        const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
        if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log('Filling password...');
          await passwordInput.fill('Zaq123@bambulab');
          
          const submitBtn = page.locator('button[type="submit"], button:has-text("Log In"), button:has-text("Sign In")').first();
          await submitBtn.click();
          await page.waitForTimeout(5000);
        }
      } else {
        console.log('Email input not immediately found. Searching iframe or current frame inputs...');
        const inputs = await page.locator('input').all();
        console.log('Found inputs count:', inputs.length);
        for (let i = 0; i < inputs.length; i++) {
          const ph = await inputs[i].getAttribute('placeholder');
          const name = await inputs[i].getAttribute('name');
          const type = await inputs[i].getAttribute('type');
          console.log(`Input ${i}: type=${type}, name=${name}, placeholder=${ph}`);
        }
      }
    }

    // Now go back to collection page
    console.log('Going to collection page...');
    await page.goto('https://makerworld.com/en/collections/31475311-kids-puzzle', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log('Page Title:', title);

    await page.screenshot({ path: 'makerworld_collection_result.png', fullPage: true });
    console.log('Saved makerworld_collection_result.png');

    const htmlContent = await page.content();
    fs.writeFileSync('makerworld_collection_dom.html', htmlContent);
    console.log('Saved makerworld_collection_dom.html');

  } catch (err) {
    console.error('Error during scraping execution:', err);
    await page.screenshot({ path: 'makerworld_error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
