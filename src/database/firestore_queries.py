from src.database.firebase_config import db
from collections import defaultdict
from google.cloud import firestore
import uuid
from datetime import datetime
import math


class DocumentHandler:
    """Handles generic CRUD operations for Firestore documents and collections."""

    @staticmethod
    def get_all_documents_from_collection(collection_name):
        """Fetches all documents from a specified collection."""
        try:
            docs = db.collection(collection_name).stream()
            results = []
            for doc in docs:
                doc_data = doc.to_dict()
                if doc_data is None: doc_data = {}
                doc_data['id'] = doc.id
                if 'Danh mục thu chi' not in doc_data:
                    doc_data['Danh mục thu chi'] = doc.id
                results.append(doc_data)
            return results
        except Exception as e:
            print(f"Error getting all documents: {e}")
            return []
            
    @staticmethod
    def get_paginated_documents(collection_name, page_size=10, start_after_doc_id=None, order_by_field='id'):
        """
        Fetches a paginated list of documents, including total records and total pages.
        """
        try:
            collection_ref = db.collection(collection_name)
            
            # 1. Get total number of records efficiently
            count_query = collection_ref.count()
            total_records_result = count_query.get()
            total_records = total_records_result[0][0].value

            # 2. Calculate total pages
            total_pages = math.ceil(total_records / page_size) if page_size > 0 else 0
            
            # 3. Build the pagination query
            # Order by document ID by default for stable pagination
            order_key = firestore.Client.field_path('__name__') if order_by_field == 'id' else order_by_field
            query = collection_ref.order_by(order_key)

            if start_after_doc_id:
                start_after_doc = collection_ref.document(start_after_doc_id).get()
                if not start_after_doc.exists:
                    # Return empty data but with correct totals if cursor is invalid
                    return {
                        'data': [], 'last_doc_id': None,
                        'total_records': total_records, 'total_pages': total_pages
                    }
                query = query.start_after(start_after_doc)

            docs_snapshot = query.limit(page_size).stream()

            results = []
            last_doc_id = None
            for doc in docs_snapshot:
                doc_data = doc.to_dict()
                doc_data['id'] = doc.id
                results.append(doc_data)
                last_doc_id = doc.id

            # 4. Return the enhanced dictionary
            return {
                'data': results, 
                'last_doc_id': last_doc_id,
                'total_records': total_records,
                'total_pages': total_pages
            }
        except Exception as e:
            print(f"Error getting paginated documents from {collection_name}: {e}")
            return {'data': [], 'last_doc_id': None, 'total_records': 0, 'total_pages': 0}

    @staticmethod    
    def add_document_to_collection(collection_name, data):
        """Adds a new document with a specified ID."""
        try:           
            doc_id = str(uuid.uuid4())
            doc_ref = db.collection("items").document(doc_id).set(data)                                
            return doc_id

        except Exception as e:
            print(f"Error adding document: {e}")
            raise e

    @staticmethod
    def delete_document_from_collection(collection_name, document_id):
        """Deletes a document."""
        try:
            db.collection(collection_name).document(document_id).delete()
            return True
        except Exception as e:
            print(f"Error deleting document: {e}")
            return False

    @staticmethod
    def update_document_in_collection(collection_name, original_doc_id, data_from_form):
        """Updates a document, handling ID changes as well."""
        try:
            original_doc_ref = db.collection(collection_name).document(original_doc_id)
            original_doc_ref.update(data_from_form)            
            return original_doc_id
        except Exception as e:
            print(f"Error updating document: {e}")
            raise e

