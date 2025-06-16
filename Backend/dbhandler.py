import queryExecutor as qe
import psycopg2

def getRecords(order_id,order_from,order_to):
    query = "SELECT orderid, orderdate, invoiceid, invoicedate, total, encode(invoice, 'base64') AS invoice FROM saleRecord"
    conditions = []
    params = []
    result = []
    
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
        
    result=qe.executeQuery(query,params,"select")
    return result

def add_sale(data):
    query = """
    INSERT INTO saleRecord (orderid, orderdate, invoiceid, invoicedate, total, invoice)
    VALUES (%s, %s, %s, %s, %s, %s)
    RETURNING id
    """
    params = ()
    result = []
    
    params = (
            data['orderid'],
            data['orderdate'],
            data['invoiceid'],
            data['invoicedate'],
            data['total'],
            psycopg2.Binary(data['invoice']) if data.get('invoice') else None
        )
    
    result=qe.executeQuery(query,params,"insert")
    return result
