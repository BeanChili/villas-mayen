@echo off
set PGPASSWORD=admin
"E:\Postgres\18\bin\psql.exe" -U postgres -h localhost -p 5432 -c "CREATE DATABASE villasmayen;"
pause
