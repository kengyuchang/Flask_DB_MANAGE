import os
import configparser
from LogHelper import initialize_logging,mainDir,dbServer,session_dbServer

# Read configuration from the file
config = configparser.ConfigParser()
config_path =os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.ini')
with open(config_path, 'r', encoding='utf-8') as f:
    config.read_file(f)

#初始化log 和 初始化 dbServer
logger=initialize_logging(config['init']['logName'])