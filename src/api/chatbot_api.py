import os
import datetime
from flask import Blueprint, request, jsonify
from openai import OpenAI
from firebase_admin import firestore
from src.api.auth import require_api_key # Import decorator

# Import the database object from your firebase_config
from src.database.firebase_config import db

chatbot_bp = Blueprint('chatbot_bp', __name__)
# Initialize the OpenAI client
try:
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    client.models.list() # Test the client connection
except Exception as e:
    print(f"CRITICAL: OpenAI client could not be initialized. Chatbot will not work. Error: {e}")
    client = None

@chatbot_bp.route('/api/chatbot', methods=['POST'])
@require_api_key # Protect this endpoint
def handle_chat():
    """Handles incoming chat messages, gets a reply from OpenAI, and optionally saves the interaction."""
    if not client:
        return jsonify({"reply": "Lỗi: Chatbot chưa được cấu hình đúng trên máy chủ. Vui lòng liên hệ quản trị viên."}), 200

    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({"error": "Message is required in the request body."}), 400

    user_message = data['message']
    # Check if we should save to history (default: True for backward compatibility)
    save_history = data.get('saveHistory', True)
    
    # Get model from environment or use default
    model = os.environ.get("OPENAI_MODEL", "gpt-3.5-turbo")

    try:
        # 1. Get bot's reply from OpenAI
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "Bạn là chuyên gia AI. Chuyên tư vấn và giải đáp các thắc mắc về tài chính học tập, chuyên gia tiếng anh"},
                {"role": "user", "content": user_message}
            ]
        )
        bot_reply = completion.choices[0].message.content

        # 2. Save the conversation to Firestore only if saveHistory is True
        if save_history:
            try:
                chat_ref = db.collection('chat_history').document()
                chat_ref.set({
                    'message': user_message,
                    'reply': bot_reply,
                    'timestamp': firestore.SERVER_TIMESTAMP
                })
            except Exception as db_error:
                # Log but don't fail the request if saving fails
                print(f"WARNING: Failed to save chat history: {db_error}")

        # 3. Return the bot's reply to the frontend
        return jsonify({"reply": bot_reply})

    except Exception as e:
        print(f"ERROR: An error occurred during chatbot processing: {e}")
        error_reply = "Rất tiếc, đã có lỗi xảy ra khi xử lý yêu cầu của bạn."
        return jsonify({"reply": error_reply}), 500

@chatbot_bp.route('/api/chatbot/history', methods=['GET'])
def get_chat_history():
    """Retrieves the entire chat history from Firestore, ordered by time."""
    try:
        history_query = db.collection('chat_history').order_by('timestamp', direction=firestore.Query.ASCENDING).stream()
        
        history = []
        for doc in history_query:
            history.append(doc.to_dict())
            
        return jsonify(history)
    except Exception as e:
        print(f"ERROR: Failed to fetch chat history: {e}")
        return jsonify({"error": "Could not retrieve chat history."}), 500