class ManagementTree:
    """Handles logic for fetching and manipulating data for the management tree."""

    @staticmethod
    def get_data_tree():
        """Fetches data from Firestore structured as Year -> Months."""
        try:
            tree = defaultdict(list)
            year_docs = db.collection('Year').stream()
            for year_doc in year_docs:
                year_id = year_doc.id
                month_docs = year_doc.reference.collection('Months').stream()
                months_list = sorted([month.id for month in month_docs], key=int)
                if months_list:
                    tree[year_id] = months_list
            return dict(tree)
        except Exception as e:
            print(f"Error getting management data tree: {e}")
            return {}

    @staticmethod
    def get_items_for_month(year, month):
        """Fetches all type items for a specific month and year."""
        try:
            items_ref = db.collection('Year').document(year).collection('Months').document(month).collection('Types')
            docs = items_ref.stream()
            results = []
            for doc in docs:
                doc_data = doc.to_dict()
                doc_data['id'] = doc.id
                results.append(doc_data)
            return results
        except Exception as e:
            print(f"Error getting items for {year}-{month}: {e}")
            return []

    @staticmethod
    def add_item(year, month, item_type, data):
        """Adds a new record to a type document in Firestore, ensuring parent documents exist."""
        try:
            year_ref = db.collection('Year').document(year)
            month_ref = year_ref.collection('Months').document(month)
            type_ref = month_ref.collection('Types').document(item_type)

            year_ref.set({}, merge=True)
            month_ref.set({}, merge=True)
            
            type_ref.set({'records': firestore.ArrayUnion([data])
            }, merge=True)
            
            return data.get('id')
        except Exception as e:
            print(f"Error adding new item to Firestore: {e}")
            raise e

    @staticmethod
    def delete_record(year, month, type_id, record_id):
        """Deletes a record from the 'records' array within a type document."""
        try:
            type_ref = db.collection('Year').document(year).collection('Months').document(month).collection('Types').document(type_id)
            doc = type_ref.get()
            if not doc.exists:
                raise Exception("Document not found")

            records = doc.to_dict().get('records', [])
            # Create a new list excluding the record to be deleted
            updated_records = [record for record in records if record.get['id'] != record_id]

            # Update the document with the new array
            type_ref.update({'records': updated_records})
            print(f"Successfully deleted record {record_id} from {type_id}")

        except Exception as e:
            print(f"Error deleting record {record_id}: {e}")
            raise e

    @staticmethod
    def update_record(year, month, type_id, record_id, new_data):
        """Updates a record within the 'records' array of a type document."""
        try:
            type_ref = db.collection('Year').document(year).collection('Months').document(month).collection('Types').document(type_id)
            doc = type_ref.get()
            if not doc.exists:
                raise Exception("Document not found")

            records = doc.to_dict().get('records', [])
            record_found = False
            updated_records = []

            for record in records:
                if record.get('id') == record_id:
                    record.update(new_data) # Update the dictionary in place
                    record_found = True
                updated_records.append(record)

            if not record_found:
                raise Exception("Record with specified ID not found in document")

            # Write the entire modified array back to the document
            type_ref.update({'records': updated_records})
            print(f"Successfully updated record {record_id} in {type_id}")

        except Exception as e:
            print(f"Error updating record {record_id}: {e}")
            raise e

