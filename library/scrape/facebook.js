//————————————————————————//
  // Facebook Video Downloader
  // Directly scrapes Facebook's page — no third-party API needed
  //————————————————————————//
  const axios = require('axios');

  const _FB_HEADERS = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0'
  };

  function _cleanFbUrl(raw) {
      // Decode various Facebook encoding styles in embedded JSON
      return raw
          .replace(/\\u0025/g, '%')
          .replace(/\u0025/g, '%')
          .replace(/\u003A/gi, ':')
          .replace(/\u002F/gi, '/')
          .replace(/\u0026/gi, '&')
          .replace(/\u003D/gi, '=')
          .replace(/\//g, '/')
          .replace(/\\u003A/gi, ':')
          .replace(/\\u002F/gi, '/');
  }

  function _extractVideoUrls(html) {
      // Patterns Facebook uses to embed video URLs in page JSON
      const patterns = [
          // HD quality
          /playable_url_quality_hd[\"]+:[\"]+([^"\\]+)/,
          /browser_native_hd_url[\"]+:[\"]+([^"\\]+)/,
          /"hd_src_no_ratelimit":"([^"\\]+)"/,
          /"hd_src":{"__html":"([^"]+)"/,
          /"hd_src":"([^"\\]+)"/,
          // SD quality
          /playable_url[\"]+:[\"]+([^"\\]+)/,
          /browser_native_sd_url[\"]+:[\"]+([^"\\]+)/,
          /"sd_src_no_ratelimit":"([^"\\]+)"/,
          /"sd_src":"([^"\\]+)"/,
      ];
      
      let hd = null, sd = null;
      for (let i = 0; i < patterns.length; i++) {
          const m = html.match(patterns[i]);
          if (!m) continue;
          const url = _cleanFbUrl(m[1]);
          if (!url.includes('fbcdn.net') && !url.includes('facebook.com')) continue;
          if (i < 4 && !hd) hd = url;
          else if (i >= 4 && !sd) sd = url;
          if (hd && sd) break;
      }
      return { hd, sd };
  }

  function _extractTitle(html) {
      // Try Open Graph title first
      const og = html.match(/<meta property="og:title" content="([^"]+)"/);
      if (og) return og[1];
      // Fallback to page title
      const t = html.match(/<title>([^<]+)<\/title>/);
      return t ? t[1].replace(' | Facebook', '').trim() : 'Facebook Video';
  }

  const fdown = {
      download: async (url) => {
          try {
              const resp = await axios.get(url, {
                  headers: _FB_HEADERS,
                  timeout: 20000,
                  maxRedirects: 10,
                  responseType: 'text'
              });
              const html = resp.data;
              const { hd, sd } = _extractVideoUrls(html);
              
              if (!hd && !sd) {
                  // Private video or no video found
                  return [];
              }
              
              return [{
                  title: _extractTitle(html),
                  description: '',
                  duration: '',
                  hdQualityLink: hd || null,
                  normalQualityLink: sd || hd || null
              }];
          } catch (e) {
              console.log('[FB downloader error]', e.message);
              return [];
          }
      }
  };

  module.exports = { fdown };
  