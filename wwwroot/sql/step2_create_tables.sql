-- =========================================================================================
-- BƯỚC 2: CHẠY BẰNG TÀI KHOẢN pim (hoặc sa) trên Database ECoffeeDB
-- Mục đích: Tạo toàn bộ bảng, ràng buộc khóa & Index
-- =========================================================================================

USE ECoffeeDB;
GO

-- =========================================================================================
-- XÓA BẢNG CŨ NẾU ĐÃ TỒN TẠI (Theo thứ tự khóa ngoại)
-- =========================================================================================
DROP TABLE IF EXISTS OrderItemToppings;
DROP TABLE IF EXISTS OrderItems;
DROP TABLE IF EXISTS Orders;
DROP TABLE IF EXISTS ProductPriceHistories;
DROP TABLE IF EXISTS ProductToppings;
DROP TABLE IF EXISTS ProductSizes;
DROP TABLE IF EXISTS Products;
DROP TABLE IF EXISTS Toppings;
DROP TABLE IF EXISTS Sizes;
DROP TABLE IF EXISTS Categories;
DROP TABLE IF EXISTS DiningTables;
DROP TABLE IF EXISTS Customers;
DROP TABLE IF EXISTS Vouchers;
DROP TABLE IF EXISTS Users;
GO

PRINT N'🔧 Bắt đầu tạo cấu trúc bảng...';

-- =========================================================================================
-- 1. BẢNG TÀI KHOẢN NGƯỜI DÙNG & NHÂN VIÊN (Users)
-- =========================================================================================
CREATE TABLE Users (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    Username        NVARCHAR(50)  NOT NULL UNIQUE,
    Password        NVARCHAR(255) NOT NULL,
    FullName        NVARCHAR(100) NOT NULL,
    Role            NVARCHAR(20)  NOT NULL CHECK (Role IN ('Admin', 'Manager', 'Staff')),
    RoleDisplayName NVARCHAR(50)  NOT NULL,
    Email           NVARCHAR(100) NULL,
    Phone           NVARCHAR(20)  NULL,
    Branch          NVARCHAR(150) NULL,
    Avatar          NVARCHAR(255) NULL,
    IsActive        BIT           NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2     NOT NULL DEFAULT GETDATE(),
    UpdatedAt       DATETIME2     NULL
);
PRINT N'  ✅ Bảng Users';

-- =========================================================================================
-- 2. BẢNG DANH MỤC SẢN PHẨM (Categories)
-- =========================================================================================
CREATE TABLE Categories (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    Name         NVARCHAR(100) NOT NULL,
    Icon         NVARCHAR(50)  NOT NULL DEFAULT 'bi-cup-hot-fill',
    Slug         VARCHAR(100)  NOT NULL UNIQUE,
    DisplayOrder INT           NOT NULL DEFAULT 1,
    Description  NVARCHAR(500) NULL,
    IsActive     BIT           NOT NULL DEFAULT 1,
    CreatedAt    DATETIME2     NOT NULL DEFAULT GETDATE()
);
PRINT N'  ✅ Bảng Categories';

-- =========================================================================================
-- 3. BẢNG KÍCH CỠ LY (Sizes)
-- =========================================================================================
CREATE TABLE Sizes (
    Code         VARCHAR(10)  PRIMARY KEY, -- 'S', 'M', 'L'
    Name         NVARCHAR(50) NOT NULL,
    ExtraPrice   DECIMAL(18,2) NOT NULL DEFAULT 0,
    DisplayOrder INT           NOT NULL DEFAULT 1
);
PRINT N'  ✅ Bảng Sizes';

-- =========================================================================================
-- 4. BẢNG TOPPING (Toppings)
-- =========================================================================================
CREATE TABLE Toppings (
    Id          INT IDENTITY(101,1) PRIMARY KEY,
    Name        NVARCHAR(100) NOT NULL,
    Price       DECIMAL(18,2) NOT NULL DEFAULT 0,
    IsAvailable BIT           NOT NULL DEFAULT 1,
    CreatedAt   DATETIME2     NOT NULL DEFAULT GETDATE()
);
PRINT N'  ✅ Bảng Toppings (Id bắt đầu từ 101)';

