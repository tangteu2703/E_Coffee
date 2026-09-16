-- =========================================================================================
-- E-COFFEE (CÀ PHÊ HOÀNG GIA) - SEED DATA SCRIPT
-- RDBMS: Microsoft SQL Server 2016+ / Azure SQL Database
-- Mục đích: Nạp dữ liệu mẫu ban đầu
-- Cập nhật: Thêm Branches, BranchProductPrices; Users.BranchId; Vouchers.BranchId;
--           DiningTables.BranchId; ProductPriceHistories.ProductName
-- =========================================================================================

USE ECoffeeDB;
GO

-- =========================================================================================
-- 1. INSERT TRỤ SỞ / CHI NHÁNH (Branches)  ← MỚI
-- =========================================================================================
PRINT N'Đang nạp dữ liệu Branches...';
SET IDENTITY_INSERT Branches ON;
INSERT INTO Branches (Id, Name, ShortName, Address, District, City, Lat, Lng, Phone, OpenHours, IsActive)
VALUES
(1, N'Hoàng Gia - Phùng Chí Kiên (Hà Nội)', N'Phùng Chí Kiên (Hà Nội)', N'Số 66 Phùng Chí Kiên', N'Cầu Giấy', N'Hà Nội', 21.0358, 105.7989, N'024 3568 8899', N'06:30 – 22:00', 1),
(2, N'Hoàng Gia - Nguyễn Trãi (Hà Nội)',    N'Nguyễn Trãi (Hà Nội)',    N'142 Nguyễn Trãi',      N'Thanh Xuân', N'Hà Nội', 20.9952, 105.8218, N'024 3568 7711', N'07:00 – 22:00', 1),
(3, N'Hoàng Gia - Lê Văn Sỹ (TP.HCM)',      N'Lê Văn Sỹ (TP.HCM)',      N'38 Lê Văn Sỹ',         N'Phú Nhuận',  N'TP.HCM', 10.7972, 106.6842, N'028 3845 9900', N'06:00 – 23:00', 1);
SET IDENTITY_INSERT Branches OFF;
GO

-- =========================================================================================
-- 2. INSERT TÀI KHOẢN NGƯỜI DÙNG & NHÂN VIÊN (Users)
--    Thêm cột BranchId (null = Admin, có giá trị = Manager/Staff thuộc trụ sở đó)
-- =========================================================================================
PRINT N'Đang nạp dữ liệu Users...';
INSERT INTO Users (Username, Password, FullName, Role, RoleDisplayName, Email, Phone, BranchId, Branch, Avatar, IsActive)
VALUES
-- Admin: BranchId = NULL (quyền xem tất cả trụ sở)
(N'admin',    N'123', N'Nguyễn Hoàng Gia', N'Admin',   N'Tổng Quản Trị',    N'admin@hoanggiacoffee.vn',   N'0988 123 456', NULL, N'Hoàng Gia - Trụ sở chính',              N'HG', 1),
-- Manager: BranchId = 1 (chỉ quản lý trụ sở Phùng Chí Kiên)
(N'manager',  N'123', N'Trần Thanh Hà',    N'Manager', N'Quản Lý Chi Nhánh', N'manager@hoanggiacoffee.vn', N'0977 888 999', 1,    N'Hoàng Gia - Chi nhánh Phùng Chí Kiên', N'TH', 1),
-- Staff: BranchId = 1 (nhân viên trụ sở Phùng Chí Kiên)
(N'barista',  N'123', N'Lê Quốc Bảo',      N'Staff',   N'Pha Chế Ca 1',      N'barista@hoanggiacoffee.vn', N'0912 345 678', 1,    N'Quầy Bar Pha Chế - Ca Sáng',           N'QB', 1);
GO

