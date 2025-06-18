import queryExecutor as qe  # Import the query executor module

def getLastRowId():
    """
    Fetch last row id in database to generate invoice ID.
    Constructs and executes a dynamic SQL query without parameters.
    """
    query = "SELECT orderid FROM saleRecord ORDER BY orderid DESC LIMIT 1"

    print('QUERY: ',query)  # Debugging statement to log the final SQL query

    result = qe.executeQuery(query, [], "select")
    if result:
        return result[0][0]  # Return the last row id
    else:
        return None  # Return None if no rows found

def getRecords(order_id, order_from, order_to):
    """
    Fetch sales records based on optional filters (order_id, order_from, order_to).
    Constructs and executes a dynamic SQL query with parameters.
    """
    query = "SELECT orderid, orderdate, invoiceid, invoicedate, total, invoice_path FROM saleRecord WHERE 1=1"
    conditions = []
    params = []

    if order_id:
        conditions.append("AND orderid = %s")
        params.append(order_id)
    if order_from:
        conditions.append("AND orderdate >= %s")
        params.append(order_from)
    if order_to:
        conditions.append("AND orderdate <= %s")
        params.append(order_to)

    # Join the conditions to the query
    for condition in conditions:
        query += " " + condition

    print('QUERY: ',query)  # Debugging statement to log the final SQL query

    return qe.executeQuery(query, params, "select")

def add_sale(orderId, orderDate, invoiceNo, invoiceDate, total, invoicePath):
    """
    Add a new sale record to the database.
    Constructs and executes an INSERT SQL query with parameters.
    """
    query = """
    INSERT INTO saleRecord (orderid, orderdate, invoiceid, invoicedate, total, invoice_path)
    VALUES (%s, %s, %s, %s, %s, %s)
    RETURNING id
    """
    params = (orderId, orderDate, invoiceNo, invoiceDate, total, invoicePath)

    print('QUERY: ',query)  # Debugging statement to log the final SQL query

    return qe.executeQuery(query, params, "insert")