-- =========================================================================================
-- 5. BẢNG SẢN PHẨM / ĐỒ UỐNG (Products)
-- =========================================================================================
CREATE TABLE Products (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    CategoryId  INT            NOT NULL,
    Name        NVARCHAR(150)  NOT NULL,
    Description NVARCHAR(MAX)  NULL,
    BasePrice   DECIMAL(18,2)  NOT NULL DEFAULT 0,
    PromoPrice  DECIMAL(18,2)  NULL,
    CostPrice   DECIMAL(18,2)  NOT NULL DEFAULT 0,  -- Giá vốn / Giá nhập
    ImageUrl    NVARCHAR(500)  NULL,
    Badge       NVARCHAR(50)   NULL,  -- 'Bán Chạy', 'Mới', 'Hot', 'Signature', 'Best Seller', 'Hot Trend'
    IsAvailable BIT            NOT NULL DEFAULT 1,
    CreatedAt   DATETIME2      NOT NULL DEFAULT GETDATE(),
    UpdatedAt   DATETIME2      NULL,
    CONSTRAINT FK_Products_Categories FOREIGN KEY (CategoryId)
        REFERENCES Categories(Id) ON DELETE CASCADE
);
PRINT N'  ✅ Bảng Products';

-- =========================================================================================
-- 6. BẢNG LIÊN KẾT PRODUCT - SIZE (ProductSizes: M-N)
-- =========================================================================================
CREATE TABLE ProductSizes (
    ProductId INT         NOT NULL,
    SizeCode  VARCHAR(10) NOT NULL,
    PRIMARY KEY (ProductId, SizeCode),
    CONSTRAINT FK_ProductSizes_Products FOREIGN KEY (ProductId) REFERENCES Products(Id) ON DELETE CASCADE,
    CONSTRAINT FK_ProductSizes_Sizes    FOREIGN KEY (SizeCode)  REFERENCES Sizes(Code)    ON DELETE CASCADE
);
PRINT N'  ✅ Bảng ProductSizes';

-- =========================================================================================
-- 7. BẢNG LIÊN KẾT PRODUCT - TOPPING (ProductToppings: M-N)
-- =========================================================================================
CREATE TABLE ProductToppings (
    ProductId INT NOT NULL,
    ToppingId INT NOT NULL,
    PRIMARY KEY (ProductId, ToppingId),
    CONSTRAINT FK_ProductToppings_Products FOREIGN KEY (ProductId) REFERENCES Products(Id)  ON DELETE CASCADE,
    CONSTRAINT FK_ProductToppings_Toppings FOREIGN KEY (ToppingId) REFERENCES Toppings(Id)  ON DELETE CASCADE
);
PRINT N'  ✅ Bảng ProductToppings';

-- =========================================================================================
-- 8. BẢNG LỊCH SỬ BIẾN ĐỘNG GIÁ VỐN & GIÁ BÁN (ProductPriceHistories)
-- =========================================================================================
CREATE TABLE ProductPriceHistories (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    ProductId    INT            NOT NULL,
    OldCostPrice DECIMAL(18,2)  NOT NULL,
    NewCostPrice DECIMAL(18,2)  NOT NULL,
    OldBasePrice DECIMAL(18,2)  NOT NULL,
    NewBasePrice DECIMAL(18,2)  NOT NULL,
    OldPromoPrice DECIMAL(18,2) NULL,
    NewPromoPrice DECIMAL(18,2) NULL,
    ChangedAt    DATETIME2      NOT NULL DEFAULT GETDATE(),
    ChangedBy    NVARCHAR(100)  NOT NULL DEFAULT N'Quản lý / Thu ngân',
    Reason       NVARCHAR(500)  NOT NULL DEFAULT N'Điều chỉnh định kỳ',
    CONSTRAINT FK_PriceHistories_Products FOREIGN KEY (ProductId)
        REFERENCES Products(Id) ON DELETE CASCADE
);
PRINT N'  ✅ Bảng ProductPriceHistories';

-- =========================================================================================
-- 9. BẢNG SƠ ĐỒ BÀN PHỤC VỤ (DiningTables)
-- =========================================================================================
CREATE TABLE DiningTables (
    TableId       VARCHAR(50)   PRIMARY KEY,  -- 'T1', 'T2', ...
    TableName     NVARCHAR(50)  NOT NULL,     -- 'Bàn 01', 'Bàn 02', ...
    Zone          NVARCHAR(100) NOT NULL DEFAULT N'Tầng 1 - Trong nhà',
    Capacity      INT           NOT NULL DEFAULT 4,
    Status        INT           NOT NULL DEFAULT 0,
        -- 0: Empty (Trống), 1: Occupied (Có khách), 2: Reserved (Đặt trước)
    CustomerCount INT           NOT NULL DEFAULT 0,
    CustomerName  NVARCHAR(100) NULL,
    CustomerPhone NVARCHAR(20)  NULL,
    CustomerNote  NVARCHAR(500) NULL,
    OccupiedTime  DATETIME2     NULL,
    UpdatedAt     DATETIME2     NULL
);
PRINT N'  ✅ Bảng DiningTables';