class Dashboard:
    @staticmethod
    def get_total_income_and_expense_year(year):
            """
            Calculates total income and expense for a given year.
            """
            total_income = 0
            total_expense = 0            
            try:                                
                month_docs = db.collection('Year').document(str(year)).collection('Months').stream()
                for month_doc in month_docs:
                    type_docs = month_doc.reference.collection('Types').stream()
                    for type_doc in type_docs:
                        type_id = type_doc.id
                        doc_data = type_doc.to_dict()
                        if 'records' in doc_data and isinstance(doc_data['records'], list):
                            for record in doc_data['records']:
                                if isinstance(record, dict) and 'amount' in record:
                                    try:
                                        amount = float(record['amount'])
                                        if type_id == 'Thu':
                                            total_income += amount
                                        elif type_id == 'Chi':
                                            total_expense += amount
                                    except (ValueError, TypeError):
                                        print(f"Skipping record with invalid amount: {record}")
                return {"income": total_income, "expense": total_expense}
            except Exception as e:
                print(f"Error calculating total income/expense for year: {e}")
                return {"income": 0, "expense": 0}

    @staticmethod
    def get_total_income_and_expense_month(year,month):
            """
            Calculates total income and expense for a given month.
            """
            total_income = 0
            total_expense = 0
            try:                               
                type_docs = db.collection('Year').document(year).collection('Months').document(month).collection('Types').stream()                
                for type_doc in type_docs:
                    type_id = type_doc.id
                    doc_data = type_doc.to_dict()
                    if 'records' in doc_data and isinstance(doc_data['records'], list):
                        for record in doc_data['records']:
                            if isinstance(record, dict) and 'amount' in record:
                                try:
                                    amount = float(record['amount'])
                                    if type_id == 'Thu':
                                        total_income += amount
                                    elif type_id == 'Chi':
                                        total_expense += amount
                                except (ValueError, TypeError):
                                    print(f"Skipping record with invalid amount: {record}")
                return {"income": total_income, "expense": total_expense}
            except Exception as e:
                print(f"Error calculating total income/expense for month: {e}")
                return {"income": 0, "expense": 0}
    
    @staticmethod
    def get_year_list():
        try:
            results = [] 
            year_docs = db.collection('Year').stream()       
            for year_doc in year_docs:                                 
                results.append(year_doc.id)
            return sorted(results, reverse=True)
        except Exception as e:
                print(f"Error getting year list: {e}")
                return []
    
    @staticmethod
    def get_piechart_for_year(year):
        try:
            aggregated_data = defaultdict(float)
            month_docs = db.collection('Year').document(str(year)).collection('Months').stream()
            for month_doc in month_docs:
                chi_doc_ref = month_doc.reference.collection('Types').document('Chi')
                chi_doc = chi_doc_ref.get()
                if chi_doc.exists:
                    doc_data = chi_doc.to_dict()
                    if 'records' in doc_data and isinstance(doc_data['records'], list):
                        for record in doc_data['records']:
                            if isinstance(record, dict) and 'name' in record and 'amount' in record:
                                try:
                                    name = record['name']
                                    amount = float(record['amount'])
                                    aggregated_data[name] += amount
                                except (ValueError, TypeError):
                                    print(f"Skipping record with invalid amount: {record}")
            
            labels = list(aggregated_data.keys())
            data = list(aggregated_data.values())
            
            return {"labels": labels, "data": data}
        except Exception as e:
            print(f"Error getting pie chart data for year {year}: {e}")
            return {"labels": [], "data": []}

    @staticmethod        
    def get_piechart_for_month(year,month):
        try:
            aggregated_data = defaultdict(float)
            chi_ref = db.collection('Year').document(year).collection('Months').document(month).collection('Types').document('Chi')
            chi_doc = chi_ref.get()

            if chi_doc.exists:
                doc_data = chi_doc.to_dict()
                if 'records' in doc_data and isinstance(doc_data['records'], list):
                    for record in doc_data['records']:
                        if isinstance(record, dict) and 'name' in record and 'amount' in record:
                            try:
                                name = record['name']
                                amount = float(record['amount'])
                                aggregated_data[name] += amount
                            except (ValueError, TypeError):
                                print(f"Skipping record with invalid amount: {record}")

            chart_data = [{'name': name, 'value': total_amount} for name, total_amount in aggregated_data.items()]
            return chart_data
        except Exception as e:
            print(f"Error getting pie chart data for month {year}-{month}: {e}")
            return []

    @staticmethod
    def get_total_saving():
        """Calculates the total amount from all 'Tiết kiệm' (Savings) records."""
        saving_data = []
        try:
            year_docs = db.collection('Year').stream()
            for year_doc in year_docs:
                month_docs = year_doc.reference.collection('Months').stream()
                for month_doc in month_docs:
                    saving_doc_ref = month_doc.reference.collection('Types').document('Tiết kiệm')
                    saving_doc = saving_doc_ref.get()
                    if saving_doc.exists:
                        doc_data = saving_doc.to_dict()
                        if 'records' in doc_data and isinstance(doc_data['records'], list):
                            saving_data.extend(doc_data['records'])
            return saving_data
        except Exception as e:
            print(f"Error getting total savings: {e}")
            return []

