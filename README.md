# 1
  安装backend中python所需的环境的包, 见backend/requirements.txt
# 2
  安装frontend汇总的node包, npm install
# 3
  下载符合平台的go2rtc程序
# 4
  运行go2rtc, 运行配置是go2rtc.yaml
# 5
  运行前端, npm run dev
# 6
  运行后端, python app.py
启动运行前，要配置好pysql数据库和大模型apikey
例子：
export DATABASE_URL=postgresql://postgres:password@localhost:5432/cctv_event
export LLAMA_API_KEY=xxxxxxxx