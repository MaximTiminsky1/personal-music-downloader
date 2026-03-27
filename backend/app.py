from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from yandex_music import Client
import requests
import os
import re
from pathlib import Path
from oauth_helper import YandexOAuthHelper
from supabase_client import SupabaseTokenStorage
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='../frontend/dist', static_url_path='')

CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",
            os.getenv("FRONTEND_URL", "")
        ],
        "methods": ["GET", "POST", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

DOWNLOADS_DIR = Path('./downloads')
DOWNLOADS_DIR.mkdir(exist_ok=True)

oauth_helper = YandexOAuthHelper()
token_storage = SupabaseTokenStorage()

active_clients = {}

def get_client_for_session(session_id: str):
    if session_id in active_clients:
        return active_clients[session_id]

    token = token_storage.get_token(session_id)
    if token:
        client = init_client_with_token(token)
        if client:
            active_clients[session_id] = client
            return client

    return None

def convert_session_to_oauth(session_id):
    try:
        session = requests.Session()
        session.cookies.set('Session_id', session_id, domain='.yandex.ru')

        url = 'https://mobileproxy.passport.yandex.net/1/bundle/oauth/token_by_sessionid'
        payload = {
            'client_id': 'c0ebe342af7d48fbbbfcf2d2eedb8f9e',
            'client_secret': 'ad0a908f0aa341a182a37ecd75bc319e'
        }

        response = session.post(url, data=payload)

        if response.status_code == 200:
            data = response.json()
            x_token = data.get('access_token')

            if x_token:
                url = 'https://oauth.mobile.yandex.net/1/token'
                payload = {
                    'client_secret': '53bc75238f0c4d08a118e51fe9203300',
                    'client_id': '23cabbbdc6cd418abb4b39c32c41195d',
                    'grant_type': 'x-token',
                    'access_token': x_token
                }
                response = requests.post(url, data=payload)

                if response.status_code == 200:
                    music_data = response.json()
                    return music_data.get('access_token')

        return None
    except Exception as e:
        print(f"Error converting session to oauth: {e}")
        return None


def init_client_with_token(token: str):
    try:
        if token.startswith('3:') and '|' in token:
            print("Detected Session_id, trying direct authentication...")
            session = requests.Session()
            session.cookies.set('Session_id', token, domain='.yandex.ru', path='/')

            client = Client()
            client._session = session

            response = session.get('https://api.music.yandex.ru/account/status')
            if response.status_code == 200:
                print("Successfully authenticated with Session_id")
                return client
            else:
                print(f"Failed to authenticate: {response.status_code}")
                return None

        client = Client(token).init()
        return client
    except Exception as e:
        print(f"Error initializing client: {e}")
        import traceback
        traceback.print_exc()
        return None

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/auth', methods=['POST'])
def auth():
    data = request.json
    token = data.get('token', '').strip()
    session_id = data.get('session_id', '').strip()

    if not token:
        return jsonify({'success': False, 'error': 'Token not specified'}), 400

    if not session_id:
        return jsonify({'success': False, 'error': 'Session ID not specified'}), 400

    client = init_client_with_token(token)
    if not client:
        return jsonify({'success': False, 'error': 'Invalid token'}), 401

    if token_storage.save_token(session_id, token):
        active_clients[session_id] = client
        return jsonify({'success': True, 'message': 'Authorization successful'})
    else:
        return jsonify({'success': False, 'error': 'Error saving token'}), 500

@app.route('/api/get-auth-url', methods=['GET'])
def get_auth_url():
    try:
        auth_url = oauth_helper.get_auth_url()
        return jsonify({
            'success': True,
            'auth_url': auth_url,
            'message': 'Open this link in browser and authorize'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/oauth/callback')
def oauth_callback():
    code = request.args.get('code')
    error = request.args.get('error')

    print(f"[DEBUG CALLBACK] Full request URL: {request.url}")
    print(f"[DEBUG CALLBACK] Query params: {dict(request.args)}")
    print(f"[DEBUG CALLBACK] Code received: '{code}' (length: {len(code) if code else 0})")
    print(f"[DEBUG CALLBACK] Error: {error}")

    if error:
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Authorization Error</title>
            <meta charset="UTF-8">
            <style>
                body {{
                    margin: 0;
                    padding: 20px;
                    font-family: Arial, sans-serif;
                    background: linear-gradient(135deg, #f44336 0%, #e91e63 100%);
                    color: white;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                }}
                .container {{
                    text-align: center;
                    padding: 40px;
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: 20px;
                    backdrop-filter: blur(10px);
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Authorization Error</h1>
                <p>{error}</p>
                <p>Window will close automatically...</p>
            </div>
            <script>
                if (window.opener) {{
                    window.opener.postMessage({{
                        type: 'oauth_error',
                        error: '{error}'
                    }}, window.location.origin);
                }}
                setTimeout(() => window.close(), 3000);
            </script>
        </body>
        </html>
        """

    if not code:
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Error</title>
            <meta charset="UTF-8">
            <style>
                body {{
                    margin: 0;
                    padding: 20px;
                    font-family: Arial, sans-serif;
                    background: linear-gradient(135deg, #f44336 0%, #e91e63 100%);
                    color: white;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                }}
                .container {{
                    text-align: center;
                    padding: 40px;
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: 20px;
                    backdrop-filter: blur(10px);
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Code not received</h1>
                <p>Try again</p>
            </div>
            <script>
                if (window.opener) {{
                    window.opener.postMessage({{
                        type: 'oauth_error',
                        error: 'Code not received'
                    }}, window.location.origin);
                }}
                setTimeout(() => window.close(), 3000);
            </script>
        </body>
        </html>
        """

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Authorization Successful</title>
        <meta charset="UTF-8">
        <style>
            body {{
                margin: 0;
                padding: 20px;
                font-family: Arial, sans-serif;
                background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
                color: white;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }}
            .container {{
                text-align: center;
                padding: 40px;
                background: rgba(255, 255, 255, 0.15);
                border-radius: 20px;
                backdrop-filter: blur(10px);
            }}
            .checkmark {{
                font-size: 80px;
                margin-bottom: 20px;
                animation: scaleIn 0.5s ease-out;
            }}
            @keyframes scaleIn {{
                from {{
                    transform: scale(0);
                    opacity: 0;
                }}
                to {{
                    transform: scale(1);
                    opacity: 1;
                }}
            }}
            h1 {{
                margin: 0;
                font-size: 28px;
            }}
            p {{
                margin: 10px 0;
                opacity: 0.9;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="checkmark">✓</div>
            <h1>Authorization Successful!</h1>
            <p>Window will close automatically...</p>
        </div>
        <script>
            if (window.opener) {{
                window.opener.postMessage({{
                    type: 'oauth_success',
                    code: '{code}'
                }}, window.location.origin);
            }}

            setTimeout(() => {{
                window.close();
            }}, 1500);
        </script>
    </body>
    </html>
    """


@app.route('/oauth/start')
def oauth_start():
    auth_url = oauth_helper.get_auth_url()

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Yandex Authorization</title>
        <meta charset="UTF-8">
        <style>
            body {{
                margin: 0;
                padding: 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }}
            .container {{
                text-align: center;
                padding: 40px;
                background: rgba(255, 255, 255, 0.15);
                border-radius: 20px;
                backdrop-filter: blur(10px);
                max-width: 600px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            }}
            h1 {{
                margin: 0 0 20px 0;
                font-size: 28px;
                font-weight: 600;
            }}
            .step {{
                background: rgba(255, 255, 255, 0.1);
                padding: 20px;
                border-radius: 12px;
                margin: 20px 0;
                text-align: left;
            }}
            .step-number {{
                display: inline-block;
                width: 30px;
                height: 30px;
                background: white;
                color: #667eea;
                border-radius: 50%;
                text-align: center;
                line-height: 30px;
                font-weight: bold;
                margin-right: 10px;
            }}
            button {{
                background: white;
                color: #667eea;
                border: none;
                padding: 15px 40px;
                font-size: 18px;
                font-weight: 600;
                border-radius: 10px;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
                margin: 10px;
            }}
            button:hover {{
                transform: translateY(-2px);
                box-shadow: 0 4px 20px rgba(255, 255, 255, 0.3);
            }}
            button:active {{
                transform: translateY(0);
            }}
            .big-button {{
                background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
                color: white;
                font-size: 24px;
                padding: 25px 50px;
                margin: 30px 0;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
                animation: pulse 2s infinite;
            }}
            @keyframes pulse {{
                0%, 100% {{
                    transform: scale(1);
                }}
                50% {{
                    transform: scale(1.05);
                }}
            }}
            input[type="text"] {{
                width: 100%;
                padding: 15px;
                font-size: 16px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.1);
                color: white;
                margin: 15px 0;
                box-sizing: border-box;
            }}
            input[type="text"]::placeholder {{
                color: rgba(255, 255, 255, 0.6);
            }}
            input[type="text"]:focus {{
                outline: none;
                border-color: rgba(255, 255, 255, 0.6);
                background: rgba(255, 255, 255, 0.15);
            }}
            .success {{
                background: rgba(76, 175, 80, 0.3);
                padding: 15px;
                border-radius: 10px;
                margin: 20px 0;
                display: none;
            }}
            @keyframes scaleIn {{
                from {{
                    transform: scale(0);
                    opacity: 0;
                }}
                to {{
                    transform: scale(1);
                    opacity: 1;
                }}
            }}
            .spinner {{
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-top: 4px solid white;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 20px auto;
                display: none;
            }}
            @keyframes spin {{
                0% {{ transform: rotate(0deg); }}
                100% {{ transform: rotate(360deg); }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Login to Yandex.Music</h1>

            <div id="start-screen">
                <h1>Login to Yandex.Music</h1>
                <div class="step">
                    <span class="step-number">1</span>
                    Click the button below - Yandex will open in a new tab
                </div>
                <div class="step">
                    <span class="step-number">2</span>
                    Log in to your Yandex account
                </div>
                <div class="step">
                    <span class="step-number">3</span>
                    Return to <strong>this window</strong> - the code will be detected automatically
                </div>
                <button onclick="openYandexAuth()" id="auth-btn" style="width: 100%; font-size: 20px; padding: 20px;">
                    Login via Yandex in new tab
                </button>
                <p style="margin-top: 15px; font-size: 14px; opacity: 0.8;">
                    Don't close this window! Return here after logging in.
                </p>
            </div>

            <div id="waiting-screen" style="display: none;">
                <div class="spinner"></div>
                <h1>Waiting for authorization...</h1>
                <p style="font-size: 18px; margin: 20px 0;">
                    Log in to Yandex in the tab that just opened
                </p>
                <p style="font-size: 16px; opacity: 0.8;">
                    After logging in, copy the <strong>full URL</strong> from the address bar of that tab and paste it here:
                </p>
                <input type="text" id="manual-code-input" placeholder="Paste the link: https://music.yandex.ru/?code=..."
                       style="width: 100%; padding: 15px; margin: 15px 0; font-size: 16px; border: 2px solid rgba(255,255,255,0.3); border-radius: 10px; background: rgba(255,255,255,0.1); color: white; box-sizing: border-box;">
                <button onclick="extractManualCode()" style="width: 100%; font-size: 18px; padding: 18px;">
                    Continue
                </button>
            </div>

            <div id="code-detected-screen" style="display: none;">
                <h1>Authorization code found!</h1>
                <p style="font-size: 18px; margin: 20px 0;">
                    Click the big button below to complete authorization
                </p>
                <button onclick="sendDetectedCode()" class="big-button" id="send-code-btn">
                    Complete Authorization
                </button>
                <p style="font-size: 14px; opacity: 0.8; margin-top: 20px;">
                    Code: <code id="detected-code" style="background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 5px;"></code>
                </p>
            </div>

            <div id="progress-screen" style="display: none;">
                <div class="spinner" id="spinner"></div>
                <h1>Completing authorization...</h1>
            </div>

            <div id="success-screen" style="display: none;">
                <div style="font-size: 100px; margin-bottom: 20px; animation: scaleIn 0.5s;">✓</div>
                <h1>Authorization Successful!</h1>
                <p>Window will close automatically...</p>
            </div>
        </div>

        <script>
            const authUrl = "{auth_url}";
            let detectedCode = null;
            let yandexWindow = null;

            window.addEventListener('load', checkForCode);

            function checkForCode() {{
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');

                if (code && code !== detectedCode) {{
                    detectedCode = code;
                    showCodeDetected(code);
                }}
            }}

            function showCodeDetected(code) {{
                document.getElementById('start-screen').style.display = 'none';
                document.getElementById('waiting-screen').style.display = 'none';
                document.getElementById('code-detected-screen').style.display = 'block';
                document.getElementById('detected-code').textContent = code;
            }}

            function openYandexAuth() {{
                yandexWindow = window.open(authUrl, '_blank');

                document.getElementById('start-screen').style.display = 'none';
                document.getElementById('waiting-screen').style.display = 'block';

                setTimeout(() => {{
                    const input = document.getElementById('manual-code-input');
                    if (input) input.focus();
                }}, 500);
            }}

            function extractManualCode() {{
                const input = document.getElementById('manual-code-input').value.trim();

                if (!input) {{
                    alert('Please paste the link from the address bar');
                    return;
                }}

                let code = '';
                try {{
                    const url = new URL(input.startsWith('http') ? input : 'https://music.yandex.ru/' + input);
                    code = url.searchParams.get('code');
                }} catch (e) {{
                    const match = input.match(/code=([^&\\s]+)/);
                    if (match) {{
                        code = match[1];
                    }} else {{
                        code = input;
                    }}
                }}

                if (!code) {{
                    alert('Could not find code in the link. Please check.');
                    return;
                }}

                detectedCode = code;
                showCodeDetected(code);

                if (yandexWindow && !yandexWindow.closed) {{
                    yandexWindow.close();
                }}
            }}

            function sendDetectedCode() {{
                if (!detectedCode) {{
                    alert('Code not found');
                    return;
                }}

                document.getElementById('code-detected-screen').style.display = 'none';
                document.getElementById('progress-screen').style.display = 'block';

                if (window.opener) {{
                    window.opener.postMessage({{
                        type: 'oauth_success',
                        code: detectedCode
                    }}, window.location.origin);

                    showSuccess();
                }} else {{
                    fetch('/api/exchange-code', {{
                        method: 'POST',
                        headers: {{ 'Content-Type': 'application/json' }},
                        body: JSON.stringify({{ code: detectedCode }})
                    }})
                    .then(r => r.json())
                    .then(data => {{
                        if (data.success) {{
                            showSuccess();
                            setTimeout(() => window.location.href = '/', 2000);
                        }} else {{
                            alert('Error: ' + data.error);
                            document.getElementById('progress-screen').style.display = 'none';
                            document.getElementById('code-detected-screen').style.display = 'block';
                        }}
                    }})
                    .catch(err => {{
                        alert('Connection error');
                        document.getElementById('progress-screen').style.display = 'none';
                        document.getElementById('code-detected-screen').style.display = 'block';
                    }});
                }}
            }}

            function showSuccess() {{
                document.getElementById('progress-screen').style.display = 'none';
                document.getElementById('success-screen').style.display = 'block';

                setTimeout(() => {{
                    window.close();
                }}, 2000);
            }}
        </script>
    </body>
    </html>
    """


@app.route('/api/exchange-code', methods=['POST'])
def exchange_code():
    data = request.json
    code = data.get('code', '').strip()

    print(f"[DEBUG] Received code: '{code}' (length: {len(code)})")
    print(f"[DEBUG] Full request data: {data}")

    if not code:
        return jsonify({'success': False, 'error': 'Confirmation code not specified'}), 400

    try:
        if 'http' in code or '?' in code or '#' in code:
            print(f"[DEBUG] Code looks like URL, extracting...")
            extracted_code = oauth_helper.extract_code_from_url(code)
            if extracted_code:
                print(f"[DEBUG] Extracted code: '{extracted_code}'")
                code = extracted_code
            else:
                print(f"[DEBUG] Failed to extract code from URL")

        print(f"[DEBUG] Final code to exchange: '{code}'")
        result = oauth_helper.exchange_code_for_token(code)
        print(f"[DEBUG] OAuth exchange result: {result}")

        if not result.get('success'):
            return jsonify(result), 400

        token = result['access_token']
        session_id = data.get('session_id')

        if not session_id:
            return jsonify({'success': False, 'error': 'Session ID not specified'}), 400

        client = init_client_with_token(token)
        if client:
            token_storage.save_token(session_id, token)
            active_clients[session_id] = client

            return jsonify({
                'success': True,
                'message': 'Authorization successful!',
                'uid': result.get('uid')
            })
        else:
            return jsonify({'success': False, 'error': 'Token received but does not work with music API'}), 500

    except Exception as e:
        return jsonify({'success': False, 'error': f'Error: {str(e)}'}), 500


@app.route('/api/get-token', methods=['POST'])
def get_token_from_credentials():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'success': False, 'error': 'Username and password are required'}), 400

    try:
        result = oauth_helper.get_token_from_credentials(username, password)

        if not result.get('success'):
            return jsonify(result), 400

        token = result['access_token']

        if init_client(token):
            return jsonify({
                'success': True,
                'token': token,
                'message': result.get('message', 'Token received successfully!')
            })
        else:
            return jsonify({'success': False, 'error': 'Token received but does not work'}), 500

    except Exception as e:
        print(f"General error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': f'Error: {str(e)}'}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    data = request.json or {}
    session_id = data.get('session_id', '').strip()

    if not session_id:
        return jsonify({'success': False, 'error': 'Session ID not specified'}), 400

    if session_id in active_clients:
        del active_clients[session_id]

    token_storage.delete_token(session_id)

    return jsonify({'success': True, 'message': 'You have logged out'})


@app.route('/api/status', methods=['POST'])
def status():
    data = request.json or {}
    session_id = data.get('session_id', '').strip()

    if not session_id:
        return jsonify({
            'authenticated': False,
            'account': None
        })

    client = get_client_for_session(session_id)
    is_authenticated = client is not None
    account_info = None

    if is_authenticated:
        try:
            if hasattr(client, '_session'):
                response = client._session.get('https://api.music.yandex.ru/account/status')
                if response.status_code == 200:
                    data = response.json()
                    if 'result' in data and 'account' in data['result']:
                        acc = data['result']['account']
                        account_info = {
                            'display_name': acc.get('displayName', 'User'),
                            'login': acc.get('login', '')
                        }
            else:
                account = client.account_status()
                account_info = {
                    'display_name': account.account.display_name if account.account.display_name else 'User',
                    'login': account.account.login if hasattr(account.account, 'login') else ''
                }
        except Exception as e:
            print(f"Error getting account status: {e}")
            pass

    return jsonify({
        'authenticated': is_authenticated,
        'account': account_info
    })

def require_session(func):
    from functools import wraps

    @wraps(func)
    def wrapper(*args, **kwargs):
        data = request.json or {}
        session_id = data.get('session_id', '').strip()

        if not session_id:
            return jsonify({'success': False, 'error': 'Session ID not specified'}), 400

        client = get_client_for_session(session_id)
        if not client:
            return jsonify({'success': False, 'error': 'Authorization required'}), 401

        return func(client, session_id, *args, **kwargs)

    return wrapper

@app.route('/api/my-playlists', methods=['POST'])
@require_session
def get_my_playlists(client, session_id):

    try:
        playlists = client.users_playlists_list()

        playlists_info = []
        for playlist in playlists:
            if hasattr(playlist.track_count, 'value'):
                track_count = playlist.track_count.value
            elif isinstance(playlist.track_count, int):
                track_count = playlist.track_count
            else:
                track_count = 0

            playlists_info.append({
                'kind': playlist.kind,
                'uid': playlist.uid,
                'title': playlist.title,
                'track_count': track_count,
                'owner_name': playlist.owner.name if playlist.owner else 'Unknown'
            })

        return jsonify({'success': True, 'playlists': playlists_info})

    except Exception as e:
        print(f"[ERROR] Error getting playlists: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': f'Error: {str(e)}'}), 500


@app.route('/api/playlist-tracks', methods=['POST'])
@require_session
def get_playlist_tracks(client, session_id):
    data = request.json
    kind = data.get('kind')
    uid = data.get('uid')

    if not kind or not uid:
        return jsonify({'success': False, 'error': 'Playlist kind or uid not specified'}), 400

    try:
        print(f"[DEBUG] Getting playlist tracks - kind: {kind}, uid: {uid}")
        playlist = client.users_playlists(kind=kind, user_id=uid)

        tracks_info = []
        if playlist and playlist.tracks:
            print(f"[DEBUG] Found {len(playlist.tracks)} tracks")
            for track_short in playlist.tracks:
                try:
                    if track_short.track:
                        tracks_info.append(format_track_info(track_short.track))
                except Exception as track_error:
                    print(f"[WARNING] Skipping unavailable track: {track_error}")
                    continue

        return jsonify({'success': True, 'tracks': tracks_info})

    except Exception as e:
        print(f"[ERROR] Error getting playlist tracks: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': f'Error: {str(e)}'}), 500


@app.route('/api/parse', methods=['POST'])
@require_session
def parse_link(client, session_id):
    data = request.json
    link = data.get('link', '').strip()

    if not link:
        return jsonify({'success': False, 'error': 'Link not specified'}), 400

    try:
        tracks_info = []
        print(f"[DEBUG] Parsing link: {link}")

        if '/track/' in link:
            track_id = extract_track_id(link)
            print(f"[DEBUG] Track ID: {track_id}")
            if track_id:
                track = client.tracks([track_id])[0]
                tracks_info.append(format_track_info(track))

        elif '/album/' in link:
            album_id = extract_album_id(link)
            print(f"[DEBUG] Album ID: {album_id}")
            if album_id:
                album = client.albums_with_tracks(album_id)
                for volume in album.volumes:
                    for track in volume:
                        try:
                            tracks_info.append(format_track_info(track))
                        except Exception as track_error:
                            print(f"[WARNING] Skipping unavailable track: {track_error}")
                            continue

        elif '/playlist' in link or '/users/' in link:
            print(f"[DEBUG] Detected playlist link")
            old_match = re.search(r'/users/([^/]+)/playlists/(\d+)', link)
            if old_match:
                user_id = old_match.group(1)
                playlist_id = old_match.group(2)
                print(f"[DEBUG] Old format playlist - User: {user_id}, ID: {playlist_id}")
                playlist = client.users_playlists(playlist_id, user_id)

                if playlist and playlist.tracks:
                    for track_short in playlist.tracks:
                        try:
                            if track_short.track:
                                tracks_info.append(format_track_info(track_short.track))
                        except Exception as track_error:
                            print(f"[WARNING] Skipping unavailable track: {track_error}")
                            continue
            else:
                return jsonify({
                    'success': False,
                    'error': 'UUID playlist links are not supported. Use the "My Playlists" button above.'
                }), 400

        print(f"[DEBUG] Total tracks found: {len(tracks_info)}")

        if tracks_info:
            return jsonify({'success': True, 'tracks': tracks_info})
        else:
            return jsonify({'success': False, 'error': 'Could not parse link or playlist is empty'}), 400

    except Exception as e:
        print(f"[ERROR] Exception in parse_link: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': f'Error: {str(e)}'}), 500

def extract_track_id(link):
    match = re.search(r'/track/(\d+)', link)
    return match.group(1) if match else None

def extract_album_id(link):
    match = re.search(r'/album/(\d+)', link)
    return match.group(1) if match else None

def format_track_info(track):
    artists = ', '.join([artist.name for artist in track.artists]) if track.artists else 'Unknown Artist'

    duration_ms = track.duration_ms if hasattr(track, 'duration_ms') else 0
    duration = f"{duration_ms // 60000}:{(duration_ms // 1000) % 60:02d}"

    bitrate = None
    codec = None
    try:
        download_info = track.get_download_info()
        if download_info:
            best_quality = max(download_info, key=lambda x: x.bitrate_in_kbps)
            bitrate = best_quality.bitrate_in_kbps
            codec = best_quality.codec
    except Exception as e:
        print(f"[DEBUG] Could not get bitrate for track {track.id}: {e}")
        pass

    return {
        'id': track.id,
        'title': track.title,
        'artists': artists,
        'duration': duration,
        'album': track.albums[0].title if track.albums else '',
        'bitrate': bitrate,
        'codec': codec
    }

@app.route('/api/liked-tracks', methods=['POST'])
@require_session
def get_liked_tracks(client, session_id):
    data = request.json
    page = data.get('page', 0)
    limit = data.get('limit', 20)

    try:
        print(f"[DEBUG] Getting liked tracks - page: {page}, limit: {limit}")

        liked_tracks = client.users_likes_tracks()

        if not liked_tracks or not liked_tracks.tracks:
            return jsonify({
                'success': True,
                'tracks': [],
                'total': 0,
                'page': page,
                'has_more': False
            })

        total_tracks = len(liked_tracks.tracks)
        start_idx = page * limit
        end_idx = start_idx + limit

        track_ids = [track.id for track in liked_tracks.tracks[start_idx:end_idx]]

        if not track_ids:
            return jsonify({
                'success': True,
                'tracks': [],
                'total': total_tracks,
                'page': page,
                'has_more': False
            })

        tracks = client.tracks(track_ids)
        tracks_info = []

        for track in tracks:
            try:
                tracks_info.append(format_track_info(track))
            except Exception as track_error:
                print(f"[WARNING] Skipping unavailable track: {track_error}")
                continue

        has_more = end_idx < total_tracks

        print(f"[DEBUG] Returning {len(tracks_info)} tracks, total: {total_tracks}, has_more: {has_more}")

        return jsonify({
            'success': True,
            'tracks': tracks_info,
            'total': total_tracks,
            'page': page,
            'has_more': has_more
        })

    except Exception as e:
        print(f"[ERROR] Error getting liked tracks: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': f'Error: {str(e)}'}), 500


@app.route('/api/track-url', methods=['POST'])
@require_session
def get_track_url(client, session_id):
    data = request.json
    track_id = data.get('track_id')

    if not track_id:
        return jsonify({'success': False, 'error': 'Track ID not specified'}), 400

    try:
        track = client.tracks([track_id])[0]
        download_info = track.get_download_info()

        if not download_info:
            return jsonify({'success': False, 'error': 'Cannot get track info'}), 400

        best_quality = max(download_info, key=lambda x: x.bitrate_in_kbps)
        direct_link = best_quality.get_direct_link()

        return jsonify({
            'success': True,
            'url': direct_link,
            'bitrate': best_quality.bitrate_in_kbps,
            'codec': best_quality.codec
        })

    except Exception as e:
        print(f"[ERROR] Error getting track URL: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': f'Error: {str(e)}'}), 500


@app.route('/api/download', methods=['POST'])
@require_session
def download_track(client, session_id):
    data = request.json
    track_id = data.get('track_id')
    folder_name = data.get('folder_name')

    if not track_id:
        return jsonify({'success': False, 'error': 'Track ID not specified'}), 400

    try:
        track = client.tracks([track_id])[0]
        artists = ', '.join([artist.name for artist in track.artists]) if track.artists else 'Unknown'
        filename = sanitize_filename(f"{artists} - {track.title}.mp3")

        if folder_name:
            folder_name_clean = sanitize_filename(folder_name)
            download_path = DOWNLOADS_DIR / folder_name_clean
            download_path.mkdir(exist_ok=True)
            filepath = download_path / filename
        else:
            filepath = DOWNLOADS_DIR / filename

        track.download(str(filepath))

        return jsonify({
            'success': True,
            'message': f'Track "{track.title}" downloaded successfully',
            'filename': filename,
            'folder': folder_name if folder_name else None
        })

    except Exception as e:
        return jsonify({'success': False, 'error': f'Download error: {str(e)}'}), 500

def sanitize_filename(filename):
    filename = re.sub(r'[<>:"/\\|?*]', '', filename)
    return filename[:200]

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