-- =========================================================================================
-- 10. BẢNG KHÁCH HÀNG (Customers)
-- =========================================================================================
CREATE TABLE Customers (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    FullName      NVARCHAR(100)  NOT NULL,
    Phone         NVARCHAR(20)   NOT NULL UNIQUE,
    Email         NVARCHAR(100)  NULL,
    TotalOrders   INT            NOT NULL DEFAULT 0,
    MemberTier    NVARCHAR(50)   NOT NULL DEFAULT N'Thành viên',
    TotalSpent    DECIMAL(18,2)  NOT NULL DEFAULT 0,
    Note          NVARCHAR(500)  NULL,
    CreatedAt     DATETIME2      NOT NULL DEFAULT GETDATE(),
    LastOrderDate DATETIME2      NULL
);
PRINT N'  ✅ Bảng Customers';

-- =========================================================================================
-- 11. BẢNG MÃ GIẢM GIÁ / VOUCHER (Vouchers)
-- =========================================================================================
CREATE TABLE Vouchers (
    Id                INT IDENTITY(1,1) PRIMARY KEY,
    Code              VARCHAR(50)   NOT NULL UNIQUE,
    Name              NVARCHAR(150) NOT NULL,
    Description       NVARCHAR(500) NULL,
    DiscountType      INT           NOT NULL DEFAULT 1,
        -- 1: Percent (%), 2: FixedAmount (VNĐ)
    DiscountValue     DECIMAL(18,2) NOT NULL DEFAULT 0,
    MinOrderAmount    DECIMAL(18,2) NOT NULL DEFAULT 0,
    MaxDiscountAmount DECIMAL(18,2) NULL,
    StartDate         DATETIME2     NULL,
    EndDate           DATETIME2     NULL,
    IsActive          BIT           NOT NULL DEFAULT 1,
    UsageLimit        INT           NULL,
    UsedCount         INT           NOT NULL DEFAULT 0,
    CreatedAt         DATETIME2     NOT NULL DEFAULT GETDATE()
);
PRINT N'  ✅ Bảng Vouchers';

-- =========================================================================================
-- 12. BẢNG HÓA ĐƠN ĐƠN HÀNG (Orders)
-- =========================================================================================
CREATE TABLE Orders (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    OrderCode       VARCHAR(50)   NOT NULL UNIQUE,  -- '#ORD-1024'
    OrderType       INT           NOT NULL DEFAULT 1,
        -- 1: AtTable (Tại bàn), 2: Delivery (Giao hàng), 3: Pickup (Mang đi)
    TableId         VARCHAR(50)   NULL,
    TableName       NVARCHAR(50)  NULL,
    CustomerId      INT           NULL,
    CustomerName    NVARCHAR(100) NULL,
    CustomerPhone   NVARCHAR(20)  NULL,
    DeliveryAddress NVARCHAR(500) NULL,
    CustomerNote    NVARCHAR(500) NULL,
    SubTotal        DECIMAL(18,2) NOT NULL DEFAULT 0,
    VoucherId       INT           NULL,
    VoucherCode     VARCHAR(50)   NULL,
    DiscountAmount  DECIMAL(18,2) NOT NULL DEFAULT 0,
    FinalAmount     DECIMAL(18,2) NOT NULL DEFAULT 0,
    TotalCost       DECIMAL(18,2) NOT NULL DEFAULT 0, -- Tổng giá vốn đơn hàng
    PaymentMethod   NVARCHAR(50)  NOT NULL DEFAULT 'cash',  -- 'cash', 'qr', 'card'
    PaymentStatus   NVARCHAR(50)  NOT NULL DEFAULT 'Paid',  -- 'Unpaid', 'Paid', 'Refunded'
    OrderStatus     INT           NOT NULL DEFAULT 1,
        -- 1: Pending, 2: Preparing, 3: Ready, 4: Completed, 5: Cancelled
    CashGiven       DECIMAL(18,2) NOT NULL DEFAULT 0,
    ChangeReturned  DECIMAL(18,2) NOT NULL DEFAULT 0,
    UserId          INT           NULL, -- Nhân viên tạo đơn
    OrderTime       DATETIME2     NOT NULL DEFAULT GETDATE(),
    CompletedTime   DATETIME2     NULL,
    CONSTRAINT FK_Orders_DiningTables FOREIGN KEY (TableId)    REFERENCES DiningTables(TableId) ON DELETE SET NULL,
    CONSTRAINT FK_Orders_Customers    FOREIGN KEY (CustomerId) REFERENCES Customers(Id)         ON DELETE SET NULL,
    CONSTRAINT FK_Orders_Vouchers     FOREIGN KEY (VoucherId)  REFERENCES Vouchers(Id)          ON DELETE SET NULL,
    CONSTRAINT FK_Orders_Users        FOREIGN KEY (UserId)     REFERENCES Users(Id)             ON DELETE SET NULL
);
PRINT N'  ✅ Bảng Orders';