-- =========================================================================================
-- 3. INSERT DANH MỤC SẢN PHẨM (Categories)
-- =========================================================================================
PRINT N'Đang nạp dữ liệu Categories...';
SET IDENTITY_INSERT Categories ON;
INSERT INTO Categories (Id, Name, Icon, Slug, DisplayOrder, Description)
VALUES
(1, N'Cà Phê Phin',          N'bi-cup-hot-fill',        'ca-phe-phin',       1, N'Đậm đà hương vị truyền thống Việt Nam'),
(2, N'Freeze Hoàng Gia',     N'bi-snow2',               'freeze-hoang-gia',  2, N'Đá xay thơm béo thạch dai ngon'),
(3, N'Trà Thạch & Trái Cây', N'bi-cup-straw',           'tra-thach',         3, N'Thanh mát hương hoa trái sảng khoái'),
(4, N'Bánh Mỳ & Snacking',   N'bi-pie-chart-fill',      'banh-my-snacking',  5, N'Bánh mỳ que giòn rụm & bánh ngọt ngon khó cưỡng'),
(5, N'Cà Phê Chai & Đóng Gói',N'bi-box-seam',           'ca-phe-dong-chai',  6, N'Cà phê đóng chai tiện lợi mang đi làm'),
(6, N'Trà Chanh & Trà Tắc',  N'bi-brightness-high-fill','tra-chanh-tra-tac', 4, N'Giải khát sảng khoái, chua thanh ngọt mát với chanh tươi & tắc đường phèn');
SET IDENTITY_INSERT Categories OFF;
GO

-- =========================================================================================
-- 4. INSERT KÍCH CỠ LY (Sizes)
-- =========================================================================================
PRINT N'Đang nạp dữ liệu Sizes...';
INSERT INTO Sizes (Code, Name, ExtraPrice, DisplayOrder)
VALUES
('S', N'Nhỏ (S)',   0,     1),
('M', N'Vừa (M)',   6000,  2),
('L', N'Lớn (L)',   12000, 3);
GO

-- =========================================================================================
-- 5. INSERT TOPPING (Toppings)
-- =========================================================================================
PRINT N'Đang nạp dữ liệu Toppings...';
SET IDENTITY_INSERT Toppings ON;
INSERT INTO Toppings (Id, Name, Price, IsAvailable)
VALUES
(101, N'Thạch Cà Phê',           10000, 1),
(102, N'Thạch Đào',              10000, 1),
(103, N'Hạt Sen Bùi',            12000, 1),
(104, N'Kem Phô Mai Cheese',      15000, 1),
(105, N'Thạch Củ Năng',          10000, 1),
(106, N'Extra Shot Espresso',     15000, 1),
(107, N'Trân Châu Trắng 3Q',      8000, 1),
(108, N'Nha Đam Giòn Ngọt',       8000, 1),
(109, N'Xí Muội Mặn Ngọt',        5000, 1),
(110, N'Hạt Chia Tươi',           5000, 1),
(111, N'Thạch Lá Dứa Băng Tuyết', 8000, 1);
SET IDENTITY_INSERT Toppings OFF;
GO

