import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

# --- A Mock Firestore Client for Graceful Failure ---
# This allows the server to run even if Firebase is not configured.
# API endpoints will return errors or empty lists, but the frontend will load.
class MockFirestoreClient:
    def collection(self, *args, **kwargs):
        print("WARNING: Using MockFirestoreClient. Firebase is not configured.")
        return MockCollectionRef()

class MockCollectionRef:
    def document(self, *args, **kwargs):
        return MockDocRef()
    def stream(self, *args, **kwargs):
        return []
    def get(self, *args, **kwargs):
        return []

class MockDocRef:
    def get(self, *args, **kwargs):
        return MockDocSnapshot(exists=False)
    def set(self, *args, **kwargs):
        pass
    def update(self, *args, **kwargs):
        pass
    def delete(self, *args, **kwargs):
        pass
    def collection(self, *args, **kwargs):
        return MockCollectionRef()

class MockDocSnapshot:
    def __init__(self, exists=False, data=None):
        self._exists = exists
        self._data = data if data else {}
    @property
    def exists(self):
        return self._exists
    def to_dict(self):
        return self._data

# --- Firebase Admin SDK Configuration ---
db = None

try:
    cred = None
    firebase_creds_json = os.environ.get('FIREBASE_CREDENTIALS_JSON')

    if firebase_creds_json:
        print("Initializing Firebase from environment variable...")
        firebase_creds_dict = json.loads(firebase_creds_json)
        cred = credentials.Certificate(firebase_creds_dict)
    else:
        # Fallback for local development
        key_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
        if os.path.exists(key_path):
            print(f"Initializing Firebase from file: {key_path}")
            cred = credentials.Certificate(key_path)
        else:
            print("CRITICAL WARNING: Firebase credentials not found.")
            print(" - For local dev, place 'serviceAccountKey.json' in the 'src/database/' directory.")
            print(" - For deployment, set the 'FIREBASE_CREDENTIALS_JSON' environment variable.")

    # Initialize the app if credentials were found
    if cred and not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("Firebase connection successful.")
    else:
        # If no credentials, use the Mock client to prevent a server crash
        print("Using Mock Firestore Client. The application will run in a degraded mode.")
        db = MockFirestoreClient()

except Exception as e:
    print(f"FATAL ERROR during Firebase initialization: {e}")
    print("Using Mock Firestore Client as a fallback.")
    db = MockFirestoreClient()
