# -*- coding: utf-8 -*-
'''
-- =============================================
-- Author:		<John>
-- Create date: <2023/09/07>
-- Description:	數據動態報表的Controller
只有一個 URL
-- =============================================
'''
from GenericMainProgram import GenericMainProgram
from flask import Flask, render_template, request, jsonify, Blueprint
import pandas as pd
import json
from globalSetInit import dbServer as c_dbServer,session_dbServer ,logger as logging

# Initialize the Flask application
app2 = Blueprint('app2', __name__)
avengers =[]

class CustomProgram(GenericMainProgram):
    def __init__(self, dbType, dbName, timeOut, poolSize):
        super().__init__(dbType, dbName, timeOut, poolSize)

#數據動態報表的URL
@app2.route('/dataCenterReportGrid')
def dataCenterReportGrid():
	return render_template('dataCenterReportGrid.html')

#查詢_左邊上面_下拉選單_類別
@app2.route('/dataCenterReportGrid_getCategoryList', methods=['POST'])
def dataCenterReportGrid_getCategoryList():
    logging.info("dataCenterReportGrid_getCategoryList begin Request data: %s", request.form)
    try:
        program = CustomProgram(c_dbServer, 'ML', 15, 30)
        sql="""    
            select [部門]
            from (
                 SELECT [部門]
                 ,[報表名稱]
                 ,[顯示順序]
                 , ROW_NUMBER() over(partition by [部門] order by [顯示順序]) RowNo
                 FROM [ML].[dbo].[動態SQL_Flask]
            ) X
            where RowNo = 1
            order by [顯示順序]
            """
        logging.info("""dataCenterReportGrid_getCategoryList sql=[%s]"""%(sql))
        df = program.executePoolSQLInOut2df(sql)
        rename_dic = {"部門": "nameList"}
        results = df.rename(rename_dic, axis=1).to_dict()
        results["nameList"] = df['部門'].values.tolist()
    except Exception as e:
        logging.error(""" 查詢報表發生error eMsg= %s""" % (str(e)))
        return jsonify(status=['ERROR'], statusColor=['-1'], f6Ctrl='-1', eMsg='查詢報表發生error eMsg=' + str(e),
                       data=[["查詢報表發生error 請截圖給報表維護者 eMsg=" + str(e)]], columns=[{"title": "錯誤訊息"}])
    finally:
        logging.info("dataCenterReportGrid_getCategoryList end")
    return jsonify(results)

#查詢_左邊_報表名稱
@app2.route('/dataCenterReportGrid_grid1Qyery', methods=['POST'])
def dataCenterReportGrid_grid1Qyery():
    logging.info("dataCenterReportGrid_grid1Qyery begin Request data: %s", request.json)
    data = request.json
    nameCategory = data.get('nameCategory')  or 'NULL'
    man = data.get('man')  or 'NULL'
    try:
        program = CustomProgram(c_dbServer, 'ML', 15, 30)
        sql="""    
             SELECT ROW_NUMBER() OVER (ORDER BY (SELECT 1)) AS 序號
                      ,[報表名稱]
                      ,seq 
                      ,報表說明
              FROM [ML].[dbo].[動態SQL_Flask] where 1=1 """
        if nameCategory!='NULL':
            sql=sql + """ and  報表名稱 like '%%%s%%' """%(nameCategory)
        if man!='NULL':
            sql=sql + """ and  部門 ='%s'  """%(man)
        sql=sql+'  order by [顯示順序]'
        logging.info("""dataCenterReportGrid_grid1Qyery sql=[%s]"""%(sql))
        df = program.executePoolSQLInOut2df(sql)
    except Exception as e:
        logging.error("查詢報表發生error eMsg= %s", str(e))
        return jsonify(status=['ERROR'], statusColor=['-1'], f6Ctrl='-1', eMsg='查詢報表發生error eMsg=' + str(e),
                       data=[["查詢報表發生error 請截圖給報表維護者 eMsg=" + str(e)]], columns=[{"title": "錯誤訊息"}])
    finally:
        logging.info("dataCenterReportGrid_grid1Qyery end")
    return jsonify(status=['Finish!'],statusColor=['0'],f6Ctrl='0',data=json.loads(df.to_json(orient="split"))["data"],
                   columns=[{"title": str(col)} for col in json.loads(df.to_json(orient="split"))["columns"]])

#查詢_中間_grid2_報表內容
@app2.route('/dataCenterReportGrid_getReportGrid', methods=['POST'])
def dataCenterReportGrid_getReportGrid():
    logging.info("dataCenterReportGrid_getReportGrid begin Request data: %s", request.form)
    reportType = request.form.get('reportType') or 'NULL'
    reportName = request.form.get('reportName') or 'NULL'
    clientIp=request.remote_addr

    try:
        program = CustomProgram(c_dbServer, 'ML', 15, 30)
        sql2=""
        sql1=""" SELECT top 1  [查詢_SQL] FROM [ML].[dbo].[動態SQL_Flask] where  seq='%s' """%(reportType)
        logging.info("""dataCenterReportGrid_getReportGrid sql=[%s]"""%(sql1))
        mdic=GenericMainProgram.executeSQLInOut(sql1,c_dbServer, 'ML', 15)
        sql2=mdic[0]['查詢_SQL']
        logging.info("""dataCenterReportGrid_getReportGrid sql=[%s]"""%(sql2))
        # Log the use of the report
        #logUseReportSql = """exec WebPlaform.[dbo].[SP_Log_User_Download] '%s','%s','%s','%s' """ % (clientIp, reportName,'dataCenter動態報表', '')
        #GenericMainProgram.executeSQL(logUseReportSql, session_dbServer, 'WebPlaform', 15)
        df = program.executePoolSQLInOut2df(sql2)
    except Exception as e:
        return jsonify(status=['ERROR'], statusColor=['-1'], f6Ctrl='-1', eMsg='查詢報表發生error eMsg=' + str(e),
                       data=[["查詢報表發生error 請截圖給報表維護者 eMsg=" + str(e)]], columns=[{"title": "錯誤訊息"}])
    finally:
        logging.info("dataCenterReportGrid_getReportGrid end")
    return jsonify(data=json.loads(df.to_json(orient="split"))["data"],
           columns=[{"title": str(col)} for col in json.loads(df.to_json(orient="split"))["columns"]])