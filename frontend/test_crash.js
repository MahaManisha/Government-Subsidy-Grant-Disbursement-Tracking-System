const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.error('REQUEST FAILED:', request.url(), request.failure().errorText));

  try {
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    
    // Login
    await page.fill('input[type="text"]', 'district1');
    await page.fill('input[type="password"]', 'password123'); // guessing generic password
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    
    // Go to reviews
    await page.goto('http://localhost:5173/verification/district/reviews', { waitUntil: 'networkidle' });
    
    // Wait for a little bit to ensure rendering crashes if it's going to
    await page.waitForTimeout(3000);
    
  } catch (err) {
    console.error('SCRIPT ERROR:', err);
  } finally {
    await browser.close();
  }
})();
