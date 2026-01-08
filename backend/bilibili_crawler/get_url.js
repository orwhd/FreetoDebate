const axios = require('axios');
const cheerio = require('cheerio');

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Referer': 'https://www.bilibili.com/',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
};

function cleanBilibiliUrl(url) {
  const match = url.match(/^https?:\/\/www\.bilibili\.com\/video\/([a-zA-Z0-9]+)\/?/);
  if (match) {
    return `https://www.bilibili.com/video/${match[1]}/`;
  }
  return null;
}

async function crawlBilibili(keyword) {
  try {
    const encodedKeyword = encodeURIComponent(keyword);
    const url = `https://search.bilibili.com/all?vt=&keyword=${encodedKeyword}`;
    const response = await axios.get(url, { headers });
    const $ = cheerio.load(response.data);
    const videoCards = $('.bili-video-card__wrap');
    const videoLinks = [];
    videoCards.each((index, element) => {
      const linkElement = $(element).find('a');
      const href = linkElement.attr('href');
      if (href) {
        const fullUrl = href.startsWith('http') ? href : `https:${href}`;
        const cleanedUrl = cleanBilibiliUrl(fullUrl);
        if (cleanedUrl) {
          videoLinks.push(cleanedUrl);
        }
      }
    });
    const uniqueLinks = Array.from(new Set(videoLinks));
    return uniqueLinks;
  } catch (error) {
    return [];
  }
}

module.exports = crawlBilibili;

if (require.main === module) {
  const defaultKeyword = '友谊是什么';
  const keyword = process.argv[2] || defaultKeyword;
  crawlBilibili(keyword).then(links => {
    // 如果是脚本直接运行，输出第一个链接
    if (links.length > 0) {
        console.log(links[0]);
    }
  });
}