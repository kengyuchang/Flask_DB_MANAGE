# 使用官方 Python 執行時作為母鏡像
FROM python:3.7-slim

# 設置工作目錄為 /app
WORKDIR /app

# 將當前目錄內容複製到位於 /app 中的容器中
COPY . /app

# 安裝 requirements.txt 中指定的任何所需包
RUN pip install --trusted-host pypi.python.org -r requirements.txt

# 讓端口 5000 可用於外界訪問
EXPOSE 5000

# 定義環境變量
ENV NAME World

# 運行 app.py 時運行應用
CMD ["python", "app.py"]
