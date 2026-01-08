from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import re
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def clean_zhihu_url(url):
    match = re.match(r'^https?://(?:www\.)?zhihu\.com/(question|answer|p|zvideo|column)/([\w-]+)', url)
    if match:
        return f"https://www.zhihu.com/{match.group(1)}/{match.group(2)}"
    return None

def get_url(keyword, cookie):
    print(f"\n开始搜索关键词【{keyword}】的内容...")
    options = Options()
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_argument('--start-maximized')
    options.add_argument('--headless')
    options.add_argument('--disable-gpu')
    options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36')
    options.add_argument('--log-level=3')
    options.add_experimental_option('excludeSwitches', ['enable-logging', 'enable-automation'])
    options.add_experimental_option('useAutomationExtension', False)
    service = Service(ChromeDriverManager().install())
    service.creation_flags = 0x08000000  # CREATE_NO_WINDOW flag
    driver = webdriver.Chrome(service=service, options=options)

    driver.get('https://www.zhihu.com/')
    print("正在设置登录状态...")
    for c in cookie.split(';'):
        if '=' in c:
            name, value = c.strip().split('=', 1)
            driver.add_cookie({'name': name, 'value': value})
    url = f'https://www.zhihu.com/search?type=content&q={keyword}'
    print("正在加载搜索页面...")
    driver.get(url)
    try:
        print("等待页面元素加载...")
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, '.ContentItem.AnswerItem'))
        )
    except Exception:
        print("❌ 页面加载超时或未找到内容")
        driver.quit()
        return []

    print("正在提取链接...")
    items = driver.find_elements(By.CSS_SELECTOR, '.ContentItem.AnswerItem')
    links = set()
    for item in items:
        a_tags = item.find_elements(By.TAG_NAME, 'a')
        for a in a_tags:
            href = a.get_attribute('href')
            if href and 'zhihu.com' in href:
                clean = clean_zhihu_url(href)
                if clean:
                    links.add(clean)
    driver.quit()
    print(f"✓ 成功获取 {len(links)} 个有效链接\n")
    return list(links)

def get_zhihu_links(keyword, cookie):
    while True:
        try:
            links = get_url(keyword, cookie)
            if not links:
                cookie = input()
                continue
            return links
        except Exception:
            cookie = input()

import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)

if __name__ == '__main__':
    try:
        import sys
        if len(sys.argv) > 1:
            keyword = sys.argv[1]
        else:
            keyword = input("请输入搜索关键词：")

        my_cookie = os.getenv("ZHIHU_COOKIE")
        
        if not my_cookie:
            # 尝试手动输入，但如果是脚本调用（非交互式），这可能会卡住
            if sys.stdin.isatty():
                print("警告: 未在 .env 文件中找到 ZHIHU_COOKIE，尝试手动输入...")
                my_cookie = input("请输入知乎 cookie：")
            else:
                print("错误: 缺少 ZHIHU_COOKIE 且无法手动输入")
                sys.exit(1)
            
        links = get_zhihu_links(keyword, my_cookie)
        # 仅输出链接，每行一个，方便 Shell 处理
        for link in links:
            print(link)
    except KeyboardInterrupt:
        print("\n程序已退出")