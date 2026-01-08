from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import asyncio
import json
import os
import shutil
from web_engine import WebPlatformWar
from config import PLATFORM_NAME, API_KEY, API_BASE_URL
from openai import OpenAI
from knowledgeGraphExtractor import KnowledgeGraphExtractor

app = FastAPI()

# 知识库上传目录
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 处理知识库的后台任务
async def process_knowledge_base_task(file_path: str, platform_name: str):
    try:
        print(f"开始处理 {platform_name} 的知识库: {file_path}")
        
        # 目标知识库路径
        kb_path = f"{platform_name}_knowledge_base"
        os.makedirs(kb_path, exist_ok=True)
        
        # 读取上传的JSON
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        # 初始化提取器
        extractor = KnowledgeGraphExtractor(knowledge_base_path=kb_path)
        
        # 处理数据 (这是一个耗时操作，会调用LLM)
        # 注意：这里我们直接传入数据对象，而不是文件路径
        extractor.process_data(data)
        
        print(f"{platform_name} 知识库处理完成！")
        
        # 更新全局配置，让前端能感知到新平台 (虽然这里是硬编码的PLATFORM_NAME，但我们可以动态添加)
        if platform_name not in PLATFORM_NAME:
            PLATFORM_NAME[platform_name] = platform_name.capitalize()
            
    except Exception as e:
        print(f"处理知识库失败: {str(e)}")
        # 这里可以添加错误通知逻辑

