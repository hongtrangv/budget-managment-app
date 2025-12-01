# src/api/action_config.py

"""
Cấu hình tập trung để ánh xạ các API endpoint tới các Action Identifier được phép.

Định dạng:
'blueprint_name.function_name': ['ALLOWED_ACTION_1', 'ALLOWED_ACTION_2']
"""

ACTION_CONFIG = {
    # === Book API Endpoints ===
    'books_bp.add_new_book': ['CREATE_BOOK'],
    'books_bp.update_existing_book': ['UPDATE_BOOK'],
    'books_bp.delete_existing_book': ['DELETE_BOOK'],

    # === Loan API Endpoints ===
    'loan_api.add_loan_payment': ['ADD_LOAN_PAYMENT'],

    # === Management API Endpoints ===
    'management_api.add_management_item': ['ADD_MANAGEMENT_ITEM'],
    'management_api.update_management_record': ['UPDATE_MANAGEMENT_RECORD'],
    'management_api.delete_management_record': ['DELETE_MANAGEMENT_RECORD'],

    # === Collections API Endpoints ===
    'collections_api.add_document': ['ADD_COLLECTION_DOCUMENT'],
    'collections_api.update_document': ['UPDATE_COLLECTION_DOCUMENT'],
    'collections_api.delete_document': ['DELETE_COLLECTION_DOCUMENT'],
}
