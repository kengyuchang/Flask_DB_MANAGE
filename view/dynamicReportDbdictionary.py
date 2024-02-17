# -*- coding: utf-8 -*-
'''
-- =============================================
-- Author:		<John>
-- Create date: <2023/09/08>
-- Description:	數據字典的Controller
#數據字典_rul
-- =============================================
'''
from GenericMainProgram import GenericMainProgram
from flask import Flask, render_template, request, jsonify, Blueprint
import pandas as pd
import json
from globalSetInit import dbServer as c_dbServer,session_dbServer ,logger as logging

# Initialize the Flask application
app3 = Blueprint('app3', __name__)
avengers =[]

class CustomProgram(GenericMainProgram):
    def __init__(self, dbType, dbName, timeOut, poolSize):
        super().__init__(dbType, dbName, timeOut, poolSize)

#數據字典_rul
@app3.route('/dynamicReportDbdictionary/<clientId>/<netWebName>')
def dataCenterReportGrid(clientId,netWebName):
	logging.info("""init dynamicReportDbdictionary clientId=[%s] netWebName=['%s']"""%(clientId,netWebName))
	return render_template('dynamicReportDbdictionary.html',clientId=clientId,netWebName=netWebName)

#查詢_左邊上面_下拉選單_類別
@app3.route('/dynamicReportDbdictionary_getCategoryList', methods=['POST'])
def dynamicReportDbdictionary_getCategoryList():
    logging.info("dynamicReportDbdictionary_getCategoryList begin Request data: %s", request.form)
    netWebName = request.form.get('netWebName') or 'NULL'
    download = request.form.get('download') or 'NULL'
    sql="""    
        select [部門]
        from (
             SELECT  [類別] as [部門]
             ,[報表名稱]
             ,[顯示順序]
              ,畫面名稱
			 ,是否下載excel
             , ROW_NUMBER() over(partition by [類別],畫面名稱 order by [顯示順序]) RowNo
             FROM [REPORT].[dbo].[動態名單SQL]
        ) X
        where RowNo = 1
        """
    # 為了 dynamicReport_DataCenter 可以下載全部excel
    if netWebName != 'NULL':
        sql = sql + """   and  畫面名稱='%s' """ % (netWebName)
        if download == 'excel':
            sql = sql + """   and  是否下載excel='Y' """
        else:
            sql = sql + """   and  是否下載excel='Y' """
    sql = sql + """   order by 顯示順序  """
    logging.info("""dynamicReportDbdictionary_getCategoryList sql=[%s]"""%(sql))
    try:
        program = CustomProgram(c_dbServer,'ML',15,30)
        df = program.executePoolSQLInOut2df(sql)
        rename_dic={"部門":"nameList"
                    }
        results =df.rename(rename_dic, axis=1).to_dict()
        results["nameList"]  =df['部門'].values.tolist()
    except Exception as e:
        logging.error(""" 查詢報表發生error eMsg= %s""" % (str(e)))
        return jsonify(status=['ERROR'], statusColor=['-1'], f6Ctrl='-1', eMsg='查詢報表發生error eMsg=' + str(e),
                       data=[["查詢報表發生error 請截圖給報表維護者 eMsg=" + str(e)]], columns=[{"title": "錯誤訊息"}])
    finally:
        logging.info("dynamicReportDbdictionary_getCategoryList end")
    return jsonify(results)