@app.post("/api/upload_knowledge_base")
async def upload_knowledge_base(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    platform_name: str = "default"
):
    try:
        # 验证文件扩展名
        if not file.filename.endswith(".json"):
             raise HTTPException(status_code=400, detail="Only .json files are allowed")

        # 保存上传的文件
        file_path = os.path.join(UPLOAD_DIR, f"{platform_name}_{file.filename}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 启动后台任务处理知识库
        background_tasks.add_task(process_knowledge_base_task, file_path, platform_name)
        
        return {
            "message": "File uploaded successfully. Knowledge base processing started in background.",
            "platform": platform_name,
            "status": "processing"
        }
        
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class AnalysisRequest(BaseModel):
    topic: str
    history: List[dict] # List of {speaker, content}
    api_key: Optional[str] = None

@app.post("/api/analyze_personality")
async def analyze_personality(request: AnalysisRequest):
    try:
        # Construct history string
        history_str = "\n".join([f"{entry['speaker']}: {entry['content']}" for entry in request.history])
        
        # Load prompt
        prompt_path = "prompt/critic_personality.txt"
        if os.path.exists(prompt_path):
            with open(prompt_path, "r", encoding="utf-8") as f:
                prompt_template = f.read()
        else:
            # Fallback prompt if file not found
            prompt_template = """
            Analyze the debate history and provide a personality profile for each participant.
            Topic: {topic}
            History:
            {history}
            
            Return JSON with keys as platform names, containing 'persona' and 'analysis'.
            """

        final_prompt = prompt_template.replace("{topic}", request.topic).replace("{history}", history_str)
        
        # Initialize OpenAI client
        client = OpenAI(
            api_key=request.api_key or API_KEY,
            base_url=API_BASE_URL
        )
        
        response = client.chat.completions.create(
            model="moonshot-v1-8k",
            messages=[
                {"role": "system", "content": "You are an insightful critic. Output JSON only. Please ensure the content is in Simplified Chinese."},
                {"role": "user", "content": final_prompt}
            ],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        return result
        
    except Exception as e:
        print(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StartRequest(BaseModel):
    topic: str
    platforms: List[str]
    api_key: Optional[str] = None

# Store active debate instances
# Key: websocket client id (or just singleton for now)
active_debates = {}

@app.get("/api/config")
async def get_config():
    return {
        "platforms": PLATFORM_NAME,
        "default_platforms": list(PLATFORM_NAME.keys()),
        "has_api_key": False # Frontend should ask user or use env
    }

@app.get("/api/data/{platform}")
async def get_platform_data(platform: str):
    # Map platform names if necessary, assuming folder names match platform names in lower case + _knowledge_base
    # platform argument comes from frontend, likely "bilibili", "zhihu", "weibo"
    
    base_path = f"{platform}_knowledge_base"
    if not os.path.exists(base_path):
        # Try mapping if direct path doesn't exist (e.g. if platform is "Bilibili" but folder is "bilibili_knowledge_base")
        base_path = f"{platform.lower()}_knowledge_base"
        
    if not os.path.exists(base_path):
        raise HTTPException(status_code=404, detail=f"Platform data not found for {platform}")
    
    try:
        graph_path = os.path.join(base_path, "graph.json")
        communities_path = os.path.join(base_path, "communities.json")
        
        if not os.path.exists(graph_path) or not os.path.exists(communities_path):
             raise HTTPException(status_code=404, detail="Data files missing")

        with open(graph_path, "r", encoding="utf-8") as f:
            graph_data = json.load(f)
            # Check if data is wrapped in a top-level "graph" key (common in some NetworkX exports)
            if "graph" in graph_data and "nodes" in graph_data["graph"]:
                graph_data = graph_data["graph"]
                
        with open(communities_path, "r", encoding="utf-8") as f:
            communities_data = json.load(f)
            
        return {
            "graph": graph_data,
            "communities": communities_data
        }
    except Exception as e:
        print(f"Error loading data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {
        "message": "Platform War Backend is running",
        "docs": "/docs",
        "api_config": "/api/config"
    }

@app.websocket("/ws/debate")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    debate_instance: Optional[WebPlatformWar] = None
    debate_task: Optional[asyncio.Task] = None
    
    async def run_debate_loop(instance):
        try:
            async for msg in instance.run_debate():
                await websocket.send_text(msg)
        except Exception as e:
            print(f"Debate loop error: {e}")
            try:
                await websocket.send_text(json.dumps({"type": "error", "content": str(e)}))
            except:
                pass
        finally:
            # Send a signal that debate is done/stopped if needed?
            # Or just let it be.
            pass

    try:
        while True:
            # Wait for commands from frontend
            data = await websocket.receive_text()
            command = json.loads(data)
            
            if command.get("action") == "start":
                print(f"Received START command. Topic: {command.get('payload', {}).get('topic')}")
                
                # Stop existing if any
                if debate_instance:
                    print("Stopping existing debate instance...")
                    debate_instance.stop()
                if debate_task:
                    print("Cancelling existing debate task...")
                    debate_task.cancel()
                    try:
                        await debate_task
                    except asyncio.CancelledError:
                        pass
                
                # Explicitly clear reference
                debate_instance = None
                debate_task = None

                payload = command.get("payload", {})
                topic = payload.get("topic", "今天吃什么")
                platforms = payload.get("platforms", ["bilibili", "zhihu"])
                api_key = payload.get("api_key")
                max_rounds = payload.get("max_rounds")
                
                print(f"Creating NEW WebPlatformWar instance for topic: {topic}, max_rounds: {max_rounds}")
                debate_instance = WebPlatformWar(topic, platforms, api_key, max_rounds=max_rounds)
                
                # Run the debate loop in a background task
                debate_task = asyncio.create_task(run_debate_loop(debate_instance))
            
            elif command.get("action") == "stop":
                if debate_instance:
                    debate_instance.stop()
                if debate_task:
                    debate_task.cancel()
                    try:
                        await debate_task
                    except asyncio.CancelledError:
                        pass
                debate_task = None
                debate_instance = None
                await websocket.send_text(json.dumps({"type": "info", "content": "Debate stopped."}))

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if debate_instance:
            debate_instance.stop()
        if debate_task:
            debate_task.cancel()
            try:
                await debate_task
            except asyncio.CancelledError:
                pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
