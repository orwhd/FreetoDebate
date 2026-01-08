# Free to Debate (自由辩论)

Free to Debate 是一个多智能体自动辩论系统，基于 RAG (检索增强生成) 和知识图谱技术。它能够自动从 B站、微博、知乎等平台抓取真实评论数据，构建具有平台画像的 AI 角色，并让它们就指定话题展开激烈的辩论。

## 核心功能

*   **多平台数据采集**: 自动爬取 B站、微博、知乎 的评论数据。
*   **智能清洗**: 基于语义模型过滤垃圾评论，保留高质量观点。
*   **知识图谱构建**: 从非结构化评论中提取实体和关系，构建可视化的知识图谱。
*   **RAG 驱动辩论**: AI 角色基于知识库中的真实观点进行辩论，拒绝空谈。
*   **实时可视化**: 前端实时展示辩论过程、知识检索路径和社区画像。

## 项目结构

```
platform_war/
├── backend/                # 后端服务 (Python/FastAPI)
│   ├── data/               # 临时数据存储
│   ├── *_knowledge_base/   # 生成的知识库 (图谱+向量)
│   ├── bilibili_crawler/   # B站爬虫
│   ├── weibo_crawler/      # 微博爬虫
│   ├── zhihu_crawler/      # 知乎爬虫
│   ├── server.py           # 主服务入口
│   ├── searchTodb.sh       # 一键数据处理脚本
│   ├── filter_comments.py  # 评论清洗脚本
│   └── knowledgeGraphExtractor.py # 知识图谱生成器
├── frontend/               # 前端应用 (React/Vite)
├── run_project.sh          # 项目启动脚本
└── .env                    # 全局配置文件
```

## 快速开始

### 1. 环境准备
确保已安装：
*   Python 3.10+
*   Node.js 18+
*   Chrome 浏览器 (用于爬虫)

### 2. 配置 .env
在项目根目录创建或修改 `.env` 文件：

```env
# LLM API 配置 (推荐 Moonshot/Kimi)
API_KEY="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
API_BASE_URL="https://api.moonshot.cn/v1"

# 爬虫 Cookie 配置 (必填)
WEIBO_COOKIE="your_weibo_cookie_here"
ZHIHU_COOKIE="your_zhihu_cookie_here"
```

### 3. 数据采集与知识库构建
使用一键脚本抓取数据并生成知识库：

```bash
cd backend
./searchTodb.sh "你的辩论话题"
# 例如: ./searchTodb.sh "考研"
```
*该过程会自动执行爬虫、数据清洗和知识图谱构建*

### 4. 启动服务
回到根目录，运行启动脚本：

```bash
./run_project.sh
```
*   前端地址: http://localhost:5173
*   后端地址: http://localhost:8000

## 常见问题

1.  **爬虫失败/超时**:
    *   检查 `.env` 中的 Cookie 是否过期。
    *   检查网络是否通畅。
2.  **模型加载慢**:
    *   首次运行 `filter_comments.py` 时会自动下载语义模型 (约 100MB)，请耐心等待。
3.  **第一次对话请求慢：**
    - 做第一次Agent请求速率慢，是因为需要加载`embeding`模型，请耐心等待。
