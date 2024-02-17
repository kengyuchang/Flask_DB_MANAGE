# -*- coding: utf-8 -*-
'''
-- =============================================
-- Author:		<John>
-- Create date: <2023/09/05>
-- Description:	錦囊妙計的Controller
停用 #原本數據中心可自由下載任意報表 因有開發 錦囊妙計_excel 就不需要了
包含兩個URL
#錦囊妙計_rul
#錦囊妙計excel_rul
-- =============================================
'''
from GenericMainProgram import *
from flask import Flask, render_template, request, jsonify, Blueprint
import json
from globalSetInit import dbServer as c_dbServer,session_dbServer ,logger as logging

# Initialize the Flask application
app4 = Blueprint('app4', __name__)

avengers =[]
#錦囊妙計_rul

class CustomProgram(GenericMainProgram):
    def __init__(self, dbType, dbName, timeOut, poolSize):
        super().__init__(dbType, dbName, timeOut, poolSize)
@app4.route('/dynamicReportView/<newWebCategory>/<clientId>/<netWebName>')
def dynamicReport(newWebCategory,clientId,netWebName):
	logging.info("""init  newWebCategory=['%s'] dynamicReportView clientId=[%s] netWebName=['%s'] """%(newWebCategory,clientId,netWebName))
	return render_template('dynamicReportView.html',newWebCategory=newWebCategory,clientId=clientId,netWebName=netWebName)

#錦囊妙計excel_rul
@app4.route('/dynamicReportViewExcel/<newWebCategory>/<clientId>/<netWebName>/<download>')
def dynamicReportExcel(newWebCategory,clientId,netWebName,download):
	logging.info("""init  newWebCategory=['%s'] dynamicReportView clientId=[%s] netWebName=['%s'] download=['%s'] """%(newWebCategory,clientId,netWebName,download))
	return render_template('dynamicReportViewExcel.html',newWebCategory=newWebCategory,clientId=clientId,netWebName=netWebName,download=download)

#查詢_左邊上面_下拉選單_類別
@app4.route('/dynamicReportView_getCategoryList', methods=['POST'])
def dynamicReportView_getCategoryList():
    logging.info("dynamicReportView_getCategoryList begin Request data: %s", request.form)
    netWebName = request.form.get('netWebName') or 'NULL'
    download = request.form.get('download') or 'NULL'
    clientId = request.form.get('clientId') or 'NULL'
    try:
        sql = """ exec [dbo].[SP_call_by_flask_查詢_錦囊妙計_類別] '%s','%s','%s' """ % (clientId, download, netWebName)
        logging.info(sql)
        #df = GenericMainProgram.executeSQLInOut2df(sql, c_dbServer, 'ML', 15)
        program = CustomProgram(c_dbServer, 'ML', 15, 30)
        df = program.executePoolSQLInOut2df(sql)
        rename_dic={"部門":"nameList"}
        results =df.rename(rename_dic, axis=1).to_dict()
        results["nameList"]  =df['部門'].values.tolist()
    except Exception as e:
        logging.error(""" 查詢報表發生error eMsg= %s""" % ( str(e)))
        return jsonify(status=['ERROR'], statusColor=['-1'], f6Ctrl='-1',eMsg='查詢報表發生error eMsg='+str(e),data=[["查詢報表發生error 請截圖給報表維護者 eMsg="+str(e)]],columns=[{"title":"錯誤訊息"}])
    finally:
        logging.info("dynamicReportView_getCategoryList end")
    return jsonify(results)