-- =========================================================================================
-- 6. INSERT SẢN PHẨM / ĐỒ UỐNG (Products)
-- =========================================================================================
PRINT N'Đang nạp dữ liệu Products...';
SET IDENTITY_INSERT Products ON;
INSERT INTO Products (Id, CategoryId, Name, BasePrice, PromoPrice, CostPrice, Badge, Description, ImageUrl, IsAvailable)
VALUES
-- CÀ PHÊ PHIN
(1,  1, N'Phin Sữa Đá',                    29000, 24000, 9500,  N'Bán Chạy',      N'Hương vị cà phê phin đậm đà nguyên chất kết hợp cùng lớp sữa đặc béo ngậy truyền thống.', N'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80', 1),
(2,  1, N'Phin Đen Đá',                    29000, NULL,  8500,  N'Đón Đầu',       N'Dành cho tín đồ cà phê đích thực. Vị đắng nồng nàn thơm lừng lưu lại nơi hậu vị.', N'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80', 1),
(3,  1, N'PhinDi Hạnh Nhân',               39000, 33000, 13500, N'Must Try',       N'Cà phê Phin thế hệ mới hòa quyện sốt Hạnh Nhân béo ngậy bùi bùi và lớp foam mịn màng.', N'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80', 1),
(4,  1, N'Bạc Xỉu Đá',                    35000, NULL,  11000, N'Yêu Thích',      N'Ngọt ngào êm dịu với lượng sữa tươi nhiều hơn, quyện chút cà phê phin thơm lừng.', N'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80', 1),
-- FREEZE HOÀNG GIA
(5,  2, N'Freeze Trà Xanh',                49000, 39000, 15000, N'Bán Chạy',      N'Trà xanh Uji Nhật Bản đá xay mát lạnh, kết hợp thạch trà xanh giòn và kem tươi thơm béo.', N'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80', 1),
(6,  2, N'Freeze Cà Phê Phin',             49000, NULL,  16000, N'Hot',            N'Thức uống đá xay đậm vị cà phê phin Hoàng Gia đặc trưng, giòn ngon cùng thạch cà phê dai.', N'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80', 1),
(7,  2, N'Cookies & Cream Freeze',          55000, NULL,  20000, N'Mới',           N'Bánh quy sô-cô-la xay mịn cùng kem sữa thơm ngon, phủ lớp vụn bánh giòn rụm bên trên.', N'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80', 1),
-- TRÀ THẠCH & TRÁI CÂY
(8,  3, N'Trà Sen Vàng (Signature)',        45000, 39000, 14000, N'Signature',     N'Trà Ô Long đậm vị hòa quyện hạt sen bùi ngọt, củ năng giòn rụm và lớp kem phô mai béo.', N'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80', 1),
(9,  3, N'Trà Thạch Đào',                  45000, NULL,  13500, N'Bán Chạy',      N'Trà đào thanh mát kết hợp những miếng đào ngâm giòn ngọt mọng nước cùng thạch đào dẻo ngon.', N'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80', 1),
(10, 3, N'Trà Thanh Đào Sả',               45000, NULL,  13000, N'Hot',           N'Sự kết hợp độc đáo giữa vị trà thơm ngát, nước sả tươi ấm áp và vị đào dịu ngọt sảng khoái.', N'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?auto=format&fit=crop&w=600&q=80', 1),
-- BÁNH MỲ & SNACKING
(11, 4, N'Bánh Mỳ Que Gà Xé Phô Mai',     19000, NULL,  8000,  N'Giòn Rụm',      N'Bánh mỳ que nướng nóng hổi nhân thịt gà xé đậm đà phết phô mai thơm ngon quyến rũ.', N'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80', 1),
(12, 4, N'Bánh Tiramisu Hoàng Gia',         35000, NULL,  14000, N'Ngon Khó Cưỡng',N'Bánh mousse mềm mịn đượm vị espresso thơm nồng và lớp bột cacao nguyên chất đắng nhẹ.', N'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80', 1),
-- CÀ PHÊ CHAI & ĐÓNG GÓI
(13, 5, N'Cà Phê Phin Sữa Đá Chai 330ml', 49000, NULL,  22000, N'Pha Sẵn',       N'Chai cà phê phin sữa đá 330ml pha sẵn ướp lạnh, tiện lợi mang đi làm, giữ trọn vị thơm đậm.', N'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?auto=format&fit=crop&w=600&q=80', 1),
-- TRÀ CHANH & TRÀ TẮC
(14, 6, N'Trà Chanh Giã Tay Quảng Đông',  29000, 24000, 7500,  N'Hot Trend',     N'Trà xanh lài hảo hạng kết hợp cùng chanh nước hoa tươi giã tay bùng nổ tinh dầu thơm lừng.', N'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80', 1),
(15, 6, N'Trà Tắc Xí Muội Đường Phèn',    25000, 20000, 6000,  N'Bán Chạy',     N'Trà tắc truyền thống vị chua ngọt hài hòa, thơm ngậy xí muội mặn nhẹ và hậu vị ngọt dịu.', N'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80', 1),
(16, 6, N'Trà Chanh Mật Ong Hoa Cúc',     29000, NULL,  8500,  N'Thanh Mát',    N'Cốt trà hoa cúc êm dịu hòa cùng chanh tươi mọng nước và mật ong hoa rừng nguyên chất.', N'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80', 1),
(17, 6, N'Trà Tắc Nha Đam Hạt Chia',      28000, NULL,  8000,  N'Yêu Thích',    N'Thức uống giải nhiệt ngày hè với thạch nha đam tươi giòn ngọt kết hợp hạt chia organic.', N'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?auto=format&fit=crop&w=600&q=80', 1),
(18, 6, N'Trà Chanh Sả Bạc Hà Tuyết Lạnh',27000, NULL,  7500,  N'Sảng Khoái',   N'Vị trà xanh thanh khiết quyện cùng tinh chất sả đập dập và lá bạc hà the mát, đập tan cơn khát.', N'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=600&q=80', 1),
(19, 6, N'Trà Tắc Khổng Lồ Hoàng Gia 700ml',22000, NULL, 5500, N'Best Seller',  N'Ly trà tắc dung tích lớn 700ml siêu đã, vị trà lài đậm đà kết hợp nước cốt tắc tươi 100%.', N'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80', 1),
(20, 6, N'Trà Chanh Đào Hồng Ruby',        32000, 27000, 9000,  N'Mới',          N'Trà chanh đào màu hồng ngọc bắt mắt, vị ngọt dịu từ đào ngâm và chua thanh tao từ chanh đào tươi.', N'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80', 1);
SET IDENTITY_INSERT Products OFF;
GO

