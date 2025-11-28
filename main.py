import os
from flask import Flask, render_template

# Import a class that holds icon SVGs
from icons import Icon

# Import blueprints from the api directory
from src.api.collections_api import collections_bp
from src.api.management_api import management_bp
from src.api.dashboard_api import report_bp
from src.api.chatbot_api import chatbot_bp
from src.api.loan_api import loan_bp

app = Flask(__name__,
            template_folder='templates',
            static_folder='static')

app.config['JSON_AS_ASCII'] = False

# === CONTEXT PROCESSORS ===

@app.context_processor
def inject_icons():
    """Injects the Icon class into Jinja2 templates."""
    return dict(icons=Icon)


# === REGISTER BLUEPRINTS ===
app.register_blueprint(collections_bp)
app.register_blueprint(management_bp)
app.register_blueprint(report_bp)
app.register_blueprint(chatbot_bp)
app.register_blueprint(loan_bp)


# === VIEW ROUTES ===

# These routes all serve the single-page application's entry point.
@app.route("/")
@app.route('/collections')
@app.route('/management')
def index():
    """Serves the main index.html file, which is the entry point for the SPA."""
    return render_template('index.html')

@app.route('/components/<path:filename>')
def components(filename):
    """Serves components like the menu."""
    return render_template(os.path.join('components', filename))

@app.route('/pages/<path:filename>')
def pages(filename):
    """Serves the different pages for the SPA."""
    return render_template(os.path.join('pages', filename))


# === START APPLICATION ===
def main():
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))

if __name__ == "__main__":
    main()
