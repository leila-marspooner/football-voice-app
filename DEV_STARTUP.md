# ⚽ Football Voice App — Dev Startup Guide

This guide explains how to start the project locally with backend, database, and frontend all running together.  

---

## 1. Database (Postgres via Docker Compose)

Run Postgres in the background:

```bash
cd ~/football-voice-app
docker compose up
```

- Database runs on port `5433` (as in `.env`).  
- Redis will be added later (Phase 5).  

---

## 2. Backend (FastAPI with Uvicorn)

Start the backend server (in a new terminal tab):

```bash
cd ~/football-voice-app
source backend/venv/bin/activate     # activate Python virtualenv
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

- `--host 0.0.0.0` allows Expo Go on your phone to connect.  
- API docs available at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).  
- From phone: use `http://<your-LAN-IP>:8000/docs` (e.g. `192.168.1.13:8000`).  

---

## 3. Frontend (Expo React Native)

Run Expo (in a third terminal tab):

```bash
cd ~/football-voice-app/frontend
npx expo start -c
```

- Opens Metro Bundler in browser.  
- Scan QR code with **Expo Go** on your iOS/Android device.  
- Choose **LAN** mode in Expo DevTools (not “Tunnel” or “Local”).  

---

## 4. Environment & Networking

- Ensure `frontend/src/services/ApiClient.ts` uses the correct base URL:  
  ```ts
  const API_BASE_URL = "http://192.168.1.13:8000"; // replace with your Mac’s LAN IP
  ```
- Find your LAN IP (Mac Wi-Fi):  
  ```bash
  ipconfig getifaddr en0
  ```

---

## 5. Permissions

- **iOS**: Declared `NSMicrophoneUsageDescription` in `app.json`.  
- **Android**: Declared `RECORD_AUDIO` in `app.json`.  
- Expo will now show system permission prompts when recording audio.  

---

## 6. Typical Workflow

1. Start Postgres (`docker compose up`).  
2. Start backend (`uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000`).  
3. Start frontend (`npx expo start -c`).  
4. Open app on phone via Expo Go.  
5. Use `/transcribe` endpoint to test audio → transcript flow.  

---

## 7. Next Steps

- Wire **WhisperService.ts** to send recordings to `/transcribe`.  
- Display transcripts as events in **LiveMatchScreen**.  
- Add end-to-end test:  
  > Speak: “Goal Winston” → event appears in feed.  