-- =========================================================================================
-- 13. BẢNG CHI TIẾT ĐƠN HÀNG (OrderItems)
-- =========================================================================================
CREATE TABLE OrderItems (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    OrderId         INT           NOT NULL,
    ProductId       INT           NOT NULL,
    ProductName     NVARCHAR(150) NOT NULL,
    ProductImage    NVARCHAR(500) NULL,
    SizeCode        VARCHAR(10)   NULL,
    SizeName        NVARCHAR(50)  NULL,
    SizeExtraPrice  DECIMAL(18,2) NOT NULL DEFAULT 0,
    SugarLevel      NVARCHAR(50)  NOT NULL DEFAULT '100%',
    IceLevel        NVARCHAR(50)  NOT NULL DEFAULT '100%',
    SpecialNote     NVARCHAR(500) NULL,
    UnitBasePrice   DECIMAL(18,2) NOT NULL DEFAULT 0,
    UnitCostPrice   DECIMAL(18,2) NOT NULL DEFAULT 0,
    SingleItemPrice DECIMAL(18,2) NOT NULL DEFAULT 0, -- UnitBasePrice + SizeExtra + Toppings
    Quantity        INT           NOT NULL DEFAULT 1,
    SubTotal        DECIMAL(18,2) NOT NULL DEFAULT 0, -- SingleItemPrice * Quantity
    TotalProfit     DECIMAL(18,2) NOT NULL DEFAULT 0, -- (SingleItemPrice - UnitCostPrice) * Qty
    CONSTRAINT FK_OrderItems_Orders   FOREIGN KEY (OrderId)   REFERENCES Orders(Id)   ON DELETE CASCADE,
    CONSTRAINT FK_OrderItems_Products FOREIGN KEY (ProductId) REFERENCES Products(Id) ON DELETE NO ACTION
);
PRINT N'  ✅ Bảng OrderItems';

-- =========================================================================================
-- 14. BẢNG TOPPING ĐI KÈM MÓN TRONG ĐƠN (OrderItemToppings)
-- =========================================================================================
CREATE TABLE OrderItemToppings (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    OrderItemId INT           NOT NULL,
    ToppingId   INT           NOT NULL,
    ToppingName NVARCHAR(100) NOT NULL,
    Price       DECIMAL(18,2) NOT NULL DEFAULT 0,
    CONSTRAINT FK_OrderItemToppings_Items    FOREIGN KEY (OrderItemId) REFERENCES OrderItems(Id) ON DELETE CASCADE,
    CONSTRAINT FK_OrderItemToppings_Toppings FOREIGN KEY (ToppingId)   REFERENCES Toppings(Id)   ON DELETE NO ACTION
);
PRINT N'  ✅ Bảng OrderItemToppings';
GO

-- =========================================================================================
-- TẠO INDEX TỐI ƯU HIỆU NĂNG
-- =========================================================================================
CREATE NONCLUSTERED INDEX IX_Orders_OrderTime
    ON Orders(OrderTime DESC) INCLUDE (FinalAmount, OrderStatus, OrderType);

CREATE NONCLUSTERED INDEX IX_Orders_OrderStatus
    ON Orders(OrderStatus);

CREATE NONCLUSTERED INDEX IX_OrderItems_OrderId
    ON OrderItems(OrderId);

CREATE NONCLUSTERED INDEX IX_OrderItems_ProductId
    ON OrderItems(ProductId) INCLUDE (Quantity, SubTotal);

CREATE NONCLUSTERED INDEX IX_Products_CategoryId
    ON Products(CategoryId);

CREATE NONCLUSTERED INDEX IX_Customers_Phone
    ON Customers(Phone);

CREATE NONCLUSTERED INDEX IX_Vouchers_Code
    ON Vouchers(Code);
GO

PRINT N'';
PRINT N'🎉 Hoàn tất tạo toàn bộ 14 bảng và Index cho ECoffeeDB!';
PRINT N'👉 Tiếp theo: Chạy file step3_seed_data.sql để nạp dữ liệu mẫu.';
GO
