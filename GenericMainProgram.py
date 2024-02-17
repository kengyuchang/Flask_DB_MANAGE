# -*- coding: utf-8 -*-
'''
-- =============================================
-- Author:		<John>
-- Create date: <2023/09/05>
-- Description:	GenericMainProgram for flask
--20230906 新增 executeSQLInOut2df
-- =============================================
'''
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from sqlalchemy.sql import text
import pymssql
import os
import psycopg2
import pandas as pd
import smtplib, ssl
from os.path import basename
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
import configparser




class GenericMainProgram:

    def __init__(self, dbType, dbName, timeOut, poolSize):
        self.engine = self.init_db_pool(dbType, dbName, timeOut, poolSize)

    @classmethod
    def init_db_pool(cls, dbType, dbName, timeOut, poolSize):
        # Read configuration from the file
        config = configparser.ConfigParser()
        config_path =os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.ini')
        with open(config_path, 'r', encoding='utf-8') as f:
            config.read_file(f)

        if config['DB_conn'][dbType + '_DB'] == "MS":
            #engine_url = f"mssql+pymssql://{dictx[dbType + '_user']}:{dictx[dbType + '_password']}@{dictx[dbType + '_server']}/{dbName}?charset=utf8"
            #engine_url='mssql+pymssql://@10.92.3.125/test?charset=utf8'
            engine_url = f"mssql+pymssql://{config['DB_conn'][dbType + '_user']}:{config['DB_conn'][dbType + '_password']}@{config['DB_conn'][dbType + '_server']}/{dbName}?charset=utf8"
            engine = create_engine(
                engine_url,
                connect_args={'timeout': timeOut},  # 设置连接超时时间
                pool_timeout=30,  # 从连接池获取连接的超时时间
                pool_size=poolSize  # 连接池大小
                #max_overflow=5,  # 超出连接池大小外最多创建的连接数
            )
            return engine

    def executePoolSQL(self, sql):
        Session = sessionmaker(bind=self.engine)
        session = Session()
        try:
            session.execute(text(sql))
            session.commit()
        except Exception as e:
            session.rollback()
            raise RuntimeError("%s" % (e)) from e
        finally:
            session.close()

    def executePoolSQLInOut2df3(self, sql):
        Session = sessionmaker(bind=self.engine)
        session = Session()
        results = pd.DataFrame()
        try:
            # Here we use the session's bind to get the engine/connection and then pass it to pandas
            results = pd.read_sql(sql=sql, con=session.bind)
        except Exception as e:
            raise RuntimeError("%s" % (e)) from e
        finally:
            session.close()
        return results
    #20240216 by john for mac(intel)
    def executePoolSQLInOut2df(self, sql):
        # 創建 Session
        Session = sessionmaker(bind=self.engine)

        try:
            # 使用 with 語句自動管理 Session 和 Connection 資源
            with Session() as session, session.connection() as conn:
                # 使用 SQLAlchemy 的 text() 函數處理 SQL 語句並執行
                result_proxy = conn.execute(text(sql))
                # 將結果轉換為 DataFrame
                results = pd.DataFrame(result_proxy.fetchall(), columns=result_proxy.keys())
                return results
        except Exception as e:
            # 拋出 RuntimeError，向上層報告錯誤
            raise RuntimeError("%s" % (e)) from e

    def getDBConnection(dbType, dbName, timOut):
        intimOut = 30
        if timOut > intimOut:
            intimOut = timOut

        # Read configuration from the file
        config = configparser.ConfigParser()
        config_path =os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.ini')
        with open(config_path, 'r', encoding='utf-8') as f:
            config.read_file(f)

        if config['DB_conn'][dbType + '_DB'] == "MS":
            conn = pymssql.connect(
                server=config['DB_conn'][dbType + '_server'],
                user=config['DB_conn'][dbType+'_user'],
                password=config['DB_conn'][dbType+'_password'],
                database=dbName,
                timeout=intimOut,
                as_dict=True,
                charset='utf8'
            )
            conn.autocommit(True)
        elif config['DB_conn'][dbType + '_DB'] == "PG":
            conn = psycopg2.connect(
                host=config['DB_conn'][dbType + '_server'],
                port="5432",
                user=config['DB_conn'][dbType + '_user'],
                password=config['DB_conn'][dbType + '_password'],
                database=dbName,
                connect_timeout=intimOut,
            )
            conn.set_client_encoding('UTF8')
            conn.autocommit = True
        return conn

    def executeSQLWithConn(conn, sql):
        cursor = conn.cursor()
        cursor.execute(sql)

    def executeSQLWithConnInOut(conn, sql):
        results = dict()
        cursor = conn.cursor()
        cursor.execute(sql)
        # 20200513 by john 改成回傳多筆
        # results = cursor.fetchone()
        results = cursor.fetchall()
        return results

    def executeSQL(sql, dbType, dbName, timOut):
        conn = GenericMainProgram.getDBConnection(dbType, dbName, timOut)
        try:
            cursor = conn.cursor()
            cursor.execute(sql)
        finally:
            conn.close()

    def executeManySQL(sql, dbType, dbName, timOut, p_list=[]):
        conn = GenericMainProgram.getDBConnection(dbType, dbName, timOut)
        try:
            cursor = conn.cursor()
            cursor.executemany(sql, p_list)
        finally:
            conn.close()

    def executeSQLInOut(sql, dbType, dbName, timOut):
        results = dict()
        conn = GenericMainProgram.getDBConnection(dbType, dbName, timOut)
        try:
            cursor = conn.cursor()
            cursor.execute(sql)
            # 20200513 by john 改成回傳多筆
            # results = cursor.fetchone()
            results = cursor.fetchall()
        finally:
            conn.close()
        return results

    def executeSQLInOut2df(sql, dbType, dbName, timOut):
        results = pd.DataFrame()
        conn = GenericMainProgram.getDBConnection(dbType, dbName, timOut)
        try:
            results = pd.read_sql(sql, conn)
        finally:
            conn.close()
        return results

    def sendMail(title, msg,To=['cathaysec-gp205@cathaysec.com.tw','cathaysec-gp206@cathaysec.com.tw'], CC=[], BCC=[], files=None):
        html_string = """
            <html>
				<head><title>%s</title></head>
				<link rel="stylesheet" type="text/css" href="df_style.css"/>
				<body>
				<b>%s</b>
				</body>
            </html>
            """ % (title, msg)
        # html_string.format(table=msg.to_html(classes='mystyle'))
        mime = MIMEMultipart()
        # mime = MIMEText(html, "html", "utf-8")
        mime["Subject"] = title
        mime["From"] = "m-datacenter@cathaysec.com.tw"
        mime["To"] = ",".join(To)
        if CC:
            mime["Cc"] = ",".join(CC)
        if BCC:
            mime["Bcc"] = ",".join(BCC)
        # msg = mime.as_string()
        mime.attach(MIMEText(html_string, "html", "utf-8"))
        # attachment
        for f in files or []:
            with open(f, "rb") as fil:
                part = MIMEApplication(
                    fil.read(),
                    Name=basename(f)
                )
                part['Content-Disposition'] = 'attachment; filename="%s"' % basename(f)
                mime.attach(part)
        smtp = smtplib.SMTP("cathaymail.linyuan.com.tw", 587)
        smtp.ehlo()
        smtp.starttls()
        smtp.login("m-datacenter@cathaysec.com.tw", "Cathay123")
        # from_addr="m-datacenter@cathaysec.com.tw"
        # to_addr=["kengyu.c@cathaysec.com.tw"]
        status = smtp.sendmail(mime["From"], To + CC + BCC, mime.as_string())
        if status == {}:
            print("郵件傳送成功!")
        else:
            print("郵件傳送失敗!")
        smtp.quit()

    def twDateToDate(in_twDate):
        y, m, d = in_twDate.split('/')
        return str(int(y) + 1911) + '/' + m + '/' + d

    def checkIsTradeDay(in_day=datetime.today().strftime('%Y%m%d')):
        result = False
        # sql="""  select top 1 D_TRADE_DATE  from sql3112.R6DB.[dbo].[TRADE] with(nolock) where D_TRADE_DATE= convert(varchar, getdate(), 112)   """
        sql = """  select top 1 D_TRADE_DATE  from sql3112.R6DB.[dbo].[TRADE] with(nolock) where D_TRADE_DATE= '%s'   """ % (
            in_day)
        d = GenericMainProgram.executeSQLInOut(sql, '3-123', 'OUTBOUND', 15)
        if bool(d):
            result = True
        return result

    def getProdlsit():
        dictx = config.DB_conn
        realKeylist = []
        keylist = dictx.keys()
        for key in keylist:
            x = key.find("_isprod")
            if (x > 0):
                if ('Y' == dictx[key]):
                    realKeylist.append(key[0:x])
        return realKeylist

    def run():
        # config_dict1 =GenericMainProgram.getConfigHash_JAVA("D:\D\DataCenter\DBconfig.config")
        # conn1 = GenericMainProgram.getDBConnection_JAVA(config_dict1,'123','DB_MANAGE')
        # conn1 =GenericMainProgram.getDBConnection('125','DB_MANAGE',300)
        # sql ='select top 20 * from DB_MANAGE.dbo.執行序列 '
        # datas = pd.read_sql(sql, conn1)
        sql = """    
        	SELECT idno FROM gatewayct.mpasslog limit 10;
        """
        conn = GenericMainProgram.getDBConnection('4-42', 'gatewayct', 15)
        df = pd.read_sql(sql, conn)
        if GenericMainProgram.checkIsTradeDay():
            print('true')
        else:
            print('false')
        conn.close()
        # GenericMainProgram.sendMail('SECSVR3-125 Python RunProcess_error','cyndi',['kengyu.c@cathaysec.com.tw'])


# runPrgram
if __name__ == "__main__":
    # GenericMainProgram.run()
    GenericMainProgram.run()

