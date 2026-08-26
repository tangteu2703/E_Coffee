-- =========================================================================================
-- E-COFFEE (CÀ PHÊ HOÀNG GIA) - QUERY MẪU THAM KHẢO CHO CONTROLLERS & BÁO CÁO
-- Database: ECoffeeDB  |  Server: 10.80.1.88
-- File: step4_sample_queries.sql
-- Dùng để: Tham khảo khi viết logic thật trong AnalyticsController, ProductManagement,...
-- =========================================================================================

USE ECoffeeDB;
GO

-- =========================================================================================
-- [Query 1] DOANH THU + LỢI NHUẬN GỘP THEO TỪNG NGÀY
-- Dùng cho: AnalyticsController → BuildChartData (groupBy = "day")
-- =========================================================================================
SELECT 
    CAST(OrderTime AS DATE)                                                    AS OrderDate,
    COUNT(Id)                                                                  AS TotalOrders,
    SUM(SubTotal)                                                              AS GrossRevenue,
    SUM(DiscountAmount)                                                        AS TotalDiscountGiven,
    SUM(FinalAmount)                                                           AS NetRevenue,
    SUM(TotalCost)                                                             AS TotalCost,
    SUM(FinalAmount - TotalCost)                                               AS GrossProfit,
    ROUND((SUM(FinalAmount - TotalCost) * 100.0 / NULLIF(SUM(FinalAmount),0)),1) AS ProfitMarginPct
FROM Orders
WHERE OrderStatus = 4               -- Chỉ đơn đã hoàn tất
  AND OrderTime >= DATEADD(DAY, -30, GETDATE())
GROUP BY CAST(OrderTime AS DATE)
ORDER BY OrderDate DESC;
GO

-- =========================================================================================
-- [Query 2] DOANH THU THEO KÊNH BÁN (Tại bàn / Giao hàng / Mang đi)
-- Dùng cho: AnalyticsController → RevenueKpiDto (DineIn/Delivery/Pickup)
-- =========================================================================================
SELECT
    CASE OrderType
        WHEN 1 THEN 'dine_in'
        WHEN 2 THEN 'delivery'
        WHEN 3 THEN 'pickup'
    END                   AS Channel,
    COUNT(Id)             AS TotalOrders,
    SUM(FinalAmount)      AS NetRevenue,
    SUM(DiscountAmount)   AS TotalDiscount
FROM Orders
WHERE OrderStatus = 4
  AND OrderTime >= DATEADD(DAY, -30, GETDATE())
GROUP BY OrderType
ORDER BY NetRevenue DESC;
GO

-- =========================================================================================
-- [Query 3] TOP 10 SẢN PHẨM BÁN CHẠY NHẤT
-- Dùng cho: AnalyticsController → BuildTopProducts
-- =========================================================================================
SELECT TOP 10
    p.Id                                                        AS ProductId,
    p.Name                                                      AS ProductName,
    c.Name                                                      AS CategoryName,
    p.ImageUrl,
    SUM(oi.Quantity)                                            AS TotalSoldQty,
    SUM(oi.SubTotal)                                            AS TotalRevenue,
    SUM(oi.TotalProfit)                                         AS TotalProfit,
    ROUND(SUM(oi.SubTotal) * 100.0 / (
        SELECT SUM(SubTotal) FROM OrderItems oi2
        INNER JOIN Orders o2 ON oi2.OrderId = o2.Id
        WHERE o2.OrderStatus = 4
    ), 1)                                                       AS RevenueSharePct
FROM OrderItems oi
INNER JOIN Orders o    ON oi.OrderId   = o.Id
INNER JOIN Products p  ON oi.ProductId = p.Id
INNER JOIN Categories c ON p.CategoryId = c.Id
WHERE o.OrderStatus = 4
GROUP BY p.Id, p.Name, c.Name, p.ImageUrl
ORDER BY TotalRevenue DESC;
GO

-- =========================================================================================
-- [Query 4] TỶ TRỌNG DOANH THU THEO DANH MỤC (Biểu đồ Donut)
-- Dùng cho: AnalyticsController → BuildCategoryRevenues
-- =========================================================================================
SELECT
    c.Id                                                                          AS CategoryId,
    c.Name                                                                        AS CategoryName,
    c.Icon                                                                        AS CategoryIcon,
    COUNT(DISTINCT o.Id)                                                          AS OrderCount,
    SUM(oi.Quantity)                                                              AS TotalItemsSold,
    SUM(oi.SubTotal)                                                              AS CategoryRevenue,
    ROUND(SUM(oi.SubTotal) * 100.0 / (
        SELECT SUM(SubTotal) FROM OrderItems oi2
        INNER JOIN Orders o2 ON oi2.OrderId = o2.Id
        WHERE o2.OrderStatus = 4
    ), 1)                                                                         AS RevenueSharePct