-- =========================================================================================
-- 7. INSERT PRODUCT SIZES & PRODUCT TOPPINGS MAPPING
-- =========================================================================================
PRINT N'Đang nạp ProductSizes & ProductToppings...';
-- Gán 3 Size S, M, L cho toàn bộ đồ uống (trừ nhóm bánh CategoryId=4)
INSERT INTO ProductSizes (ProductId, SizeCode)
SELECT p.Id, s.Code
FROM Products p CROSS JOIN Sizes s
WHERE p.CategoryId != 4;

-- Bánh mỳ và bánh ngọt mặc định size S
INSERT INTO ProductSizes (ProductId, SizeCode) VALUES (11, 'S'), (12, 'S');

-- Gán toàn bộ Toppings cho đồ uống (trừ bánh)
INSERT INTO ProductToppings (ProductId, ToppingId)
SELECT p.Id, t.Id
FROM Products p CROSS JOIN Toppings t
WHERE p.CategoryId != 4;
GO

-- =========================================================================================
-- 8. INSERT GIÁ RIÊNG THEO TRỤ SỞ (BranchProductPrices)  ← MỚI
--    Ví dụ: Trụ sở Phùng Chí Kiên (BranchId=1) có chi phí mặt bằng cao hơn
-- =========================================================================================
PRINT N'Đang nạp BranchProductPrices...';
INSERT INTO BranchProductPrices (BranchId, ProductId, BasePrice, PromoPrice, Note, UpdatedBy)
VALUES
-- Bạc Xỉu Đá tại Phùng Chí Kiên: giá bán 55k, KM 50k
(1, 4,  55000, 50000, N'Mặt bằng Q.Cầu Giấy cao hơn', N'manager'),
-- Phin Sữa Đá tại Phùng Chí Kiên: giá bán 32k, không KM
(1, 1,  32000, NULL,  N'Điều chỉnh Q4/2026',           N'manager'),
-- Freeze Trà Xanh tại Nguyễn Trãi (BranchId=2): giá cao hơn 5k
(2, 5,  54000, 44000, N'Chi phí vận hành cao hơn',     N'manager');
GO

