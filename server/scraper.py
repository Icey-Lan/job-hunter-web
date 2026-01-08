import asyncio
import random
import json
from playwright.async_api import async_playwright

class BossScraper:
    def __init__(self):
        self.browser = None
        self.context = None

    async def start_browser(self):
        """Starts the Playwright browser."""
        if not self.browser:
            p = await async_playwright().start()
            # Use headless=False if you want to see the browser, or True for background
            # User requested "Antigravity background simulation", but maybe headless=False is safer for anti-bot?
            # Let's stick to headless=True for now, or make it configurable. 
            # Actually, headless browsers are easily detected. 
            # Recommendations for BossZhipin: headless=False or use stealth plugins.
            # For simplicity in this local tool context, let's try headless=True first, 
            # but usually local tools are better with headless=False so user can see what's happening.
            # I will set headless=True for "background" experience as requested.
            self.browser = await p.chromium.launch(headless=False)
            self.context = await self.browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )

    async def close_browser(self):
        """Closes the browser."""
        if self.browser:
            await self.browser.close()
            self.browser = None

    async def scrape_job(self, url: str):
        """Scrapes a single job URL."""
        if not self.browser:
            await self.start_browser()

        page = await self.context.new_page()
        try:
            print(f"Opening: {url}")
            await page.goto(url, timeout=30000)
            
            # Wait for content to load to avoid "document.body is null"
            try:
                await page.wait_for_load_state('domcontentloaded', timeout=10000)
            except:
                print("Warning: domcontentloaded timeout, proceeding...")

            # Random wait to simulate reading
            await asyncio.sleep(random.uniform(2, 4))

            # Scroll to trigger lazy loading (important for address and recruiter)
            try:
                await page.evaluate("if(document.body) window.scrollTo(0, 800)")
                await asyncio.sleep(1)
                await page.evaluate("if(document.body) window.scrollTo(0, document.body.scrollHeight)")
                await asyncio.sleep(2)
            except Exception as e:
                print(f"Scrolling error: {e}")
                # Continue even if scrolling fails, we might still get some data

            # Extraction Logic (Updated based on HTML analysis)
            data = await page.evaluate('''() => {
                const getSafeText = (selector) => {
                    const el = document.querySelector(selector);
                    return el ? el.innerText.trim() : '';
                };
                
                const getTextFromParent = (iconSelector) => {
                    const el = document.querySelector(iconSelector);
                    return el && el.parentElement ? el.parentElement.innerText.trim() : '';
                };

                const getJobTags = () => {
                    return Array.from(document.querySelectorAll('.job-keyword-list li')).map(el => el.innerText.trim());
                };

                // Benefits/Welfare tags extraction from job banner header
                const getBenefits = () => {
                    // Try to get the full benefits list first (hidden complete list)
                    let benefits = Array.from(document.querySelectorAll('.job-banner .tag-all.job-tags span'));
                    // Fallback to visible job-tags if tag-all is not present
                    if (benefits.length === 0) {
                        benefits = Array.from(document.querySelectorAll('.job-banner .job-tags span'));
                    }
                    return benefits.map(el => el.innerText.trim()).filter(text => text && text !== '...');
                };
                
                // Recruiter Name needs cleaning (remove status text if stuck together)
                let recruiterName = '';
                const recruiterEl = document.querySelector('.job-boss-info .name');
                if (recruiterEl) {
                    recruiterName = recruiterEl.childNodes[0].nodeValue.trim(); 
                }

                // Specialized Company Name Extraction (Defined OUTSIDE object literal)
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
                   
                   return '';
                };

                return {
                    job_title: getSafeText('.name h1'),
                    salary: getSafeText('.salary'),
                    company_name: getCompanyName(),
                    company_industry: getTextFromParent('.sider-company .icon-industry'),
                    company_size: getTextFromParent('.sider-company .icon-scale'),
                    company_financing: getTextFromParent('.sider-company .icon-stage'),
                    
                    location: getSafeText('.text-city'),
                    work_address: getSafeText('.location-address'),
                    
                    experience_required: getSafeText('.text-experiece'),
                    education_required: getSafeText('.text-degree'),
                    
                    job_tags: getJobTags(),
                    job_description: getSafeText('.job-sec-text'),
                    benefits: getBenefits(), 
                    
                    recruiter: {
                        name: recruiterName,
                        title: getSafeText('.boss-info-attr'),
                        status: getSafeText('.boss-active-time')
                    }
                };
            }''')

            data['job_url'] = url
            from datetime import datetime
            data['scraped_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            page_title = await page.title()
            data['debug_info'] = {
                'title': page_title,
                'url': page.url,
                'content_snippet': (await page.content())[:500]
            }

            # Validation: Check for Security Check or Empty Data
            if "请稍候" in page_title or "security-check" in page.url:
                raise Exception(f"Security Check Triggered (Title: {page_title})")
            
            if not data['job_title']:
                # Raising exception ensures TaskManager marks it as failed
                # and doesn't save the empty record.
                raise Exception("Scraping Failed: Job Title not found (Possible anti-bot or network issue)")

            return data

        except Exception as e:
            print(f"Error scraping {url}: {e}")
            raise e
        finally:
            await page.close()

# Singleton instance or just usage 
scraper = BossScraper()
