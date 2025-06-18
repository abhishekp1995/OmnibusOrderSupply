from datetime import datetime
import os
import sys
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import dbhandler as db  # Import the database handler module

app = Flask(__name__)
CORS(app) # Enable CORS so frontend can call this API

# 📁 Uploads directory setup
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/getInvoiceId', methods=['GET'])
def getId():
    result = db.getLastRowId()
    return jsonify(result)

@app.route('/getSales', methods=['GET'])
def search_sales():
    order_id = request.args.get('orderId')
    order_from = request.args.get('orderFrom')
    order_to = request.args.get('orderTo')

    # Optionally validate or log query params
    print(f"Search request: order_id={order_id}, from={order_from}, to={order_to}")

    result = db.getRecords(order_id, order_from, order_to)
    return jsonify(result)

@app.route('/addSale', methods=['POST'])
def add_sale():
    try:
        order_id = request.form.get('orderId')
        order_date = request.form.get('orderDate')
        invoice_no = request.form.get('invoiceNo')
        invoice_date = request.form.get('invoiceDate')
        total = request.form.get('total')
        file = request.files.get('invoicePdf')

        if not file:
            return jsonify({'error': 'No file received'}), 400

        # Sanitize and generate unique filename
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        safe_invoice_no = "".join(c for c in invoice_no if c.isalnum() or c in ('_', '-'))
        safe_filename = f"{safe_invoice_no}_{timestamp}.pdf"
        filepath = os.path.join(UPLOAD_FOLDER, safe_filename)

        # Save the PDF file
        file.save(filepath)

        # Save record to DB
        result = db.add_sale(order_id, order_date, invoice_no, invoice_date, total, filepath)
        return jsonify(result), 201

    except Exception as e:
        print(f"Error in add_sale: {e}", file=sys.stderr)
        return jsonify({'error': 'Internal server error'}), 500

# Serve uploaded invoices
@app.route('/uploads/<path:filename>', methods=['GET'])
def serve_invoice(filename):
    return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)
