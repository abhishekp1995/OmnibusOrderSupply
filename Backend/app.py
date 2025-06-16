from flask import Flask, request, jsonify
from flask_cors import CORS
import dbhandler as db


app = Flask(__name__)
CORS(app)  # Enable CORS so frontend can call this API


@app.route('/searchSales', methods=['GET'])
def search_sales():
    order_id = request.args.get('orderId')
    order_from = request.args.get('orderFrom')
    order_to = request.args.get('orderTo')
    result= db.getRecords(order_id,order_from,order_to)
    return jsonify(result)

@app.route('/addSale', methods=['POST'])
def add_sale():
    data = request.get_json()
    result= db.add_sale(data)
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)