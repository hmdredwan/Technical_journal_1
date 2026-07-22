import os
import mysql.connector

cfg = {
    'user': os.environ.get('MYSQL_USER','root'),
    'password': os.environ.get('MYSQL_PASSWORD',''),
    'host': os.environ.get('MYSQL_HOST','127.0.0.1'),
    'port': int(os.environ.get('MYSQL_PORT','3306')),
}

db_name = os.environ.get('MYSQL_DATABASE','journal_db')

try:
    cnx = mysql.connector.connect(**cfg)
    cursor = cnx.cursor()
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    print('Database created or already exists:', db_name)
    cursor.close()
    cnx.close()
except Exception as e:
    print('Failed to create database:', e)
    raise