#查詢_左邊_報表名稱
@app4.route('/dynamicReportView_grid1Qyery', methods=['POST'])
def dynamicReportView_grid1Qyery():
    logging.info("dynamicReportView_mainQuery begin Request data: %s", request.json)
    data = request.json
    netWebName = data.get('netWebName')  or 'NULL'
    download = data.get('download')  or 'NULL'
    nameCategory = data.get('nameCategory')  or 'NULL'
    clientId = data.get('clientId') or 'NULL'
    man = data.get('man')  or 'NULL'
    try:
        sql = """  exec [dbo].[SP_call_by_flask_查詢_錦囊妙計_報表清單] '%s','%s','%s','%s' ,'%s' """ % (
        clientId, download, nameCategory, man,netWebName)
        logging.info(sql)
        #df = GenericMainProgram.executeSQLInOut2df(sql, c_dbServer, 'ML', 15)
        program = CustomProgram(c_dbServer, 'ML', 15, 30)
        df = program.executePoolSQLInOut2df(sql)
    except Exception as e:
        logging.error("查詢報表發生error eMsg= %s", str(e))
        return jsonify(status=['ERROR'], statusColor=['-1'], f6Ctrl='-1', eMsg='查詢報表發生error eMsg='+str(e),
                       data=[["查詢報表發生error 請截圖給報表維護者 eMsg="+str(e)]], columns=[{"title":"錯誤訊息"}])
    finally:
        logging.info("dynamicReportView_mainQuery end")

    return jsonify(status=['Finish!'], statusColor=['0'], f6Ctrl='0',
                   data=json.loads(df.to_json(orient="split"))["data"],
                   columns=[{"title": str(col)} for col in json.loads(df.to_json(orient="split"))["columns"]])

#查詢_中間_grid2_報表內容
@app4.route('/dynamicReportView_getReportGrid', methods=['POST'])
def dynamicReportView_getReportGrid():
    logging.info("dynamicReportView_getReportGrid begin Request data: %s", request.form)
    reportType = request.form.get('reportType') or 'NULL'
    netWebName = request.form.get('netWebName') or 'NULL'
    reportName = request.form.get('reportName') or 'NULL'
    download = request.form.get('download') or 'NULL'
    clientId = request.form.get('clientId') or 'NULL'
    webSpArgs = request.form.get('webSpArgs').strip() or 'NULL'
    # Log the use of the report
    #logUseReportSql = """exec WebPlaform.[dbo].[SP_Log_User_Download] '%s','%s','%s','%s' """ % (
    #clientId, reportName, netWebName, download)
    #GenericMainProgram.executeSQL(logUseReportSql, session_dbServer, 'WebPlaform', 15)
    try:
        sql1 = """ 
        SELECT top 1 [SP名稱], isNULL([SP參數],'99991230') as SP參數  
        FROM [REPORT].[dbo].[動態名單SQL] 
        where seq='%s' 
        """ % reportType

        mdic = GenericMainProgram.executeSQLInOut(sql1, c_dbServer, 'REPORT', 60)
        spName = mdic[0]['SP名稱']
        spArge = mdic[0]['SP參數']
        logging.info("""dynamicReportView_getReportGrid SP名稱=[%s], SP參數=[%s]""" % (spName, spArge))
        sql2 = """exec %s '%s' """ % (spName, clientId)
        if spArge != '99991230':
            if webSpArgs !='NULL':
                spArge = webSpArgs
            sql2 = sql2 + "," + spArge
        logging.info("""sql2=[%s]""" % (sql2))
        #df = GenericMainProgram.executeSQLInOut2df(sql2, c_dbServer, 'REPORT', 15)
        program = CustomProgram(c_dbServer, 'REPORT', 15, 30)
        df = program.executePoolSQLInOut2df(sql2)
    except Exception as e:
        return jsonify(status=['ERROR'], statusColor=['-1'], f6Ctrl='-1', eMsg='查詢報表發生error eMsg=' + str(e),
                       data=[["查詢報表發生error 請截圖給報表維護者 eMsg=" + str(e)]], columns=[{"title": "錯誤訊息"}])
    finally:
        logging.info("dynamicReportView_getReportGrid end")
    return jsonify(
        data=json.loads(df.to_json(orient="split"))["data"],
        columns=[{"title": str(col)} for col in json.loads(df.to_json(orient="split"))["columns"]]
    )
