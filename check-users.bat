@echo off
echo Trying to connect to PostgreSQL...
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -p 5432 -c "\du"
pause
