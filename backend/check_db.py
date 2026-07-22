import os
import mysql.connector

print('DB:', os.environ.get('MYSQL_DATABASE'))
cnx = mysql.connector.connect(user=os.environ.get('MYSQL_USER'), password=os.environ.get('MYSQL_PASSWORD'), host=os.environ.get('MYSQL_HOST'), port=int(os.environ.get('MYSQL_PORT') or 3306), database=os.environ.get('MYSQL_DATABASE'))
cur = cnx.cursor()
cur.execute('SHOW TABLES')
print('Tables:')
for r in cur.fetchall():
    print(' ', r)
cur.close()
cnx.close()
