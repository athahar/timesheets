const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function runProviderIdTest() {
  let browser;

  try {
    console.log('🚀 Starting automated provider ID test...');

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set up console logging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();

      if (type === 'error') {
        console.error(`❌ Browser: ${text}`);
      } else if (text.includes('✅') || text.includes('🎉') || text.includes('RESULT:')) {
        console.log(`✅ Browser: ${text}`);
      } else if (text.includes('❌') || text.includes('Failed') || text.includes('Error')) {
        console.log(`❌ Browser: ${text}`);
      } else if (text.includes('Testing') || text.includes('Summary') || text.includes('Validating')) {
        console.log(`🔧 Browser: ${text}`);
      }
    });

    // Navigate to the app
    console.log('🌐 Navigating to http://localhost:8087...');
    await page.goto('http://localhost:8087', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('⏱️ Waiting for app to initialize...');
    await page.waitForTimeout(5000);

    // Read and inject the test script
    const testScript = fs.readFileSync(
      path.join(__dirname, 'test-simple-validation.js'),
      'utf8'
    );

    console.log('📝 Injecting and running test script...');

    // Execute the test
    const result = await page.evaluate(testScript);

    // Wait for test completion
    await page.waitForTimeout(15000);

    console.log('✅ Test execution completed');

  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Check if we're running this script directly
if (require.main === module) {
  runProviderIdTest().catch(console.error);
}

module.exports = { runProviderIdTest };