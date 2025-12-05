# Technology Stack

## Backend

- **Framework**: Flask (Python web framework)
- **Database**: Firebase/Firestore (NoSQL cloud database)
- **Caching**: Redis 5.0.1+
- **Authentication**: Custom API key + action-based authorization
- **AI Integration**: OpenAI API for chatbot functionality
- **Security**: bleach for input sanitization

## Frontend

- **Architecture**: Single-Page Application (SPA)
- **Routing**: Navigo 8.11.1 (client-side routing)
- **Styling**: Tailwind CSS (CDN)
- **Charts**: Chart.js with chartjs-plugin-datalabels
- **Module System**: ES6 modules

## Development Tools

- **Package Manager**: pip
- **Code Formatting**: autopep8
- **Environment**: python-dotenv for configuration
- **Server**: Gunicorn (production), Flask dev server (development)

## Common Commands

### Development
```bash
# Start development server
python main.py

# Or use the provided script
bash devserver.sh
```

### Dependencies
```bash
# Install dependencies
pip install -r requirements.txt
```

### Environment Setup
Create a `.env` file with:
- `API_SECRET_KEY`: API authentication key
- `FIREBASE_CREDENTIALS_JSON`: Firebase credentials (JSON string)
- `PORT`: Server port (default: 8080)

Alternatively, place `serviceAccountKey.json` in `src/database/` for local development.

## Deployment

The application runs on port 8080 by default and binds to `0.0.0.0` for container compatibility.
