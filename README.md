# Personal Music Downloader

Web application for downloading music from Yandex Music with official OAuth authorization.

## Features

- 🔐 Official Yandex OAuth authorization
- 📥 Download tracks, albums, and playlists
- 🎵 High quality audio (requires Yandex Music subscription)
- 💾 Persistent session storage with Supabase
- ⚡ Modern React + TypeScript frontend
- 🎨 Clean and minimalist UI

## Tech Stack

- **Backend**: Python Flask + yandex-music-api
- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Database**: Supabase
- **Auth**: Yandex OAuth

## Prerequisites

- Python 3.8+
- Node.js 18+
- Yandex Music subscription (for downloads)

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd PersonalMusicDownloader
```

2. Copy environment template and configure:
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials.

3. Install dependencies:
```bash
# Backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt

# Frontend
npm install
cd frontend && npm install && cd ..
```

## Running the Application

Start both backend and frontend with one command:

```bash
npm run dev
```

This will start:
- Backend on http://localhost:8000
- Frontend on http://localhost:3000

Open http://localhost:3000 in your browser.

## Usage

1. **Login**: Use OAuth to authorize with your Yandex account
2. **Browse**: View your playlists or paste a link to track/album/playlist
3. **Download**: Select tracks and download them

Downloaded tracks are saved in `backend/downloads/` folder.

## Supported Links

```
Track:     https://music.yandex.ru/album/123/track/456
Album:     https://music.yandex.ru/album/123
Playlist:  https://music.yandex.ru/users/username/playlists/123
```

## Project Structure

```
PersonalMusicDownloader/
├── .env                  # Configuration (not in git)
├── .env.example          # Configuration template
├── backend/              # Flask API
│   ├── app.py
│   ├── oauth_helper.py
│   ├── config.py
│   ├── requirements.txt
│   └── downloads/
├── frontend/             # React app
│   ├── src/
│   └── package.json
└── supabase/             # Database migrations
    └── migrations/
```

## Legal Notice

⚠️ This project is for educational purposes only. Only download music you have rights to. Do not distribute downloaded files. Respect copyright laws.

## Acknowledgments

- [MarshalX/yandex-music-api](https://github.com/MarshalX/yandex-music-api) - Yandex Music API library
