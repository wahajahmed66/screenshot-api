const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

const PORT = process.env.PORT || 3000;
// Set a secret key to prevent strangers from using your API
const API_SECRET = process.env.API_SECRET || "change_this_to_something_secure";

app.use(express.json());

// Helper: Validate API Key
const checkAuth = (req) => {
    const key = req.query.key || req.body.key;
    return key === API_SECRET;
};

app.get('/', (req, res) => {
    res.send('Screenshot Service is Running. Use /take endpoint.');
});

app.get('/take', async (req, res) => {
    // 1. Auth Check
    if (!checkAuth(req)) {
        return res.status(401).json({ error: "Unauthorized. Invalid 'key'." });
    }

    // 2. Parse Parameters
    const url = req.query.url;
    // Default delay 2s, parse input to integer
    const delay = req.query.delay ? parseInt(req.query.delay) : 2;
    // Default full_page true
    const fullPage = req.query.full_page === 'false' ? false : true;

    if (!url) {
        return res.status(400).json({ error: "Missing 'url' parameter" });
    }

    let browser = null;

    try {
        // 3. Launch Browser
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Critical for Docker memory limits
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();

        // Set viewport (Desktop standard)
        await page.setViewport({ width: 1440, height: 900 });

        // Set User Agent to avoid basic bot detection
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

        // 4. Navigate
        // waitUntil: 'networkidle0' means wait until no network connections for 500ms
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

        // 5. Custom Delay (Wait for animations)
        if (delay > 0) {
            await new Promise(r => setTimeout(r, delay * 1000));
        }

        // 6. "Clean" the page (Remove Cookie Banners)
        await page.evaluate(() => {
            try {
                const selectors = [
                    '[id*="cookie"]', '[class*="cookie"]',
                    '[id*="consent"]', '[class*="consent"]',
                    '.cc-banner', '#onetrust-banner-sdk',
                    '[aria-label*="cookie"]', '[aria-label*="consent"]',
                    '#CybotCookiebotDialog'
                ];
                selectors.forEach(sel => {
                    const elements = document.querySelectorAll(sel);
                    elements.forEach(el => el.remove());
                });
                
                // Scroll to bottom to trigger lazy loading images
                window.scrollTo(0, document.body.scrollHeight);
            } catch (e) { console.log(e); }
        });

        // Wait a moment for lazy loaded images to appear after scroll
        await new Promise(r => setTimeout(r, 1000));
        
        // Scroll back to top
        await page.evaluate(() => window.scrollTo(0, 0));

        // 7. Take Screenshot
        const screenshotBuffer = await page.screenshot({
            type: 'jpeg',
            quality: 80,
            fullPage: fullPage
        });

        // 8. Return Image
        res.set('Content-Type', 'image/jpeg');
        res.send(screenshotBuffer);

    } catch (error) {
        console.error("Screenshot Error:", error);
        res.status(500).json({ error: "Failed to generate screenshot", details: error.message });
    } finally {
        if (browser) await browser.close();
    }
});

app.listen(PORT, () => {
    console.log(`Screenshot Service listening on port ${PORT}`);
});