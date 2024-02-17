#!/usr/bin/env python3
# -*- coding: utf-8 -*-
'''
-- =============================================
-- Author:		<John>
-- Create date: <2020/06/01>
-- Description:
--20230813 整合 log 與config in LogHelper.py ,另外 開發初始化 in globalSetInit.py
--20230913 dynamicName 整併至 dynamicReport by john ,使得 三功能整併 #各部門動態報表 & 動態名單 & 訊息360報表
-- =============================================
'''
from flask import Flask, Blueprint
from view.dataCenterReportGrid import app2
from view.dynamicReportDbdictionary import app3
from view.dynamicReport import app4

# Initialize the Flask application
app = Flask(__name__)

@app.route('/')
def index():
        app.logger.info('Hello index')
        return "Hello index"

if __name__ == '__main__':
    app.debug = True
    app.register_blueprint(app2)#數據中心動態報表
    app.register_blueprint(app3)# 數據字典
    app.register_blueprint(app4)#各部門動態報表 & 動態名單 & 訊息360報表
    app.run(host='localhost', port=5001,use_reloader=False)
    #app.run()