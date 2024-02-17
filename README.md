# Flask DB Manage 專案

這是一個使用 Flask 和 Docker 容器化 MSSQL 的示例專案，便於開發和部署。

## 開始之前

在開始之前，請確保你的開發環境中已經安裝了 Docker 和 Docker Compose。如果尚未安裝，請訪問 [Docker 官方網站](https://www.docker.com/get-started) 下載並安裝 Docker。

## 專案設置

1. 克隆此專案到你的本地機器:

    ```bash
    git clone https://github.com/kengyuchang/Flask_DB_MANAGE.git
    cd Flask_DB_MANAGE
    ```

2. 使用 Docker Compose 建立並啟動 Flask 應用和 MSSQL 數據庫:

    ```bash
    docker-compose up --build
    ```

    此命令將根據 `Dockerfile` 和 `docker-compose.yml` 文件自動構建 Flask 應用的 Docker 鏡像，並啟動 Flask 應用和 MSSQL 數據庫的容器。

## 使用說明

- Flask 應用將運行在 <http://localhost:5000>。
- MSSQL 數據庫的默認 SA 用戶密碼設為 `kengyu900342`。如果需要更改，請在 `docker-compose.yml` 文件中修改 `SA_PASSWORD` 環境變量。

## 配置說明

- Flask 應用的配置位於 `config.ini` 文件中，根據需要進行修改。
- 數據庫連接信息通過 `docker-compose.yml` 文件中的 `DATABASE_URL` 環境變量進行設置。

## 貢獻指南

如果您想對此專案作出貢獻，請先 Fork 此倉庫，然後創建一個新的分支，提交您的更改，並最後創建一個 Pull Request。

## 許可證

此專案採用 [MIT 許可證](https://opensource.org/licenses/MIT)。
