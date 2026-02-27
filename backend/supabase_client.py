import os
from typing import Optional
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

class SupabaseTokenStorage:
    def __init__(self):
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")

        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment")

        self.client: Client = create_client(url, key)

    def save_token(self, session_id: str, yandex_token: str) -> bool:
        try:
            existing = self.client.table('user_tokens').select('*').eq('session_id', session_id).execute()

            if existing.data and len(existing.data) > 0:
                self.client.table('user_tokens').update({
                    'yandex_token': yandex_token,
                    'last_used_at': datetime.utcnow().isoformat()
                }).eq('session_id', session_id).execute()
            else:
                self.client.table('user_tokens').insert({
                    'session_id': session_id,
                    'yandex_token': yandex_token,
                    'last_used_at': datetime.utcnow().isoformat()
                }).execute()

            return True
        except Exception as e:
            print(f"Error saving token: {e}")
            return False

    def get_token(self, session_id: str) -> Optional[str]:
        try:
            result = self.client.table('user_tokens').select('yandex_token').eq('session_id', session_id).execute()

            if result.data and len(result.data) > 0:
                self.client.table('user_tokens').update({
                    'last_used_at': datetime.utcnow().isoformat()
                }).eq('session_id', session_id).execute()

                return result.data[0]['yandex_token']

            return None
        except Exception as e:
            print(f"Error getting token: {e}")
            return None

    def delete_token(self, session_id: str) -> bool:
        try:
            self.client.table('user_tokens').delete().eq('session_id', session_id).execute()
            return True
        except Exception as e:
            print(f"Error deleting token: {e}")
            return False

    def has_token(self, session_id: str) -> bool:
        try:
            result = self.client.table('user_tokens').select('id').eq('session_id', session_id).execute()
            return result.data and len(result.data) > 0
        except Exception as e:
            print(f"Error checking token: {e}")
            return False