class Loan:
    @staticmethod
    def get_list_loan(page_size=5, start_after_doc_id=None):
        """Fetches a paginated list of loans."""
        try:
            # Sorting by a field is required for cursor-based pagination
            query = db.collection('Loan').order_by('startDate')

            if start_after_doc_id:
                start_after_doc = db.collection('Loan').document(start_after_doc_id).get()
                if not start_after_doc.exists:
                    # Handle case where the cursor document might have been deleted
                    return {'data': [], 'last_doc_id': None}
                query = query.start_after(start_after_doc)

            query = query.limit(page_size)
            docs_snapshot = query.stream()

            results = []
            last_doc_id = None
            for doc in docs_snapshot:
                doc_data = doc.to_dict()
                doc_data['id'] = doc.id
                results.append(doc_data)
                last_doc_id = doc.id  # Keep track of the last document

            return {'data': results, 'last_doc_id': last_doc_id}
        except Exception as e:
            print(f"Error getting paginated loan list: {e}")
            return {'data': [], 'last_doc_id': None}

    @staticmethod
    def get_loan_payments(loan_id):
        """Fetches the payment history for a specific loan."""
        try:
            payments_ref = db.collection('Loan').document(loan_id).collection('repayments').stream()
            payments = []
            for payment in payments_ref:
                payment_data = payment.to_dict()
                payment_data['id'] = payment.id
                payments.append(payment_data)
            return payments
        except Exception as e:
            print(f"Error getting loan payments: {e}")
            return []

    @staticmethod
    @firestore.transactional
    def add_payment(transaction, loan_id, paidDate, principalPaid, interestPaid):
        """
        Adds a new payment record and updates the loan's outstanding balance within a transaction.
        Note: This method must be called within a transaction context.
        """
        try:
            loan_ref = db.collection('Loan').document(loan_id)
            payment_id = str(uuid.uuid4())
            payment_ref = loan_ref.collection('repayments').document(payment_id)

            # 1. Get the current loan data from the transaction
            loan_snapshot = loan_ref.get(transaction=transaction)
            if not loan_snapshot.exists:
                raise ValueError(f"Loan with ID {loan_id} not found.")
            
            current_outstanding = loan_snapshot.get('outstanding')

            # Ensure 'outstanding' is a number
            if not isinstance(current_outstanding, (int, float)):
                raise TypeError("The 'outstanding' field in the loan document is not a number.")

            # 2. Calculate the new outstanding balance
            new_outstanding = current_outstanding - principalPaid
            if new_outstanding < 0:
                new_outstanding = 0 # Prevent negative balance

            # 3. Prepare the new payment data
            payment_date = datetime.strptime(paidDate, '%Y-%m-%d')
            payment_data = {
                "paidDate": payment_date,
                "principalPaid": principalPaid,
                "interestPaid": interestPaid,
                "created_at": datetime.utcnow(),
                "totalPaid": principalPaid + interestPaid
            }

            # 4. Set the new payment document in the transaction
            transaction.set(payment_ref, payment_data)
            
            # 5. Update the outstanding balance in the loan document
            transaction.update(loan_ref, {
                'outstanding': new_outstanding
            })
            
            return payment_id
        except Exception as e:
            print(f"Error during add_payment transaction for loan {loan_id}: {e}")
            raise  # Re-raise the exception to ensure the transaction is rolled back

class BookStore:
    @staticmethod
    def get_all_books():
        try:
            tree = defaultdict(list)
            book_docs = db.collection('Books').stream()           
            return dict(book_docs)
        except Exception as e:
            print(f"Error getting management data tree: {e}")
            return {}
