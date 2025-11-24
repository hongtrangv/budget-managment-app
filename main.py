import os
from flask import Flask, send_file, send_from_directory

# --- API Blueprints ---
# Each blueprint is a self-contained module for a specific API feature set.
from src.api.management_api import management_api
from src.api.collections_api import collections_api # Import the new blueprint

# Initialize the main Flask application
app = Flask(__name__)
# Ensure proper display of non-ASCII characters (like Vietnamese) in JSON responses.
app.config['JSON_AS_ASCII'] = False

# === REGISTER API BLUEPRINTS ===
# Registering a blueprint attaches all of its routes to the main app.
# The url_prefix defined in the blueprint will be applied to all its routes.
app.register_blueprint(management_api)
app.register_blueprint(collections_api) # Register the new blueprint


# === STATIC FILE & SPA ROUTING ===

@app.route('/src/<path:path>')
def send_src(path):
    """Serves any file from the 'src' directory (e.g., HTML, JS, CSS)."""
    return send_from_directory('src', path)

@app.route('/')
@app.route('/collections')
@app.route('/management')
def index():
    """Serves the main single-page application shell (index.html)."""
    return send_file('src/index.html')

# The legacy API routes for the 'collections' page have been removed from this file
# and are now neatly organized in 'src/api/collections_api.py'.


# === MAIN ENTRY POINT ===

def main():
    """Starts the Flask development server."""
    # The app runs on all available network interfaces (0.0.0.0)
    # on the port specified by the environment, defaulting to 8080.
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)

if __name__ == "__main__":
    main()
