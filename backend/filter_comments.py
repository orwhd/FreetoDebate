import json
import sys
import os
import argparse
from typing import Dict, List, Any
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# 定义无意义评论的参考样本
MEANINGLESS_SAMPLES = [
    "转发微博", "打卡", "沙发", "哈哈哈哈", "支持", "赞", "好", "dd", "求", "蹲",
    "mark", "111", "666", "来了", "顶", "不明觉厉", "路过", "围观",
    "转发", "转发。", "转", "转发微博。", "转发微博", "Repost",
    "。。。", "？？？", "！！！", "表情", "[doge]", "[二哈]",
    "感谢分享", "太棒了", "厉害", "牛逼", "卧槽", "绝了"
]

def load_model():
    """加载语义嵌入模型"""
    print("正在加载语义模型 (BAAI/bge-small-zh-v1.5)...")
    try:
        # 使用较小的中文模型以保证速度和效果的平衡
        model = SentenceTransformer('BAAI/bge-small-zh-v1.5')
        return model
    except Exception as e:
        print(f"模型加载失败: {e}")
        print("尝试使用备用模型 (paraphrase-multilingual-MiniLM-L12-v2)...")
        return SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

def is_meaningful(text: str, model: SentenceTransformer, meaningless_embeddings: np.ndarray, threshold: float = 0.6, min_length: int = 30) -> bool:
    """
    基于语义相似度和长度判断评论是否有意义
    
    Args:
        text: 待检测文本
        model: 嵌入模型
        meaningless_embeddings: 无意义样本的嵌入向量矩阵
        threshold: 相似度阈值，超过此值则认为无意义 (默认0.6)
        min_length: 最小评论长度 (默认30)
    
    Returns:
        bool: True表示有意义，False表示无意义
    """
    # 1. 基础规则过滤 (保留极短文本过滤以提高效率)
    if len(text) < min_length:
        return False
        
    # 2. 语义过滤
    text_embedding = model.encode([text])
    
    # 计算与无意义样本的最大相似度
    similarities = cosine_similarity(text_embedding, meaningless_embeddings)[0]
    max_similarity = np.max(similarities)
    
    # 如果与任一无意义样本过于相似，则判定为无意义
    if max_similarity > threshold:
        return False
        
    return True

def filter_comments(input_file: str, output_file: str, threshold: float = 0.6, min_length: int = 30):
    """
    过滤JSON文件中的评论
    """
    try:
        if not os.path.exists(input_file):
            print(f"错误: 文件 '{input_file}' 不存在")
            return

        # 加载模型和预计算无意义样本向量
        model = load_model()
        print("预计算无意义样本向量...")
        meaningless_embeddings = model.encode(MEANINGLESS_SAMPLES)

        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        filtered_data = {}
        total_original = 0
        total_filtered = 0

        print(f"开始过滤 (阈值: {threshold}, 最小长度: {min_length})...")
        
        for item_id, item_data in data.items():
            title = item_data.get("title", "")
            original_clusters = item_data.get("clusters", [])
            new_clusters = []

            for cluster in original_clusters:
                comments = cluster.get("comments", [])
                total_original += len(comments)
                
                valid_comments = []
                # 批量处理以提高效率 (可选优化，这里逐条处理逻辑更清晰)
                for i, comment in enumerate(comments):
                    clean_comment = comment.strip()
                    
                    if is_meaningful(clean_comment, model, meaningless_embeddings, threshold, min_length):
                        valid_comments.append(clean_comment)
                    
                    if (i + 1) % 100 == 0:
                        print(f"已处理 {i + 1}/{len(comments)} 条评论...", end='\r')

                if valid_comments:
                    new_clusters.append({"comments": valid_comments})
                    total_filtered += len(valid_comments)

            if new_clusters:
                filtered_data[item_id] = {
                    "title": title,
                    "clusters": new_clusters
                }

        # 保存结果
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(filtered_data, f, ensure_ascii=False, indent=2)

        print(f"\n处理完成！")
        print(f"输入文件: {input_file}")
        print(f"输出文件: {output_file}")
        print(f"原始评论数: {total_original}")
        print(f"保留评论数: {total_filtered}")
        print(f"过滤比例: {((total_original - total_filtered) / total_original * 100):.1f}%" if total_original > 0 else "N/A")

    except Exception as e:
        print(f"发生错误: {str(e)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="JSON评论清洗工具 (基于语义模型)")
    parser.add_argument("input", help="输入JSON文件路径")
    parser.add_argument("-o", "--output", help="输出JSON文件路径")
    parser.add_argument("-t", "--threshold", type=float, default=0.6, help="语义相似度阈值 (默认: 0.6，越低过滤越严格)")
    parser.add_argument("-l", "--min-length", type=int, default=30, help="最小评论长度 (默认: 30)")
    
    args = parser.parse_args()
    
    output_path = args.output
    if not output_path:
        dir_name = os.path.dirname(args.input)
        base_name = os.path.basename(args.input)
        output_path = os.path.join(dir_name, f"semantic_filtered_{base_name}")
        
    filter_comments(args.input, output_path, args.threshold, args.min_length)
