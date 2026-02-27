import requests
import uuid
from urllib.parse import urlencode, parse_qs, urlparse
from config import (
    YANDEX_MUSIC_CLIENT_ID,
    YANDEX_MUSIC_CLIENT_SECRET,
    OAUTH_AUTHORIZE_URL,
    OAUTH_TOKEN_URL,
    REDIRECT_URI,
    DEVICE_ID,
    DEVICE_NAME
)


class YandexOAuthHelper:

    def __init__(self):
        self.client_id = YANDEX_MUSIC_CLIENT_ID
        self.client_secret = YANDEX_MUSIC_CLIENT_SECRET
        self.device_id = DEVICE_ID or str(uuid.uuid4())
        self.device_name = DEVICE_NAME

    def get_auth_url(self) -> str:
        params = {
            'response_type': 'code',
            'client_id': self.client_id,
            'device_id': self.device_id,
            'device_name': self.device_name,
            'force_confirm': 'yes',
        }

        return f"{OAUTH_AUTHORIZE_URL}?{urlencode(params)}"

    def exchange_code_for_token(self, code: str) -> dict:
        data = {
            'grant_type': 'authorization_code',
            'code': code,
            'client_id': self.client_id,
            'client_secret': self.client_secret,
        }

        print(f"[DEBUG OAUTH] Exchanging code: '{code}' (length: {len(code)})")
        print(f"[DEBUG OAUTH] Request to: {OAUTH_TOKEN_URL}")
        print(f"[DEBUG OAUTH] Client ID: {self.client_id}")

        try:
            response = requests.post(OAUTH_TOKEN_URL, data=data)

            print(f"[DEBUG OAUTH] Response status: {response.status_code}")
            print(f"[DEBUG OAUTH] Response text: {response.text[:500]}")

            response.raise_for_status()

            token_data = response.json()

            if 'access_token' not in token_data:
                raise Exception("Token not found in server response")

            return {
                'success': True,
                'access_token': token_data['access_token'],
                'token_type': token_data.get('token_type', 'OAuth'),
                'expires_in': token_data.get('expires_in'),
                'uid': token_data.get('uid')
            }

        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': f"Error getting token: {str(e)}"
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def validate_token(self, token: str) -> bool:
        try:
            headers = {
                'Authorization': f'OAuth {token}'
            }

            response = requests.get(
                'https://api.music.yandex.net/account/status',
                headers=headers
            )

            return response.status_code == 200

        except Exception:
            return False

    @staticmethod
    def extract_code_from_url(url: str) -> str:
        try:
            parsed = urlparse(url)

            query_params = parse_qs(parsed.query)
            if 'code' in query_params:
                return query_params['code'][0]

            fragment_params = parse_qs(parsed.fragment)
            if 'code' in fragment_params:
                return fragment_params['code'][0]

            return ""

        except Exception:
            return ""

    def get_token_from_credentials(self, username: str, password: str) -> dict:
        try:
            session = requests.Session()
            session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            })

            response = session.get('https://passport.yandex.ru/am?app_platform=android')

            if response.status_code != 200:
                return {
                    'success': False,
                    'error': 'Failed to get CSRF token'
                }

            csrf_data = response.json()
            csrf_token = csrf_data.get('csrf_token')

            if not csrf_token:
                return {
                    'success': False,
                    'error': 'CSRF token not found'
                }

            url = 'https://passport.yandex.ru/registration-validations/auth/multi_step/start'
            payload = {'csrf_token': csrf_token, 'login': username}
            response = session.post(url, data=payload)

            if response.status_code != 200:
                return {
                    'success': False,
                    'error': f'Error sending login (code {response.status_code})'
                }

            login_data = response.json()
            track_id = login_data.get('track_id')

            if not track_id:
                return {
                    'success': False,
                    'error': 'Failed to get track_id. Captcha may be required.'
                }

            url = 'https://passport.yandex.ru/registration-validations/auth/multi_step/commit_password'
            payload = {'csrf_token': csrf_token, 'track_id': track_id, 'password': password}
            response = session.post(url, data=payload)

            if response.status_code != 200:
                return {
                    'success': False,
                    'error': 'Invalid username or password'
                }

            pwd_data = response.json()
            if pwd_data.get('status') != 'ok':
                return {
                    'success': False,
                    'error': 'Invalid username or password'
                }

            url = 'https://mobileproxy.passport.yandex.net/1/bundle/oauth/token_by_sessionid'
            payload = {
                'client_id': 'c0ebe342af7d48fbbbfcf2d2eedb8f9e',
                'client_secret': 'ad0a908f0aa341a182a37ecd75bc319e'
            }
            response = session.post(url, data=payload)

            if response.status_code != 200:
                return {
                    'success': False,
                    'error': f'Failed to get x-token (code {response.status_code})'
                }

            xtoken_data = response.json()
            x_token = xtoken_data.get('access_token')

            if not x_token:
                return {
                    'success': False,
                    'error': 'X-token missing from response'
                }

            url = 'https://oauth.mobile.yandex.net/1/token'
            payload = {
                'client_secret': self.client_secret,
                'client_id': self.client_id,
                'grant_type': 'x-token',
                'access_token': x_token
            }
            response = requests.post(url, data=payload)

            if response.status_code != 200:
                return {
                    'success': False,
                    'error': f'Failed to get music token (code {response.status_code})'
                }

            music_data = response.json()
            music_token = music_data.get('access_token')

            if not music_token:
                return {
                    'success': False,
                    'error': 'Music token missing from response'
                }

            return {
                'success': True,
                'access_token': music_token,
                'message': 'Token received successfully!'
            }

        except Exception as e:
            return {
                'success': False,
                'error': f'Error: {str(e)}'
            }