FROM Categories c
INNER JOIN Products p   ON c.Id         = p.CategoryId
INNER JOIN OrderItems oi ON p.Id        = oi.ProductId
INNER JOIN Orders o      ON oi.OrderId  = o.Id
WHERE o.OrderStatus = 4
GROUP BY c.Id, c.Name, c.Icon
ORDER BY CategoryRevenue DESC;
GO

-- =========================================================================================
-- [Query 5] KIỂM TRA TÍNH HỢP LỆ CỦA MÃ VOUCHER
-- Dùng cho: BarController → ValidateVoucher (thay VoucherRepository)
-- =========================================================================================
DECLARE @InputCode    VARCHAR(50)   = 'ECOFFEE10';
DECLARE @OrderAmount  DECIMAL(18,2) = 150000;

SELECT
    Id,
    Code,
    Name,
    DiscountType,           -- 1: Percent (%), 2: FixedAmount (VNĐ)
    DiscountValue,
    MinOrderAmount,
    MaxDiscountAmount,
    CASE
        WHEN IsActive = 0                                          THEN N'Voucher đang tạm khóa'
        WHEN StartDate IS NOT NULL AND GETDATE() < StartDate       THEN N'Chưa đến ngày áp dụng'
        WHEN EndDate   IS NOT NULL AND GETDATE() > EndDate         THEN N'Voucher đã hết hạn'
        WHEN UsageLimit IS NOT NULL AND UsedCount >= UsageLimit    THEN N'Voucher đã hết lượt dùng'
        WHEN @OrderAmount < MinOrderAmount                         THEN N'Đơn chưa đạt giá trị tối thiểu'
        ELSE N'Hợp lệ ✅'
    END AS ValidationStatus,
    CASE
        WHEN IsActive = 1
         AND (StartDate IS NULL OR GETDATE() >= StartDate)
         AND (EndDate   IS NULL OR GETDATE() <= EndDate)
         AND (UsageLimit IS NULL OR UsedCount < UsageLimit)
         AND @OrderAmount >= MinOrderAmount
        THEN 1 ELSE 0
    END AS IsValid
FROM Vouchers
WHERE Code = @InputCode;
GO

-- =========================================================================================
-- [Query 6] KPI TỔNG QUAN CHO DASHBOARD (Dùng cho AnalyticsController → BuildKpi)
-- =========================================================================================
DECLARE @From DATE = DATEADD(DAY, -6, CAST(GETDATE() AS DATE));
DECLARE @To   DATE = CAST(GETDATE() AS DATE);

SELECT
    COUNT(Id)                                                AS TotalOrders,
    SUM(SubTotal)                                            AS GrossRevenue,
    SUM(DiscountAmount)                                      AS VoucherDiscount,
    SUM(FinalAmount)                                         AS NetRevenue,
    SUM(TotalCost)                                           AS TotalCost,
    ROUND(SUM(FinalAmount) / NULLIF(COUNT(Id), 0), 0)       AS AvgOrderValue,
    SUM(FinalAmount - TotalCost)                             AS GrossProfit,
    ROUND((SUM(FinalAmount - TotalCost) * 100.0 / NULLIF(SUM(FinalAmount),0)), 1) AS ProfitMarginPct
FROM Orders
WHERE OrderStatus = 4
  AND CAST(OrderTime AS DATE) BETWEEN @From AND @To;
GO

-- =========================================================================================
-- [Query 7] LỊCH SỬ GIÁ VỐN & GIÁ BÁN CỦA SẢN PHẨM (ProductManagementController)
-- =========================================================================================
SELECT
    h.Id,
    p.Name                                               AS ProductName,
    h.OldCostPrice,
    h.NewCostPrice,
    h.NewCostPrice - h.OldCostPrice                      AS CostChange,
    h.OldBasePrice,
    h.NewBasePrice,
    h.OldPromoPrice,
    h.NewPromoPrice,
    h.ChangedAt,
    h.ChangedBy,
    h.Reason
FROM ProductPriceHistories h
INNER JOIN Products p ON h.ProductId = p.Id
ORDER BY h.ChangedAt DESC;
GO

-- =========================================================================================
-- [Query 8] THỐNG KÊ BÀN ĐỂ HIỂN THỊ BAR POS (BarController)
-- =========================================================================================
SELECT
    TableId,
    TableName,
    Zone,
    Capacity,
    Status,              -- 0: Trống, 1: Có khách, 2: Đặt trước
    CustomerCount,
    CustomerName,
    CustomerPhone,
    OccupiedTime,
    DATEDIFF(MINUTE, OccupiedTime, GETDATE()) AS MinutesOccupied
FROM DiningTables
ORDER BY
    CASE Zone
        WHEN N'Tầng 1 - Trong nhà' THEN 1
        WHEN N'Tầng 2 - Máy lạnh'  THEN 2
        WHEN N'Sân vườn'           THEN 3
        ELSE 4
    END, TableId;
GO
