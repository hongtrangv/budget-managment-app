from dotenv import load_dotenv
load_dotenv() # Tải các biến môi trường từ file .env

import os
from flask import Flask, render_template, session
# Import a class that holds icon SVGs
from icons import Icon

# Import blueprints from the api directory
from src.api.auth import auth_bp
from src.api.collections_api import collections_bp
from src.api.management_api import management_bp
from src.api.dashboard_api import report_bp
from src.api.chatbot_api import chatbot_bp
from src.api.loan_api import loan_bp
from src.api.books_api import books_bp
from src.api.genre_api import genre_api_blueprint
from src.api.menu_api import menu_bp
from src.api.task_api import task_bp
from src.api.excel_upload_api import excel_upload_bp
from src.api.admin_api import admin_bp # Import the new admin blueprint

app = Flask(__name__,
            template_folder='templates',
            static_folder='static')

app.config['JSON_AS_ASCII'] = False
app.secret_key = os.urandom(24)

# === CONTEXT PROCESSORS ===

@app.context_processor
def inject_icons():
    """Injects the Icon class into Jinja2 templates."""
    return dict(icons=Icon)


# === REGISTER BLUEPRINTS ===
app.register_blueprint(auth_bp)
app.register_blueprint(collections_bp)
app.register_blueprint(management_bp)
app.register_blueprint(report_bp)
app.register_blueprint(chatbot_bp)
app.register_blueprint(loan_bp)
app.register_blueprint(books_bp)
app.register_blueprint(menu_bp)
app.register_blueprint(task_bp)
app.register_blueprint(excel_upload_bp)
app.register_blueprint(admin_bp) # Register the new admin blueprint

# Register the new genre blueprint with a URL prefix
app.register_blueprint(genre_api_blueprint, url_prefix='/api/genres')


# === VIEW ROUTES ===

# These routes all serve the single-page application's entry point.
@app.route("/")
@app.route("/welcome") # Add route for the welcome page
@app.route("/saving")
@app.route('/collections')
@app.route('/management')
@app.route('/loan-payment')
@app.route('/bookstore')
@app.route('/login')
@app.route('/register')
@app.route('/calendar')
@app.route('/dnd-list') # <-- ADDED NEW ROUTE FOR DRAG AND DROP PAGE
@app.route('/shelf/<int:row_index>/<int:unit_index>/<int:comp_index>')
@app.route('/book/<string:book_id>')
@app.route('/excel-upload')
@app.route('/admin/menu')
def index(row_index=None, unit_index=None, comp_index=None, book_id=None):
    """Serves the main index.html file, which is the entry point for the SPA."""
    api_key = os.environ.get('API_SECRET_KEY')
    return render_template('index.html', api_key=api_key)

@app.route('/components/<path:filename>')
def components(filename):
    """Serves components like the menu."""
    # FIX: Explicitly pass `icons` to the template context
    return render_template(os.path.join('components', filename), icons=Icon)

@app.route('/pages/<path:filename>')
def pages(filename):
    """Serves the different pages for the SPA."""
    # FIX: Explicitly pass `icons` to the template context
    return render_template(os.path.join('pages', filename), icons=Icon)

# === START APPLICATION ===
def main():
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))

if __name__ == "__main__":
    main()
