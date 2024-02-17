# -*- coding: utf-8 -*-
'''
-- =============================================
-- Author:		<John>
-- Create date: <2023/08/17>
-- Description:	logging 
-- =============================================
'''
import logging
import os
from logging.handlers import TimedRotatingFileHandler
import configparser


# Read configuration from the file
config = configparser.ConfigParser()
config_path =os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.ini')
with open(config_path, 'r', encoding='utf-8') as f:
    config.read_file(f)

#決定log folder
dbServer= config['init']['dbServer']
session_dbServer=config['init']['session_dbServer']
mainDir=config['init']['mainDir']+'log/'

if not os.path.exists(mainDir):
    os.makedirs(mainDir)
    
#用來判斷 logger 是否初始化
_logger_initialized =False

def initialize_logging(cname=None):
    global _logger_initialized

    if _logger_initialized:
        return logging.getLogger()
        
    #獲取呼叫名稱
    #caller_name=inspect.stack()[1].filename.split('/')[-1].split('.')[0]
    #flask_app_name= os.path.basename(__file__).split('.')[0]
    if cname==None:
        cname= os.path.basename(__file__).split('.')[0]

    flask_app_name=dbServer+'_'+cname

    log_filename = os.path.join(mainDir,f"{flask_app_name}.log")

    formatter = logging.Formatter('%(asctime)s %(name)-12s %(levelname)-8s %(message)s')

    handler = TimedRotatingFileHandler(log_filename, when="midnight", backupCount=7,delay=True)  # keep 7Days
    handler.setFormatter(formatter)

    handler.suffix=f"_%Y-%m-%d.log"

    logger=logging.getLogger()

    #清空已有的handlers
    for h in logger.handlers[:]:
        logger.removeHandler(h)

    #添加新的
    logger.addHandler(handler)
    logger.setLevel(logging.DEBUG)
    
    #標記已初始化
    _logger_initialized = True

    #test
    #logging.info(mainDir)
    #logging.info(dbServer)

    return logger