-- =========================================================================================
-- 9. INSERT VOUCHERS (Mã khuyến mãi)
--    BranchId = NULL → voucher toàn hệ thống; BranchId = X → riêng trụ sở X
-- =========================================================================================
PRINT N'Đang nạp Vouchers...';
SET IDENTITY_INSERT Vouchers ON;
INSERT INTO Vouchers (Id, Code, Name, Description, DiscountType, DiscountValue, MinOrderAmount, MaxDiscountAmount, StartDate, EndDate, IsActive, UsageLimit, UsedCount, BranchId)
VALUES
-- Voucher global (BranchId = NULL)
(1, 'ECOFFEE10',   N'Giảm 10% tổng hóa đơn',    N'Ưu đãi tri ân khách hàng, giảm 10% cho mọi đơn hàng', 1, 10,    0,      50000, '2026-08-01', '2026-09-30', 1, 200, 47,  NULL),
(2, 'HE2026',      N'Giảm 20.000đ chào hè',      N'Ưu đãi chào hè 2026, giảm 20k cho hóa đơn từ 40k',    2, 20000, 40000, NULL,  '2026-06-01', '2026-08-31', 1, 100, 83,  NULL),
(3, 'FREESHIP',    N'Trợ giá ship 15.000đ',       N'Hỗ trợ 15k phí giao hàng tận nơi cho đơn online từ 30k',2, 15000, 30000, NULL, '2026-08-15', '2026-10-15', 1, 500, 129, NULL),
(4, 'HOANGGIA50K', N'Giảm 50.000đ đơn tiệc',     N'Ưu đãi đơn nhóm / tiệc từ 200k',                      2, 50000, 200000,NULL,  '2026-07-01', '2026-12-31', 1, 50,  12,  NULL),
(5, 'VIPMEMBER',   N'Giảm 15% khách VIP',         N'Đặc quyền thẻ thành viên VIP – không giới hạn đơn tối thiểu', 1, 15, 50000, 100000, '2026-01-01', '2026-12-31', 1, NULL, 68, NULL),
(6, 'KHAIHANG',    N'Khai trương -30%',            N'Voucher khai trương đã kết thúc',                      1, 30,    0,      NULL,  '2026-05-01', '2026-05-31', 0, 300, 298, NULL),
(7, 'TUUUDAI9X',   N'Ưu đãi 9x - Sắp ra mắt',    N'Voucher đặc biệt dành cho thế hệ 9x',                  1, 20,    60000, 80000, '2026-09-01', '2026-09-30', 1, 150, 0,   NULL),
-- Voucher riêng trụ sở Phùng Chí Kiên (BranchId = 1)
(8, 'PCK2026',     N'Ưu đãi riêng Phùng Chí Kiên',N'Voucher giảm 10k chỉ áp dụng tại trụ sở Phùng Chí Kiên', 2, 10000, 50000, NULL, '2026-09-01', '2026-12-31', 1, 200, 0, 1);
SET IDENTITY_INSERT Vouchers OFF;
GO

-- =========================================================================================
-- 10. INSERT SƠ ĐỒ 12 BÀN PHỤC VỤ (DiningTables) — Thêm BranchId
-- =========================================================================================
PRINT N'Đang nạp DiningTables...';
INSERT INTO DiningTables (TableId, TableName, Zone, Capacity, Status, CustomerCount, CustomerName, CustomerPhone, CustomerNote, OccupiedTime, BranchId)
VALUES
-- Trụ sở Phùng Chí Kiên (BranchId = 1)
('T1',  N'Bàn 01', N'Tầng 1 - Trong nhà', 4, 0, 0, NULL,        NULL,            NULL,                           NULL,                                  1),
('T2',  N'Bàn 02', N'Tầng 1 - Trong nhà', 4, 1, 2, N'Hoàng Nam',N'0912 345 678', N'Ít sữa đặc, đậm vị cà phê',  DATEADD(MINUTE, -35, GETDATE()),       1),
('T3',  N'Bàn 03', N'Tầng 1 - Trong nhà', 4, 0, 0, NULL,        NULL,            NULL,                           NULL,                                  1),
('T4',  N'Bàn 04', N'Tầng 1 - Trong nhà', 4, 0, 0, NULL,        NULL,            NULL,                           NULL,                                  1),
('T5',  N'Bàn 05', N'Tầng 1 - Trong nhà', 4, 1, 4, N'Thu Trang',N'0933 456 789', N'Nhiều đá, chua ngọt vừa',     DATEADD(MINUTE, -15, GETDATE()),       1),
('T6',  N'Bàn 06', N'Tầng 1 - Trong nhà', 4, 0, 0, NULL,        NULL,            NULL,                           NULL,                                  1),
('T7',  N'Bàn 07', N'Tầng 2 - Máy lạnh',  4, 0, 0, NULL,        NULL,            NULL,                           NULL,                                  1),
('T8',  N'Bàn 08', N'Tầng 2 - Máy lạnh',  6, 1, 3, N'Đức Minh', N'0977 112 233', N'Ly mang đi, ít ngọt',         DATEADD(MINUTE, -50, GETDATE()),       1),
('T9',  N'Bàn 09', N'Tầng 2 - Máy lạnh',  4, 0, 0, NULL,        NULL,            NULL,                           NULL,                                  1),
('T10', N'Bàn 10', N'Tầng 2 - Máy lạnh',  4, 0, 0, NULL,        NULL,            NULL,                           NULL,                                  1),
('T11', N'Bàn 11', N'Sân vườn',            6, 0, 0, NULL,        NULL,            NULL,                           NULL,                                  1),
('T12', N'Bàn 12', N'Sân vườn',            8, 0, 0, NULL,        NULL,            NULL,                           NULL,                                  1),
-- Trụ sở Nguyễn Trãi (BranchId = 2)
('NT1', N'Bàn 01', N'Tầng 1',             4, 0, 0, NULL,        NULL,            NULL,                           NULL,                                  2),
('NT2', N'Bàn 02', N'Tầng 1',             4, 0, 0, NULL,        NULL,            NULL,                           NULL,                                  2),
('NT3', N'Bàn 03', N'Tầng 2',             6, 0, 0, NULL,        NULL,            NULL,                           NULL,                                  2);
GO

