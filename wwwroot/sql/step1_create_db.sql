-- =========================================================================================
-- BƯỚC 1: CẤP QUYỀN CHO USER [pim] TRÊN DATABASE ECoffeeDB
-- Chạy bằng tài khoản SA hoặc tài khoản có quyền sysadmin trên server 10.80.1.88
-- (Bỏ qua nếu user pim đã có quyền db_owner trên ECoffeeDB)
-- =========================================================================================

USE master;
GO

-- Tạo Login pim nếu chưa có
IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = 'pim')
BEGIN
    CREATE LOGIN pim WITH PASSWORD = 'pimpass', CHECK_POLICY = OFF;
    PRINT N'✅ Đã tạo SQL Login [pim]';
END
ELSE
    PRINT N'ℹ️ Login [pim] đã tồn tại.';
GO

USE ECoffeeDB;
GO

-- Tạo User trong ECoffeeDB nếu chưa có
IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = 'pim')
BEGIN
    CREATE USER pim FOR LOGIN pim;
    PRINT N'✅ Đã tạo Database User [pim] trong ECoffeeDB';
END
ELSE
    PRINT N'ℹ️ User [pim] đã tồn tại trong ECoffeeDB.';
GO

-- Cấp quyền db_owner (đủ quyền CRUD toàn bộ bảng)
ALTER ROLE db_owner ADD MEMBER pim;
PRINT N'✅ Đã cấp quyền db_owner cho [pim] trong ECoffeeDB';
PRINT N'';
PRINT N'👉 Tiếp theo: Chạy file step2_create_tables.sql bằng user pim';
GO
