const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', error => logs.push(`[PAGE ERROR] ${error.message}`));

  try {
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle', timeout: 10000 });
    
    // Attempt to log in if on login page
    if (await page.$('input[type="email"]')) {
      await page.fill('input[type="email"]', 'admin@innov8.com');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }
    
    // Go to fees page
    await page.goto('http://localhost:5174/fees', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/fees_web.png', fullPage: true });
    
    // Print logs
    console.log("STATUS: SUCCESS");
    console.log("CONSOLE LOGS:", logs);
  } catch (err) {
    console.log("STATUS: ERROR");
    console.error(err);
    console.log("CONSOLE LOGS:", logs);
  } finally {
    await browser.close();
  }
})();