#查詢_左邊_報表名稱
@app3.route('/dynamicReportDbdictionary_grid1Qyery', methods=['POST'])
def dynamicReportDbdictionary_grid1Qyery():
    logging.info("dynamicReportDbdictionary_grid1Qyery begin Request data: %s", request.json)
    data = request.json
    netWebName = data.get('netWebName') or 'NULL'
    download = data.get('download') or 'NULL'
    nameCategory = data.get('nameCategory') or 'NULL'
    clientId = data.get('clientId') or 'NULL'
    man = data.get('man') or 'NULL'
    sql = """    
    		 SELECT ROW_NUMBER() OVER (ORDER BY (SELECT 1)) AS 序號
                      ,[報表名稱]
    				  ,seq 
                      ,報表說明
              FROM [REPORT].[dbo].[動態名單SQL] where 1=1 """
    if netWebName != 'NULL':
        sql=sql + """   and  畫面名稱='%s' """%(netWebName)
        if download=='excel':
            sql=sql +"""   and  是否下載excel='Y' """
        else:
            sql=sql +"""   and  是否下載excel='Y' """
    if nameCategory != 'NULL':
        sql = sql + """ and  報表名稱 like '%%%s%%' """ % (nameCategory)
    if man != 'NULL':
        sql = sql + """ and  [類別] = N'%s'  """ % (man)
    sql = sql + '  order by [顯示順序]'
    logging.info("""dynamicReportDbdictionary_grid1Qyery sql=[%s]"""%(sql))
    try:
        program = CustomProgram(c_dbServer, 'ML', 15, 30)
        df = program.executePoolSQLInOut2df(sql)
    except Exception as e:
        logging.error("查詢報表發生error eMsg= %s", str(e))
        return jsonify(status=['ERROR'], statusColor=['-1'], f6Ctrl='-1', eMsg='查詢報表發生error eMsg=' + str(e),
                       data=[["查詢報表發生error 請截圖給報表維護者 eMsg=" + str(e)]], columns=[{"title": "錯誤訊息"}])
    finally:
        logging.info("dynamicReportDbdictionary_grid1Qyery end")
    return jsonify(status=['Finish!'],statusColor=['0'],f6Ctrl='0',data=json.loads(df.to_json(orient="split"))["data"],
                   columns=[{"title": str(col)} for col in json.loads(df.to_json(orient="split"))["columns"]])

@app3.route('/dynamicReportDbdictionary_getReportGrid', methods=['POST'])
def dynamicReportDbdictionary_getReportGrid():
    logging.info("dynamicReportDbdictionary_getReportGrid begin Request data: %s", request.form)
    reportType = request.form.get('reportType') or 'NULL'
    clientId = request.form.get('clientId') or 'NULL'
    try:
        program = CustomProgram(c_dbServer, 'ML', 15, 30)
        sql1=""" SELECT top 1  [SP名稱],isNULL([SP參數],'99991230') as SP參數  
                 FROM [REPORT].[dbo].[動態名單SQL] 
                 where  seq='%s' 
                """%(reportType)
        logging.info("""dynamicReportDbdictionary_getReportGrid sql=[%s]"""%(sql1))
        mdic=program.executePoolSQLInOut2df(sql1)
        spName = mdic.at[0, 'SP名稱']
        spArge = mdic.at[0, 'SP參數']
        logging.info("""dynamicReportDbdictionary_getReportGrid SP名稱=[%s], SP參數=[%s]"""%(spName,spArge))
        sql2= """exec %s '%s' """%(spName,clientId)
        if spArge != '99991230':
            sql2=sql2+","+spArge
        logging.info("""sql2=[%s]"""%(sql2))
        df = program.executePoolSQLInOut2df(sql2)
    except Exception as e:
        return jsonify(status=['ERROR'], statusColor=['-1'], f6Ctrl='-1', eMsg='查詢報表發生error eMsg=' + str(e),
                       data=[["查詢報表發生error 請截圖給報表維護者 eMsg=" + str(e)]], columns=[{"title": "錯誤訊息"}])
    finally:
        logging.info("dynamicReportDbdictionary_getReportGrid end")
    return jsonify(data=json.loads(df.to_json(orient="split"))["data"],
           columns=[{"title": str(col)} for col in json.loads(df.to_json(orient="split"))["columns"]])


