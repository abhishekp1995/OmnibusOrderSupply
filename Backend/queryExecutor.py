from dbconfig import DB_CONFIG
import psycopg2
import psycopg2.extras

def executeQuery(query, params, querytype):
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute(query, params)

        if querytype == "select":
            rows = cur.fetchall()
            return rows
        elif querytype == "insert":
            # Ensure your query includes RETURNING id
            inserted_id = cur.fetchone()[0]
            conn.commit()
            return inserted_id
        else:
            conn.commit()
            return None  # For update/delete if you extend

    except Exception as e:
        print("Database error:", e)
        raise  # Let Flask handle error response at route level

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
