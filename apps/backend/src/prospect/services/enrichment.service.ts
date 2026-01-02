import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { chromium, Browser, Page } from 'playwright';

export interface EnrichmentResult {
  email?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  phone?: string;
}

@Injectable()
export class EnrichmentService implements OnModuleDestroy {
  private readonly logger = new Logger(EnrichmentService.name);
  private browser: Browser | null = null;

  /**
   * Extract contact information from a website
   */
  async enrichFromWebsite(websiteUrl: string, fields: string[]): Promise<EnrichmentResult> {
    const result: EnrichmentResult = {};
    
    try {
      // Ensure URL has protocol
      const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
      
      this.logger.log(`Starting enrichment for: ${url}`);
      
      // Launch browser if not already running
      if (!this.browser) {
        this.browser = await chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
      }

      const context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });
      
      const page = await context.newPage();
      
      try {
        // Navigate to the website
        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        });

        // Get page content
        const content = await page.content();
        const pageText = await page.innerText('body').catch(() => '');

        // Extract requested fields
        if (fields.includes('email')) {
          result.email = await this.extractEmail(page, content, pageText);
        }

        if (fields.includes('instagram')) {
          result.instagram = await this.extractInstagram(page, content);
        }

        if (fields.includes('facebook')) {
          result.facebook = await this.extractFacebook(page, content);
        }

        if (fields.includes('linkedin')) {
          result.linkedin = await this.extractLinkedin(page, content);
        }

        if (fields.includes('phone')) {
          result.phone = this.extractPhone(pageText);
        }

        // Try to find contact page and extract more data
        const contactPageUrl = await this.findContactPage(page);
        if (contactPageUrl) {
          this.logger.log(`Found contact page: ${contactPageUrl}`);
          await page.goto(contactPageUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 10000,
          });
          
          const contactContent = await page.content();
          const contactText = await page.innerText('body').catch(() => '');

          // Re-extract from contact page if not found
          if (!result.email && fields.includes('email')) {
            result.email = await this.extractEmail(page, contactContent, contactText);
          }
          if (!result.phone && fields.includes('phone')) {
            result.phone = this.extractPhone(contactText);
          }
        }

      } finally {
        await context.close();
      }

      this.logger.log(`Enrichment complete: ${JSON.stringify(result)}`);
      return result;

    } catch (error) {
      this.logger.error(`Enrichment failed for ${websiteUrl}: ${error.message}`);
      return result;
    }
  }

  /**
   * Extract email from page (8.2)
   */
  private async extractEmail(page: Page, content: string, pageText: string): Promise<string | undefined> {
    // Try mailto links first
    try {
      const mailtoLinks = await page.$$eval('a[href^="mailto:"]', (links) => 
        links.map(link => link.getAttribute('href')?.replace('mailto:', '').split('?')[0])
      );
      
      if (mailtoLinks.length > 0 && mailtoLinks[0]) {
        return mailtoLinks[0];
      }
    } catch {
      // No mailto links found
    }

    // Try regex on page content
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = pageText.match(emailRegex) || content.match(emailRegex);
    
    if (emails && emails.length > 0) {
      // Filter out common non-business emails
      const businessEmail = emails.find(email => 
        !email.includes('example.com') &&
        !email.includes('sentry.io') &&
        !email.includes('wixpress.com') &&
        !email.includes('wordpress.com')
      );
      return businessEmail;
    }

    return undefined;
  }

  /**
   * Extract Instagram handle from page (8.3)
   */
  private async extractInstagram(page: Page, content: string): Promise<string | undefined> {
    // Try Instagram links
    try {
      const instagramLinks = await page.$$eval('a[href*="instagram.com"]', (links) => 
        links.map(link => link.getAttribute('href'))
      );
      
      for (const link of instagramLinks) {
        if (link) {
          const match = link.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
          if (match && match[1] && !['p', 'reel', 'stories', 'explore'].includes(match[1])) {
            return match[1];
          }
        }
      }
    } catch {
      // No instagram links found
    }

    // Try regex on content
    const instagramRegex = /instagram\.com\/([a-zA-Z0-9._]{1,30})/g;
    const matches = content.match(instagramRegex);
    if (matches && matches.length > 0) {
      const handle = matches[0].replace('instagram.com/', '');
      if (!['p', 'reel', 'stories', 'explore'].includes(handle)) {
        return handle;
      }
    }

    return undefined;
  }

  /**
   * Extract Facebook page from page
   */
  private async extractFacebook(page: Page, content: string): Promise<string | undefined> {
    try {
      const facebookLinks = await page.$$eval('a[href*="facebook.com"]', (links) => 
        links.map(link => link.getAttribute('href'))
      );
      
      for (const link of facebookLinks) {
        if (link && !link.includes('sharer') && !link.includes('share.php')) {
          const match = link.match(/facebook\.com\/([a-zA-Z0-9.]+)/);
          if (match && match[1]) {
            return match[1];
          }
        }
      }
    } catch {
      // No facebook links found
    }

    return undefined;
  }

  /**
   * Extract LinkedIn page from page
   */
  private async extractLinkedin(page: Page, content: string): Promise<string | undefined> {
    try {
      const linkedinLinks = await page.$$eval('a[href*="linkedin.com"]', (links) => 
        links.map(link => link.getAttribute('href'))
      );
      
      for (const link of linkedinLinks) {
        if (link) {
          const match = link.match(/linkedin\.com\/(company|in)\/([a-zA-Z0-9-]+)/);
          if (match && match[2]) {
            return `${match[1]}/${match[2]}`;
          }
        }
      }
    } catch {
      // No linkedin links found
    }

    return undefined;
  }

  /**
   * Extract phone number from text
   */
  private extractPhone(pageText: string): string | undefined {
    // Argentine phone patterns
    const phonePatterns = [
      /\+54\s*9?\s*\d{2,4}\s*\d{3,4}\s*\d{4}/g,  // +54 format
      /\(?\d{2,4}\)?\s*\d{3,4}[-\s]?\d{4}/g,      // Local format
      /\d{10,15}/g,                                // Plain digits
    ];

    for (const pattern of phonePatterns) {
      const matches = pageText.match(pattern);
      if (matches && matches.length > 0) {
        // Clean and validate
        const phone = matches[0].replace(/\D/g, '');
        if (phone.length >= 10 && phone.length <= 15) {
          return phone;
        }
      }
    }

    return undefined;
  }

  /**
   * Find contact page URL
   */
  private async findContactPage(page: Page): Promise<string | null> {
    const contactKeywords = ['contacto', 'contact', 'contactenos', 'contact-us'];
    
    try {
      const links = await page.$$eval('a', (anchors) => 
        anchors.map(a => ({
          href: a.getAttribute('href'),
          text: a.textContent?.toLowerCase() || '',
        }))
      );

      for (const link of links) {
        if (link.href) {
          const hrefLower = link.href.toLowerCase();
          const textLower = link.text;
          
          for (const keyword of contactKeywords) {
            if (hrefLower.includes(keyword) || textLower.includes(keyword)) {
              // Make absolute URL
              if (link.href.startsWith('/')) {
                return new URL(link.href, page.url()).href;
              } else if (link.href.startsWith('http')) {
                return link.href;
              }
            }
          }
        }
      }
    } catch {
      // No links found
    }

    return null;
  }

  /**
   * Close browser on module destroy
   */
  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
