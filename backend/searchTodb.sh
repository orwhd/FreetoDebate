#!/bin/bash

# 设置颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 接收搜索主题
if [ -z "$1" ]; then
    echo -e "${RED}错误: 请提供搜索主题作为参数${NC}"
    echo "用法: ./searchTodb.sh <搜索主题>"
    exit 1
fi

TOPIC="$1"
echo -e "${GREEN}开始执行搜索与入库流程，主题: ${TOPIC}${NC}"

# 创建数据目录
DATA_DIR="data"
mkdir -p "$DATA_DIR"

# 辅助函数：错误检查
check_status() {
    if [ $? -ne 0 ]; then
        echo -e "${RED}步骤失败: $1${NC}"
        exit 1
    fi
}

# ----------------------------------------------------------------
# 2. & 3. 执行爬虫
# ----------------------------------------------------------------

echo -e "\n${GREEN}[1/3] 开始爬取 B站...${NC}"
# B站流程: get_url -> get_comments
BILIBILI_URL=$(node bilibili_crawler/get_url.js "$TOPIC" | head -n 1)
if [ -z "$BILIBILI_URL" ]; then
    echo -e "${RED}B站未找到相关视频链接，跳过${NC}"
else
    echo "获取到B站链接: $BILIBILI_URL"
    node bilibili_crawler/get_comments.js "$BILIBILI_URL" "$DATA_DIR/result_bilibili.json"
    check_status "B站爬取失败"
fi

echo -e "\n${GREEN}[2/3] 开始爬取 微博...${NC}"
# 微博流程: get_comments 直接搜索
python weibo_crawler/get_comments.py "$TOPIC" "$DATA_DIR/result_weibo.json"
check_status "微博爬取失败"

echo -e "\n${GREEN}[3/3] 开始爬取 知乎...${NC}"
# 知乎流程: get_url -> get_comments
# 注意：zhihu_crawler/get_url.py 需要修改为输出纯链接，或者我们这里尝试捕获最后一行
# 假设 get_url.py 打印的是 Python list 字符串，我们需要提取第一个链接
# 这里我们先假设 get_url.py 已经被修改为只输出链接列表字符串，我们需要简单解析
ZHIHU_LINKS_RAW=$(python zhihu_crawler/get_url.py "$TOPIC")
# 提取第一个 http 链接 (简单正则)
ZHIHU_URL=$(echo "$ZHIHU_LINKS_RAW" | grep -o "https://www.zhihu.com/[^']*" | head -n 1)

if [ -z "$ZHIHU_URL" ]; then
    echo -e "${RED}知乎未找到相关链接，跳过${NC}"
else
    echo "获取到知乎链接: $ZHIHU_URL"
    python zhihu_crawler/get_comments.py "$ZHIHU_URL" "$DATA_DIR/result_zhihu.json"
    check_status "知乎爬取失败"
fi

# ----------------------------------------------------------------
# 4. 数据过滤
# ----------------------------------------------------------------

echo -e "\n${GREEN}[4] 开始过滤数据...${NC}"
for PLATFORM in bilibili weibo zhihu; do
    FILE="$DATA_DIR/result_${PLATFORM}.json"
    if [ -f "$FILE" ]; then
        echo "正在过滤 $PLATFORM 数据..."
        python filter_comments.py "$FILE" -o "$FILE"
        check_status "过滤 $PLATFORM 数据失败"
    fi
done

# ----------------------------------------------------------------
# 5. 知识图谱生成
# ----------------------------------------------------------------

echo -e "\n${GREEN}[5] 生成知识图谱...${NC}"
# 激活虚拟环境 (假设在根目录运行)
if [ -d "venv" ]; then
    source venv/bin/activate
fi

for PLATFORM in bilibili weibo zhihu; do
    INPUT_FILE="$DATA_DIR/result_${PLATFORM}.json"
    KB_DIR="${PLATFORM}_knowledge_base"
    
    if [ -f "$INPUT_FILE" ]; then
        echo "正在为 $PLATFORM 生成知识图谱..."
        # 确保输出目录存在
        mkdir -p "$KB_DIR"
        
        python knowledgeGraphExtractor.py "$INPUT_FILE" "$KB_DIR"
        check_status "生成 $PLATFORM 知识图谱失败"
        
        # 清理临时文件
        rm "$INPUT_FILE"
        echo "已清理临时文件: $INPUT_FILE"
    fi
done

echo -e "\n${GREEN}所有流程执行完毕！${NC}"