@app3.route('/dynamicReportDbdictionary_getNoteDesc', methods=['POST'])
def dynamicReportDbdictionary_getNoteDesc():
    logging.info("dynamicReportDbdictionary_getNoteDesc begin Request data: %s", request.form)
    clientId = request.form.get('clientId') or 'NULL'
    pDbName = request.form.get('pDbName') or 'NULL'
    pSchema = request.form.get('pSchema') or 'NULL'
    pTableName = request.form.get('pTableName') or 'NULL'
    pColumnName = request.form.get('pColumnName') or 'NULL'
    logging.info("""dynamicReportDbdictionary_getNoteDesc clientId=[%s]""" % (clientId))
    sql="""    
        SELECT [DB_NAME]
          ,[TABLE_SCHEMA]
          ,[TABLE_NAME]
          ,[COLUMN_NAME]
          ,[註記]
          ,[使用說明]
          ,[資料原始來源]
          ,[seq]
          ,[Update_User]
          ,[Update_Date]
          ,[Create_Date]
        FROM [ML].[dbo].[數據字典_註記]
        WHERE 1=1
        """
    # 為了 dynamicReport_DataCenter 可以下載全部excel
    if pDbName != 'NULL' :
        sql = sql + """   and  DB_NAME=N'%s' """ % (pDbName)
    if pSchema != 'NULL' :
        sql = sql + """   and  TABLE_SCHEMA=N'%s' """ % (pSchema)
    if pTableName != 'NULL':
        sql = sql + """   and  TABLE_NAME=N'%s' """ % (pTableName)
    if pColumnName != 'NULL':
        sql = sql + """   and  COLUMN_NAME=N'%s' """ % (pColumnName)
    sql = sql + """   order by seq  """
    logging.info("""dynamicReportDbdictionary_getNoteDesc sql=[%s]"""%(sql))
    try:
        program = CustomProgram(c_dbServer, 'ML', 15, 30)
        df = program.executePoolSQLInOut2df(sql)
        rename_dic={"DB_NAME":"pDbName"
                    ,"TABLE_SCHEMA":"pSchema"
                    , "TABLE_NAME": "pTableName"
                    , "COLUMN_NAME": "pColumnName"
                    , "註記": "pNote"
                    , "使用說明": "pUseDesc"
                    , "資料原始來源": "pSource"
                    }
        results =df.rename(rename_dic, axis=1).to_dict()
        results["pDbName"]  =df['DB_NAME'].values.tolist()
        results["pSchema"] = df['TABLE_SCHEMA'].values.tolist()
        results["pTableName"] = df['TABLE_NAME'].values.tolist()
        results["pColumnName"] = df['COLUMN_NAME'].values.tolist()
        results["pNote"] = df['註記'].values.tolist()
        results["pUseDesc"] = df['使用說明'].values.tolist()
        results["pSource"] = df['資料原始來源'].values.tolist()
    except Exception as e:
        logging.error("dynamicReportDbdictionary_getNoteDesc end", exc_info=True)
        return jsonify(status=['ERROR'], statusColor=['-1'], f6Ctrl='-1', eMsg='查詢報表發生error eMsg=' + str(e),
                       data=[["查詢報表發生error 請截圖給報表維護者 eMsg=" + str(e)]], columns=[{"title": "錯誤訊息"}])
    finally:
        logging.info("dynamicReportDbdictionary_getNoteDesc end")
    return jsonify(results)

@app3.route('/dynamicReportDbdictionary_editSave', methods=['POST'])
def dynamicReportDbdictionary_editSave():
    logging.info("dynamicReportDbdictionary_editSave begin Request data: %s", request.form)
    clientId = request.form.get('clientId') or 'NULL'
    pDbName = request.form.get('pDbName') or 'NULL'
    pSchema = request.form.get('pSchema') or 'NULL'
    pTableName = request.form.get('pTableName') or 'NULL'
    pColumnName = request.form.get('pColumnName') or 'NULL'
    pNote = request.form.get('pNote') or 'NULL'
    pUseDesc = request.form.get('pUseDesc')
    pSource = request.form.get('pSource')
    sql = """ exec [ML].[dbo].[SP_數據字典_更新註記] N'%s' ,N'%s' ,N'%s',N'%s',N'%s',N'%s',N'%s',N'%s'  """ % (clientId,pDbName ,pSchema,pTableName,pColumnName,pNote,pUseDesc,pSource)
    #logging.info(sql)N'%s'
    try:
        program = CustomProgram(c_dbServer, 'ML', 15, 30)
        program.executePoolSQL(sql)
        results= {}
        results["status"] = ['處理完成!']
        results["statusColor"] = ['0']
    except Exception as e:
        return jsonify(status=['ERROR'], statusColor=['-1'], f6Ctrl='-1', eMsg='查詢報表發生error eMsg=' + str(e),
                       data=[["查詢報表發生error 請截圖給報表維護者 eMsg=" + str(e)]], columns=[{"title": "錯誤訊息"}])
    finally:
        logging.info("dynamicReportDbdictionary_editSave end")
    return jsonify(results)