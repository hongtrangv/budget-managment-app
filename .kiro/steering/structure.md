# Project Structure

## Directory Organization

```
├── main.py                 # Application entry point, Flask app configuration
├── icons.py                # Icon SVG definitions for templates
├── requirements.txt        # Python dependencies
├── .env                    # Environment variables (gitignored)
│
├── src/
│   ├── api/               # Flask blueprints for API endpoints
│   │   ├── auth.py        # Authentication decorators (@require_api_key, @require_action)
│   │   ├── action_config.py  # Action authorization configuration
│   │   ├── books_api.py   # Book and shelf management endpoints
│   │   ├── collections_api.py
│   │   ├── management_api.py
│   │   ├── dashboard_api.py
│   │   ├── chatbot_api.py
│   │   ├── loan_api.py
│   │   ├── genre_api.py
│   │   └── redis_cache.py # Redis caching utilities
│   │
│   └── database/          # Database layer
│       ├── firebase_config.py    # Firebase initialization with mock fallback
│       ├── firestore_queries.py  # Firestore-specific queries
│       ├── generic_queries.py    # Generic CRUD operations (CRUDApi class)
│       └── decorators.py         # Database decorators
│
├── templates/             # Jinja2 templates
│   ├── index.html        # SPA entry point
│   ├── components/       # Reusable UI components (menu)
│   └── pages/            # Page templates loaded by SPA router
│
└── static/               # Static assets
    ├── css/              # Stylesheets
    └── js/               # JavaScript modules
        ├── app.js        # Main SPA router and initialization
        ├── utils.js      # Shared utilities (showAlert, etc.)
        └── components/   # Reusable JS components
```

## Architecture Patterns

### Backend Patterns

1. **Blueprint-based API Organization**: Each feature area has its own Flask blueprint
2. **Generic CRUD Pattern**: `CRUDApi` class in `generic_queries.py` provides reusable CRUD operations
3. **Decorator-based Security**: `@require_api_key` and `@require_action` decorators protect endpoints
4. **Graceful Degradation**: Mock Firestore client allows server to run without Firebase configuration
5. **Centralized Configuration**: `ACTION_CONFIG` dictionary maps endpoints to allowed actions

### Frontend Patterns

1. **SPA with Client-side Routing**: Navigo handles navigation without page reloads
2. **Module-based Organization**: Each page has its own JS module with a loader function
3. **Route Configuration**: `routes` object maps paths to page templates and loader functions
4. **Component Loading**: Menu and pages loaded dynamically via fetch
5. **Global State**: API key injected into templates and available as `window.API_KEY`

## Key Conventions

- **API Endpoints**: All API routes prefixed with `/api/`
- **Blueprint Registration**: Blueprints registered in `main.py` with optional URL prefixes
- **Context Processors**: `inject_icons()` makes Icon class available in all templates
- **Vietnamese Language**: UI text and comments use Vietnamese
- **JSON Configuration**: `app.config['JSON_AS_ASCII'] = False` for proper Unicode handling
- **Error Handling**: Try-catch blocks with console logging and user-friendly error messages
