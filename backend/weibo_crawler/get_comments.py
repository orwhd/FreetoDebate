import time
import json
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv("../.env")
WEIBO_COOKIE = os.getenv("WEIBO_COOKIE", "")
KEYWORD = "友谊"
OUTPUT_FILE = "weibo_comments.json"

def strip_cookie_quotes(cookie_str):
    if cookie_str.startswith('"') and cookie_str.endswith('"'):
        return cookie_str[1:-1]
    if cookie_str.startswith("'") and cookie_str.endswith("'"):
        return cookie_str[1:-1]
    return cookie_str

WEIBO_COOKIE = strip_cookie_quotes(WEIBO_COOKIE)

def set_cookie(driver, cookie):
    driver.get("https://weibo.com/")
    for c in cookie.split(';'):
        if '=' in c:
            name, value = c.strip().split('=', 1)
            name = name.strip()
            value = value.strip()
            try:
                driver.add_cookie({'name': name, 'value': value, 'domain': '.weibo.com'})
            except Exception as e:
                print(f"设置cookie失败: {name}, 错误: {e}")
    driver.refresh()

def get_weibo_comments(keyword, cookie, max_page=10):
    result = {}
    page = 1
    while page <= max_page:
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--disable-gpu')
        driver = webdriver.Chrome(options=chrome_options)
        set_cookie(driver, cookie)
        search_url = f"https://s.weibo.com/weibo?q={keyword}&page={page}"
        print(f"正在访问: {search_url}")
        driver.get(search_url)
        time.sleep(5)
        cards = driver.find_elements(By.CSS_SELECTOR, ".card")
        print(f"第{page}页共找到{len(cards)}条微博卡片")
        page_texts = []
        for idx, card in enumerate(cards):
            try:
                content_elem = card.find_element(By.CSS_SELECTOR, '[node-type="feed_list_content"]')
                title = content_elem.text.strip()
                print(f"[第{page}页-{idx+1}] 微博正文: {title}")
                page_texts.append(title)
            except Exception as e:
                print(f"[第{page}页-{idx+1}] 未找到微博正文，跳过。异常: {e}")
                continue
        result[page] = page_texts
        driver.quit()
        print(f"第{page}页处理完毕。\n")
        page += 1
    print(f"全部处理完毕，共{max_page}页。")
    
    # 转换为新格式
    final_result = {
        f"weibo_{int(time.time())}": {
            "title": "{keyword}",
            "clusters": [
                {
                    "comments": []
                }
            ]
        }
    }
    
    # 将所有页面的评论合并
    all_comments = []
    for page_num in result:
        all_comments.extend(result[page_num])
    
    final_result[f"weibo_{int(time.time())}"]["clusters"][0]["comments"] = all_comments
    
    return final_result

if __name__ == "__main__":
    keyword = sys.argv[1] if len(sys.argv) > 1 else KEYWORD
    output_arg = sys.argv[2] if len(sys.argv) > 2 else None

    data = get_weibo_comments(keyword, WEIBO_COOKIE)
    
    if output_arg:
        output_path = output_arg
        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
    else:
        # 默认路径
        output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, "result.json")
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"结果已保存至: {output_path}")