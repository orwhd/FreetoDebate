const puppeteer = require('puppeteer');

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Referer': 'https://www.bilibili.com/',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
};

async function getBilibiliComments(url) {
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders(headers);
    await page.setViewport({ width: 1366, height: 768 });
    
    console.log(`正在访问页面: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log('页面加载完成，等待加载...');
    
    await autoScroll(page);
    
    const result = await page.evaluate(() => {
      // 获取标题
      const titleEl = document.querySelector('.video-title.special-text-indent');
      const title = titleEl ? titleEl.textContent.trim() : '未知标题';

      // 获取评论
      const textResults = [];
      function searchInShadowDom(root) {
        if (!root) return;
        if (root.shadowRoot) {
          const paragraphs = root.shadowRoot.querySelectorAll('p');
          paragraphs.forEach(p => {
            const spans = p.querySelectorAll('span');
            spans.forEach(span => {
              if (span.textContent && span.textContent.trim()) {
                textResults.push(span.textContent.trim());
              }
            });
          });
          Array.from(root.shadowRoot.querySelectorAll('*')).forEach(el => {
            searchInShadowDom(el);
          });
        }
      }
      const customElements = Array.from(document.querySelectorAll('*')).filter(el => {
        return el.tagName && el.tagName.includes('-');
      });
      customElements.forEach(el => {
        searchInShadowDom(el);
      });

      return {
        item_id: {
          title: title,
          clusters: [
            {
              comments: [...new Set(textResults)]
            }
          ]
        }
      };
    });
    
    if (Object.keys(result).length === 0) {
      console.log('未找到评论内容');
      await page.screenshot({ path: 'comments-screenshot.png' });
    } else {
      // 计算评论总数
      let totalComments = 0;
      for (const key in result) {
        if (result[key].clusters && result[key].clusters.length > 0) {
          totalComments += result[key].clusters[0].comments.length;
        }
      }
      console.log(`找到 ${totalComments} 条评论`);
    }
    
    return result;
  } catch (error) {
    console.error('爬取B站评论时出错:', error);
    return {};
  } finally {
    await browser.close();
  }
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

module.exports = getBilibiliComments;

if (require.main === module) {
  const url = process.argv[2] || 'https://www.bilibili.com/video/BV1nzqnYtEy1';
  const outputFilePath = process.argv[3]; // 获取输出路径参数

  getBilibiliComments(url).then(result => {
    // 确保输出目录存在
    const fs = require('fs');
    const path = require('path');
    
    let outputPath;
    if (outputFilePath) {
        // 如果指定了输出路径，直接使用
        outputPath = path.isAbsolute(outputFilePath) ? outputFilePath : path.join(process.cwd(), outputFilePath);
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)){
            fs.mkdirSync(outputDir, { recursive: true });
        }
    } else {
        // 默认路径
        const outputDir = path.join(__dirname, '../data');
        if (!fs.existsSync(outputDir)){
            fs.mkdirSync(outputDir, { recursive: true });
        }
        outputPath = path.join(outputDir, 'result.json');
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`结果已保存至: ${outputPath}`);
  });
}