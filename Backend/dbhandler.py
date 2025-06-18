import queryExecutor as qe

def getRecords(order_id, order_from, order_to):
    query = "SELECT orderid, orderdate, invoiceid, invoicedate, total, invoice_path FROM saleRecord"
    conditions = []
    params = []

    if order_id:
        conditions.append("orderid = %s")
        params.append(order_id)
    if order_from:
        conditions.append("orderdate >= %s")
        params.append(order_from)
    if order_to:
        conditions.append("orderdate <= %s")
        params.append(order_to)

    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    
    return qe.executeQuery(query, params, "select")  
     

def add_sale(orderId, orderDate, invoiceNo, invoiceDate, total, invoicePath):
    query = """
    INSERT INTO saleRecord (orderid, orderdate, invoiceid, invoicedate, total, invoice_path)
    VALUES (%s, %s, %s, %s, %s, %s)
    RETURNING id
    """
    params = (orderId, orderDate, invoiceNo, invoiceDate, total, invoicePath)
    
    return qe.executeQuery(query, params, "insert")