-- =========================================================================================
-- 11. INSERT KHÁCH HÀNG (Customers)
-- =========================================================================================
PRINT N'Đang nạp Customers...';
INSERT INTO Customers (FullName, Phone, MemberTier, TotalOrders, TotalSpent)
VALUES
(N'Hoàng Nam',      N'0912 345 678', N'VIP',       12, 650000),
(N'Thu Trang',      N'0933 456 789', N'Thành viên', 5, 230000),
(N'Đức Minh',       N'0977 112 233', N'Thành viên', 8, 410000),
(N'Nguyễn Văn An',  N'0988 123 456', N'VIP',       15, 920000),
(N'Trần Thị Mai',   N'0909 888 999', N'Thành viên', 3, 145000);
GO

-- =========================================================================================
-- 12. INSERT LỊCH SỬ ĐIỀU CHỈNH GIÁ (ProductPriceHistories)
--     Thêm cột ProductName (snapshot tên lúc thay đổi)
-- =========================================================================================
PRINT N'Đang nạp ProductPriceHistories...';
INSERT INTO ProductPriceHistories (ProductId, ProductName, OldCostPrice, NewCostPrice, OldBasePrice, NewBasePrice, OldPromoPrice, NewPromoPrice, ChangedAt, Reason)
VALUES
(1, N'Phin Sữa Đá',            8000,  9500,  27000, 29000, NULL,  24000, DATEADD(DAY, -45, GETDATE()), N'Điều chỉnh giá nguyên liệu cà phê hạt tăng'),
(5, N'Freeze Trà Xanh',        13000, 15000, 45000, 49000, NULL,  39000, DATEADD(DAY, -30, GETDATE()), N'Cập nhật giá matcha Uji nhập khẩu'),
(8, N'Trà Sen Vàng (Signature)',12000, 14000, 42000, 45000, 36000, 39000,DATEADD(DAY, -15, GETDATE()), N'Giá kem phô mai tăng 15% theo thị trường'),
(2, N'Phin Đen Đá',             7500,  8500, 27000, 29000, NULL,  NULL,  DATEADD(DAY, -45, GETDATE()), N'Đồng điều chỉnh với toàn bộ dòng Phin'),
-- Lịch sử đặt giá trụ sở (tham chiếu)
(4, N'Bạc Xỉu Đá',            11000, 11000, 35000, 55000, NULL,  50000, DATEADD(DAY,  -5, GETDATE()), N'[Branch #1 Phùng Chí Kiên] Điều chỉnh giá trụ sở');
GO

-- =========================================================================================
-- 13. INSERT ĐƠN HÀNG MẪU & CHI TIẾT ĐƠN HÀNG (Orders, OrderItems, OrderItemToppings)
-- =========================================================================================
PRINT N'Đang nạp Orders & OrderItems...';
SET IDENTITY_INSERT Orders ON;

-- Đơn 1: Đơn Online Giao hàng (ORD-1024)
INSERT INTO Orders (Id, OrderCode, OrderType, TableId, TableName, CustomerId, CustomerName, CustomerPhone, DeliveryAddress, CustomerNote, SubTotal, VoucherId, VoucherCode, DiscountAmount, FinalAmount, TotalCost, PaymentMethod, PaymentStatus, OrderStatus, OrderTime)
VALUES (1, '#ORD-1024', 2, NULL, NULL, 4, N'Nguyễn Văn An', N'0988 123 456', N'Tòa B, Vincom Center, 72 Lê Thánh Tôn, Q.1', N'Ít đá, giao trước 11h30 giúp em', 109000, 3, 'FREESHIP', 15000, 94000, 31000, 'qr', 'Paid', 1, DATEADD(MINUTE, -10, GETDATE()));

