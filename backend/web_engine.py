import asyncio
from typing import AsyncGenerator, List, Dict, Optional
from chat import Chat, DialogueEntry
from config import PLATFORM_NAME, API_KEY, API_BASE_URL
import json

class WebPlatformWar:
    def __init__(self, topic: str, selected_platforms: List[str], api_key: Optional[str] = None, max_rounds: Optional[int] = None):
        self.topic = topic
        self.platforms = [p for p in selected_platforms if p in PLATFORM_NAME]
        self.characters: Dict[str, Chat] = {}
        self.dialogue_history: List[DialogueEntry] = []
        self.is_running = True
        self.max_rounds = max_rounds
        
        # Allow overriding API Key
        self.api_key = api_key if api_key else API_KEY
        
        # Initialize characters
        self._initialize_characters()

    def _initialize_characters(self):
        """Initialize selected platform characters"""
        print(f"Initializing characters for topic: {self.topic}")
        for platform_key in self.platforms:
            # We need to inject the API key into the Chat instance if provided
            # Note: The original Chat class uses global API_KEY from config.
            # We might need to monkeypatch or modify Chat if we want per-session keys without editing chat.py.
            # For now, we assume global config or we will handle it by setting the client manually if needed.
            
            # Create character
            print(f"Creating new Chat instance for {platform_key}")
            char = Chat(character_name=platform_key, api_key=self.api_key)
            
            self.characters[platform_key] = char

    async def run_debate(self) -> AsyncGenerator[str, None]:
        """
        Async generator that yields JSON strings representing events.
        """
        current_idx = 0
        round_count = 1
        
        yield json.dumps({
            "type": "system", 
            "content": f"Debate initialized: {self.topic}",
            "platforms": self.platforms
        })

        while self.is_running:
            if self.max_rounds and round_count > self.max_rounds:
                yield json.dumps({
                    "type": "info",
                    "content": "Max rounds reached. Debate finished."
                })
                self.is_running = False
                break

            current_platform = self.platforms[current_idx]
            current_character = self.characters[current_platform]
            
            yield json.dumps({
                "type": "turn_start",
                "platform": current_platform,
                "round": round_count,
                "name": PLATFORM_NAME[current_platform]
            })

            # Process response
            # Note: generate_response is a synchronous generator in the original code.
            # We should ideally run it in a threadpool to not block the event loop,
            # but for simplicity in this MVP, we will iterate it directly.
            # To avoid blocking the websocket heartbeat, we can use asyncio.sleep(0) occasionally.
            
            full_response = ""
            
            try:
                # The original generate_response yields sentences
                # We need to be careful: original uses 'yield' for sentences.
                
                # We wrap the synchronous generator
                iterator = current_character.generate_response(
                    dialogue_group=self.dialogue_history.copy(),
                    topic=self.topic
                )
                
                for sentence in iterator:
                    if not self.is_running:
                        break
                        
                    full_response += sentence
                    
                    yield json.dumps({
                        "type": "fragment",
                        "platform": current_platform,
                        "content": sentence,
                        "timestamp": asyncio.get_event_loop().time()
                    })
                    
                    # Give control back to event loop briefly
                    await asyncio.sleep(0.01)
                
                # Append to history
                if full_response:
                    entry = DialogueEntry(
                        speaker=PLATFORM_NAME[current_character.character_name], 
                        content=full_response.strip()
                    )
                    self.dialogue_history.append(entry)
                    
                    yield json.dumps({
                        "type": "turn_end",
                        "platform": current_platform,
                        "full_content": full_response
                    })

            except Exception as e:
                yield json.dumps({
                    "type": "error",
                    "content": str(e)
                })
                break

            # Move to next platform
            current_idx = (current_idx + 1) % len(self.platforms)
            if current_idx == 0:
                round_count += 1
            
            # Small pause between turns for dramatic effect
            await asyncio.sleep(1)

    def stop(self):
        self.is_running = False
