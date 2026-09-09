import uuid
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import json

from auth import verify_token, verify_ws_token
from audio import preprocess_audio
from model import predict_voice_authenticity, predict_language
from risk_engine import calculate_risk
from database import init_db, log_event, get_history

app = FastAPI(title="VoiceShield API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For hackathon demo, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB (no-op for supabase since table creation is separate)
init_db()

@app.get("/")
def read_root():
    return {"message": "VoiceShield API is running"}

@app.post("/analyze-file")
async def analyze_file(
    file: UploadFile = File(...),
    is_caller_unknown: bool = Form(False),
    is_sensitive_request: bool = Form(False),
    urgency_flag: bool = Form(False),
    user=Depends(verify_token)
):
    # 1. Read file bytes
    file_bytes = await file.read()
    
    # 2. Preprocess
    audio_data = preprocess_audio(file_bytes)
    if audio_data is None:
        return {"error": "Failed to process audio file"}
        
    # Calculate duration
    # audio_data is a numpy array at 16kHz
    duration = len(audio_data) / 16000.0
    
    # 3. Model Inference (Mocked)
    voice_score = predict_voice_authenticity(audio_data)
    detected_language = predict_language(audio_data)
    
    # 4. Risk Engine
    risk_result = calculate_risk(voice_score, is_caller_unknown, is_sensitive_request, urgency_flag)
    
    # 5. Log to DB
    event_id = f"AUD-{str(uuid.uuid4())[:6]}"
    context_risk = {
        "unknown": is_caller_unknown,
        "sensitive": is_sensitive_request,
        "urgency": urgency_flag
    }
    
    log_event(
        event_id=event_id,
        user_id=user['uid'],
        mode="upload",
        duration=round(duration, 1),
        voice_score=voice_score,
        language=detected_language,
        context_risk=context_risk,
        final_risk=risk_result["final_risk"]
    )
    
    return {
        "spoof_score": round(voice_score * 100, 2),
        "detected_language": detected_language,
        "timestamp": datetime.utcnow().isoformat(),
        "final_risk": risk_result["final_risk"]
    }

@app.get("/history")
async def history(user=Depends(verify_token)):
    return get_history(user_id=user['uid'])


@app.websocket("/ws/analyze-audio")
async def websocket_endpoint(websocket: WebSocket):
    # Check token from query param (since WS doesn't easily support headers in browser standard API)
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return
        
    user = await verify_ws_token(token)
    if not user:
        await websocket.close(code=1008)
        return
        
    await websocket.accept()
    
    try:
        while True:
            # Receive binary audio chunk
            data = await websocket.receive_bytes()
            
            # (Mock) Expect frontend to send context as a JSON message right before/after
            # For simplicity in this WS, we assume default context for live stream unless modified.
            # In a robust system, you'd multiplex JSON and binary data.
            
            # Preprocess
            audio_data = preprocess_audio(data)
            
            if audio_data is not None:
                duration = len(audio_data) / 16000.0
                # Infer
                voice_score = predict_voice_authenticity(audio_data)
                detected_language = predict_language(audio_data)
                
                # Context (Mocking context inputs for realtime)
                risk_result = calculate_risk(voice_score, False, False, False)
                
                result = {
                    "voice_authenticity_score": round(voice_score * 100, 2),
                    "detected_language": detected_language,
                    "context_risk": risk_result["context_risk_count"],
                    "final_risk": risk_result["final_risk"],
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                # Log event
                event_id = f"AUD-{str(uuid.uuid4())[:6]}"
                log_event(
                    event_id=event_id,
                    user_id=user['uid'],
                    mode="realtime",
                    duration=round(duration, 1),
                    voice_score=voice_score,
                    language=detected_language,
                    context_risk={"unknown": False, "sensitive": False, "urgency": False},
                    final_risk=risk_result["final_risk"]
                )
                
                await websocket.send_json(result)
            else:
                await websocket.send_json({"error": "Failed to parse audio chunk"})
                
    except WebSocketDisconnect:
        print("Client disconnected")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