-- Đơn 2: Đơn Mang đi (ORD-1025)
INSERT INTO Orders (Id, OrderCode, OrderType, TableId, TableName, CustomerId, CustomerName, CustomerPhone, DeliveryAddress, CustomerNote, SubTotal, VoucherId, VoucherCode, DiscountAmount, FinalAmount, TotalCost, PaymentMethod, PaymentStatus, OrderStatus, OrderTime)
VALUES (2, '#ORD-1025', 3, NULL, NULL, 5, N'Trần Thị Mai', N'0909 888 999', N'Khách tự scan & chọn mang đi', N'Cho nhiều trân châu trắng & xí muội', 74000, NULL, NULL, 0, 74000, 22000, 'cash', 'Paid', 2, DATEADD(MINUTE, -18, GETDATE()));

-- Đơn 3: Đơn Bàn T2 đã hoàn tất thanh toán hôm nay
INSERT INTO Orders (Id, OrderCode, OrderType, TableId, TableName, CustomerId, CustomerName, CustomerPhone, DeliveryAddress, CustomerNote, SubTotal, VoucherId, VoucherCode, DiscountAmount, FinalAmount, TotalCost, PaymentMethod, PaymentStatus, OrderStatus, CashGiven, ChangeReturned, OrderTime, CompletedTime)
VALUES (3, '#ORD-1020', 1, 'T2', N'Bàn 02', 1, N'Hoàng Nam', N'0912 345 678', NULL, N'Đậm đà ít sữa', 109000, 1, 'ECOFFEE10', 10900, 98100, 27000, 'cash', 'Paid', 4, 100000, 1900, DATEADD(MINUTE, -90, GETDATE()), DATEADD(MINUTE, -40, GETDATE()));

SET IDENTITY_INSERT Orders OFF;

-- Chi tiết OrderItems
SET IDENTITY_INSERT OrderItems ON;
INSERT INTO OrderItems (Id, OrderId, ProductId, ProductName, ProductImage, SizeCode, SizeName, SizeExtraPrice, SugarLevel, IceLevel, UnitBasePrice, UnitCostPrice, SingleItemPrice, Quantity, SubTotal, TotalProfit)
VALUES
-- Món đơn 1
(1, 1, 14, N'Trà Chanh Giã Tay Quảng Đông', N'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80', 'M', N'Vừa (M)', 6000, '70%', '70%', 24000, 7500,  38000, 2, 76000, 45000),
(2, 1,  9, N'Trà Thạch Đào',                N'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80', 'L', N'Lớn (L)', 12000, '70%', '100%',45000, 13500, 57000, 1, 57000, 43500),
-- Món đơn 2
(3, 2, 15, N'Trà Tắc Xí Muội Đường Phèn',   N'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80', 'L', N'Lớn (L)', 12000, '100%','100%',20000, 6000,  37000, 2, 74000, 52000),
-- Món đơn 3
(4, 3,  1, N'Phin Sữa Đá',                  N'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80', 'M', N'Vừa (M)', 6000, '100%','70%', 29000, 9500,  45000, 2, 90000, 51000),
(5, 3, 11, N'Bánh Mỳ Que Gà Xé Phô Mai',    N'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80', 'S', N'Nhỏ (S)', 0,     '100%','100%',19000, 8000,  19000, 1, 19000, 11000);
SET IDENTITY_INSERT OrderItems OFF;

-- Topping đi kèm OrderItems
INSERT INTO OrderItemToppings (OrderItemId, ToppingId, ToppingName, Price)
VALUES
(1, 107, N'Trân Châu Trắng 3Q', 8000),
(3, 109, N'Xí Muội Mặn Ngọt',  5000),
(4, 101, N'Thạch Cà Phê',      10000);

PRINT N'';
PRINT N'🎉 Hoàn tất nạp toàn bộ Seed Data cho CSDL ECoffeeDB!';
PRINT N'   Branches: 3 trụ sở';
PRINT N'   BranchProductPrices: 3 override mẫu';
PRINT N'   Vouchers: 8 (7 global + 1 riêng trụ sở)';
PRINT N'   DiningTables: 15 bàn (12 Phùng Chí Kiên + 3 Nguyễn Trãi)';
GO
