const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request =>
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText)
  );

  console.log("Navigating to localhost:5173...");
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  
  const content = await page.content();
  if (!content.includes('id="root"')) {
    console.log("Root element missing!");
  }
  const rootHtml = await page.evaluate(() => document.getElementById('root').innerHTML);
  console.log("ROOT INNER HTML LENGTH:", rootHtml.length);
  if (rootHtml.length < 100) {
    console.log("ROOT INNER HTML:", rootHtml);
  }

  await browser.close();
})();
