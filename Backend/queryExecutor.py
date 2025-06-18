from dbconfig import DB_CONFIG  # Import database configuration
import psycopg2
import psycopg2.extras

def executeQuery(query, params, querytype):
    """
    Execute a parameterized SQL query and return the result.
    Supports select, insert operations.
    """
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        # Execute the query with parameters
        print(f"Query type: {querytype}\nExecuting query: {query}") # Debugging statement to log the executed SQL query

        if params:
            print('Parameters:', params)   # Debugging statement to log the parameters used in the query

        cur.execute(query, params)

        if querytype == "select":
            rows = cur.fetchall()
            return rows
        elif querytype == "insert":
            # Ensure your query includes RETURNING id
            inserted_id = cur.fetchone()[0]
            conn.commit()
            print('Inserted ID:', inserted_id)  # Debugging statement to log the newly inserted row ID
            return inserted_id
        else:
            conn.commit()
            return None

    except Exception as e:
        print("Database error:", e)
        raise  # Let Flask handle error response at route level

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

