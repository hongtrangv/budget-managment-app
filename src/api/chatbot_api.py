import os
import datetime
from flask import Blueprint, request, jsonify
from openai import OpenAI
from firebase_admin import firestore

# Import the database object from your firebase_config
from src.database.firebase_config import db

chatbot_bp = Blueprint('chatbot_bp', __name__)

# Initialize the OpenAI client
# IMPORTANT: Your OpenAI API key must be set as an environment variable 
# named OPENAI_API_KEY for this to work.
try:
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    client.models.list() # Test the client connection
except Exception as e:
    print(f"CRITICAL: OpenAI client could not be initialized. Chatbot will not work. Error: {e}")
    client = None

@chatbot_bp.route('/api/chatbot', methods=['POST'])
def handle_chat():
    """Handles incoming chat messages, gets a reply from OpenAI, and saves the interaction."""
    if not client:
        return jsonify({"reply": "Lỗi: Chatbot chưa được cấu hình đúng trên máy chủ. Vui lòng liên hệ quản trị viên."}), 200

    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({"error": "Message is required in the request body."}), 400

    user_message = data['message']

    try:
        # 1. Get bot's reply from OpenAI
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful financial assistant for a personal finance app."},
                {"role": "user", "content": user_message}
            ]
        )
        bot_reply = completion.choices[0].message.content

        # 2. Save the conversation to Firestore with consistent field names
        chat_ref = db.collection('chat_history').document()
        chat_ref.set({
            'message': user_message, # Use 'message' for user
            'reply': bot_reply,      # Use 'reply' for bot
            'timestamp': firestore.SERVER_TIMESTAMP
        })

        # 3. Return the bot's reply to the frontend
        return jsonify({"reply": bot_reply})

    except Exception as e:
        print(f"ERROR: An error occurred during chatbot processing: {e}")
        # Also return a user-friendly message in the chat itself
        error_reply = f"Rất tiếc, đã có lỗi xảy ra khi xử lý yêu cầu của bạn. Lỗi: {e}"
        return jsonify({"reply": error_reply})

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
