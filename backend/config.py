import os
from dotenv import load_dotenv

current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, '.env')
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(current_dir), '.env')

load_dotenv(env_path)

API_BASE_URL = os.getenv("API_BASE_URL", "https://api.moonshot.cn/v1")
API_KEY = os.getenv("API_KEY") or os.getenv("KIMI_API_KEY") or ""
PLATFORM_NAME = {"bilibili": "B站", "weibo": "微博", "zhihu": "知乎", "default": "default"}
