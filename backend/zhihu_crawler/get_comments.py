from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import sys
import json
import io


def close_login_modal(driver):
    for _ in range(3):
        try:
            close_btn = WebDriverWait(driver, 1).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, '.Button.Modal-closeButton.Button--plain'))
            )
            close_btn.click()
            time.sleep(0.2)
            if not driver.find_elements(By.CSS_SELECTOR, '.Button.Modal-closeButton.Button--plain'):
                break
        except Exception:
            break

def extract_comments(driver):
    comments = set()
    containers = driver.find_elements(By.CSS_SELECTOR, '.Comments-container')
    for container in containers:
        comment_elems = container.find_elements(By.CSS_SELECTOR, '.CommentContent')
        for c in comment_elems:
            text = c.text.strip()
            if text:
                comments.add(text)
    return comments

def expand_all_comments(driver, timeout=30):
    all_comments = set()
    start_time = time.time()
    expand_count = 0
    while True:
        if time.time() - start_time > timeout:
            print("  达到最大展开时间限制")
            break
        close_login_modal(driver)
        expand_buttons = driver.find_elements(By.CSS_SELECTOR, '.Button.ContentItem-action')
        more_buttons = driver.find_elements(By.CSS_SELECTOR, '.Button.CommentView-more')
        all_buttons = expand_buttons + more_buttons
        clicked = 0
        for btn in all_buttons:
            try:
                driver.execute_script("arguments[0].scrollIntoView();", btn)
                time.sleep(0.2)
                close_login_modal(driver)
                btn.click()
                expand_count += 1
                print(f"  展开评论区 #{expand_count}")
                time.sleep(0.5)
                close_login_modal(driver)
                all_comments.update(extract_comments(driver))
                clicked += 1
            except Exception:
                continue
        driver.execute_script('window.scrollTo(0, document.body.scrollHeight);')
        time.sleep(1)
        close_login_modal(driver)
        if clicked == 0:
            print("  没有更多可展开的评论")
            break
    all_comments.update(extract_comments(driver))
    return all_comments

def get_comments(url):
    options = Options()
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_argument('--headless')
    options.add_argument('--disable-gpu')
    options.add_argument('--start-maximized')
    options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36')
    options.add_argument('--log-level=3')
    options.add_experimental_option('excludeSwitches', ['enable-logging', 'enable-automation'])
    options.add_experimental_option('useAutomationExtension', False)
    service = Service(ChromeDriverManager().install())
    service.creation_flags = 0x08000000  # CREATE_NO_WINDOW flag
    driver = webdriver.Chrome(service=service, options=options)

    driver.get(url)
    print("等待页面加载...")
    time.sleep(3)
    close_login_modal(driver)

    import re
    title = ''
    try:
        print("正在获取文章标题...")
        page_source = driver.page_source
        match = re.search(r'<title>(.*?)</title>', page_source, re.S)
        if match:
            raw_title = match.group(1).strip()
            if ' - ' in raw_title:
                title = raw_title.rsplit(' - ', 1)[0].strip()
            else:
                title = raw_title
            print(f"文章标题：{title}")
    except Exception:
        print("❌ 获取标题失败")
        pass

    print("开始展开评论区...")
    all_comments = expand_all_comments(driver, timeout=30)
    print(f"✓ 共获取 {len(all_comments)} 条评论\n")
    driver.quit()
    
    # 转换为新格式
    final_result = {
        f"zhihu_{int(time.time())}": {
            "title": title,
            "clusters": [
                {
                    "comments": list(all_comments)
                }
            ]
        }
    }
    
    return final_result

if __name__ == '__main__':
    url = None
    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        try:
            url = input("请输入知乎链接：")
        except KeyboardInterrupt:
            print("\n程序已退出")
            sys.exit(0)

    if url:
        result = get_comments(url)
        
        output_path = None
        if len(sys.argv) > 2:
            output_path = sys.argv[2]
            output_dir = os.path.dirname(output_path)
            if output_dir:
                os.makedirs(output_dir, exist_ok=True)
        else:
            # 默认路径
            output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, "result.json")
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"结果已保存至: {output_path}")
