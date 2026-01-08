import asyncio
from playwright.async_api import async_playwright

# Test URL from user's logs
TEST_URL = "https://www.zhipin.com/job_detail/7a3ee13890e50b9303xy09W9E1pX.html"

async def main():
    async with async_playwright() as p:
        # Use headful mode to match the user's new config and bypass bot detection
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        print(f"Navigating to {TEST_URL}...")
        await page.goto(TEST_URL, timeout=60000)
        
        # Wait for network idle to ensure stability
        try:
            await page.wait_for_load_state('networkidle', timeout=30000)
        except:
            print("Network idle timeout, proceeding anyway...")
            
        await asyncio.sleep(5)
        
        # Scroll to ensure lazy content loads
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await asyncio.sleep(2)
        
        # Test the new extraction logic
        company_name = await page.evaluate('''() => {
            const getCompanyName = () => {
               // Strategy 1: Specific KA attribute (most precise)
               let el = document.querySelector('.sider-company .company-info a[ka="job-detail-company_custompage"]');
               if (el && el.innerText.trim()) return el.innerText.trim();
               
               // Strategy 2: Iterate sidebar links, ignore logo (img)
               const links = document.querySelectorAll('.sider-company .company-info a');
               for (const link of links) {
                   if (link.innerText.trim() && !link.querySelector('img')) {
                       return link.innerText.trim();
                   }
               }
               
               // Strategy 3: Business Info Section (Full registered name)
               el = document.querySelector('.level-list .company-name');
               if (el) {
                   return el.innerText.replace('公司名称', '').trim();
               }
               
               return 'FAILED TO FIND COMPANY NAME';
            };
            return getCompanyName();
        }''')
        
        print(f"EXTRACTED COMPANY NAME: {company_name}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
