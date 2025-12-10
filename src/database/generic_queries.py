from flask import jsonify, request
from .firebase_config import db
from .decorators import update_metadata_on_change, cached_query
import traceback
import bleach

class CRUDApi:
    """
    A generic class to handle CRUD (Create, Read, Update, Delete) operations
    for any collection in Firestore.
    """
    def __init__(self, collection_name):
        self.collection = db.collection(collection_name)
        self.collection_name = collection_name
    
    @cached_query
    def get_all(self):
        """Fetches all documents from the collection."""
        try:
            docs = self.collection.stream()
            all_docs = [{**doc.to_dict(), 'id': doc.id} for doc in docs]
            return jsonify(all_docs), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @update_metadata_on_change
    def create(self):
        """
        Creates a new document from request JSON, and returns the document
        augmented with its new ID.
        """
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Invalid data"}), 400

            # Sanitize all string fields in the incoming data
            sanitized_data = {key: bleach.clean(value) if isinstance(value, str) else value for key, value in data.items()}
            
            # Add the new document. The call to add() blocks until the write is complete.
            update_time, doc_ref = self.collection.add(sanitized_data)
            
            # Instead of re-fetching, augment the original data with the new ID.
            # This is more efficient and avoids potential race conditions.
            sanitized_data['id'] = doc_ref.id 
            return jsonify(sanitized_data), 201 # 201 Created

        except Exception as e:
            # Log the full error to the server terminal for debugging
            print(f"ERROR in CRUDApi.create: {e}")
            traceback.print_exc() # Prints the full stack trace
            return jsonify({"error": str(e)}), 500

    def get_one(self, doc_id):
        """Fetches a specific document by its ID."""
        try:
            doc = self.collection.document(doc_id).get()
            if not doc.exists:
                return jsonify({"error": "Document not found"}), 404
            return jsonify({**doc.to_dict(), 'id': doc.id}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @update_metadata_on_change
    def update(self, doc_id):
        """Updates an existing document by its ID."""
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Invalid data"}), 400
            
            # Sanitize all string fields in the incoming data
            sanitized_data = {key: bleach.clean(value) if isinstance(value, str) else value for key, value in data.items()}

            doc_ref = self.collection.document(doc_id)
            doc_ref.update(sanitized_data)
            return jsonify({"success": True, "id": doc_id}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @update_metadata_on_change
    def delete(self, doc_id):
        """Deletes a document by its ID."""
        try:
            self.collection.document(doc_id).delete()
            return jsonify({"success": True}), 200 # Often returns 204 No Content
        except Exception as e:
            return jsonify({"error": str(e)}), 500
