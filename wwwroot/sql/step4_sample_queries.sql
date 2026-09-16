-- =========================================================================================
-- E-COFFEE (CÀ PHÊ HOÀNG GIA) - QUERY MẪU THAM KHẢO CHO CONTROLLERS & BÁO CÁO
-- Database: ECoffeeDB  |  Server: 10.80.1.88
-- File: step4_sample_queries.sql
-- Cập nhật: Thêm query cho Branches, BranchProductPrices, lọc theo BranchId
-- =========================================================================================

USE ECoffeeDB;
GO

-- =========================================================================================
-- [Query 1] DOANH THU + LỢI NHUẬN GỘP THEO TỪNG NGÀY
-- Dùng cho: AnalyticsController → BuildChartData (groupBy = "day")
-- Thêm filter BranchId nếu cần lọc theo trụ sở
-- =========================================================================================
DECLARE @BranchFilter INT = NULL; -- NULL = tất cả, có giá trị = lọc 1 trụ sở

SELECT
    CAST(o.OrderTime AS DATE)                                                      AS OrderDate,
    COUNT(o.Id)                                                                    AS TotalOrders,
    SUM(o.SubTotal)                                                                AS GrossRevenue,
    SUM(o.DiscountAmount)                                                          AS TotalDiscountGiven,
    SUM(o.FinalAmount)                                                             AS NetRevenue,
    SUM(o.TotalCost)                                                               AS TotalCost,
    SUM(o.FinalAmount - o.TotalCost)                                               AS GrossProfit,
    ROUND((SUM(o.FinalAmount - o.TotalCost) * 100.0 / NULLIF(SUM(o.FinalAmount),0)),1) AS ProfitMarginPct
FROM Orders o
LEFT JOIN DiningTables dt ON o.TableId = dt.TableId
WHERE o.OrderStatus = 4
  AND o.OrderTime >= DATEADD(DAY, -30, GETDATE())
  AND (@BranchFilter IS NULL OR dt.BranchId = @BranchFilter OR o.TableId IS NULL)
GROUP BY CAST(o.OrderTime AS DATE)
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
INNER JOIN Orders o     ON oi.OrderId    = o.Id
INNER JOIN Products p   ON oi.ProductId  = p.Id
INNER JOIN Categories c ON p.CategoryId  = c.Id
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
INNER JOIN Products p    ON c.Id        = p.CategoryId
INNER JOIN OrderItems oi ON p.Id        = oi.ProductId
INNER JOIN Orders o      ON oi.OrderId  = o.Id
WHERE o.OrderStatus = 4
GROUP BY c.Id, c.Name, c.Icon
ORDER BY CategoryRevenue DESC;
GO

-- =========================================================================================
-- [Query 5] KIỂM TRA TÍNH HỢP LỆ CỦA MÃ VOUCHER
-- Dùng cho: BarController → ValidateVoucher
-- Lọc: voucher global (BranchId IS NULL) hoặc đúng trụ sở đang order
-- =========================================================================================
DECLARE @InputCode    VARCHAR(50)   = 'ECOFFEE10';
DECLARE @OrderAmount  DECIMAL(18,2) = 150000;
DECLARE @ActiveBranch INT           = 1;          -- BranchId của trụ sở đang xử lý đơn

SELECT
    Id, Code, Name, DiscountType, DiscountValue, MinOrderAmount, MaxDiscountAmount, BranchId,
    CASE
        WHEN IsActive = 0                                          THEN N'Voucher đang tạm khóa'
        WHEN StartDate IS NOT NULL AND GETDATE() < StartDate       THEN N'Chưa đến ngày áp dụng'
        WHEN EndDate   IS NOT NULL AND GETDATE() > EndDate         THEN N'Voucher đã hết hạn'
        WHEN UsageLimit IS NOT NULL AND UsedCount >= UsageLimit    THEN N'Voucher đã hết lượt dùng'
        WHEN @OrderAmount < MinOrderAmount                         THEN N'Đơn chưa đạt giá trị tối thiểu'
        WHEN BranchId IS NOT NULL AND BranchId <> @ActiveBranch   THEN N'Voucher không áp dụng tại trụ sở này'
        ELSE N'Hợp lệ ✅'
    END AS ValidationStatus,
    CASE
        WHEN IsActive = 1
         AND (StartDate IS NULL OR GETDATE() >= StartDate)
         AND (EndDate   IS NULL OR GETDATE() <= EndDate)
         AND (UsageLimit IS NULL OR UsedCount < UsageLimit)
         AND @OrderAmount >= MinOrderAmount
         AND (BranchId IS NULL OR BranchId = @ActiveBranch)
        THEN 1 ELSE 0
    END AS IsValid
FROM Vouchers
WHERE Code = @InputCode;
GO

-- =========================================================================================
-- [Query 6] KPI TỔNG QUAN CHO DASHBOARD (AnalyticsController → BuildKpi)
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
    h.ProductName                                            AS ProductName,
    p.Name                                                   AS CurrentProductName,
    h.OldCostPrice,
    h.NewCostPrice,
    h.NewCostPrice - h.OldCostPrice                          AS CostChange,
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
-- Lọc theo BranchId từ Session — chỉ hiển thị bàn thuộc trụ sở đang login
-- =========================================================================================
DECLARE @BranchId INT = 1; -- Truyền từ Session["ActiveBranchId"]

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
    BranchId,
    DATEDIFF(MINUTE, OccupiedTime, GETDATE()) AS MinutesOccupied
FROM DiningTables
WHERE BranchId = @BranchId
ORDER BY
    CASE Zone
        WHEN N'Tầng 1 - Trong nhà' THEN 1
        WHEN N'Tầng 2 - Máy lạnh'  THEN 2
        WHEN N'Sân vườn'           THEN 3
        ELSE 4
    END, TableId;
GO

-- =========================================================================================
-- [Query 9] GIÁ BÁN HIỆU LỰC TẠI TỪNG TRỤ SỞ (BranchProductPrices)  ← MỚI
-- Dùng cho: CoffeeCatalogService.GetProductsWithBranchPrice()
-- =========================================================================================
DECLARE @BranchIdFilter INT = 1;

SELECT
    p.Id                                            AS ProductId,
    p.Name                                          AS ProductName,
    p.BasePrice                                     AS GlobalBasePrice,
    p.PromoPrice                                    AS GlobalPromoPrice,
    bpp.BasePrice                                   AS BranchBasePrice,
    bpp.PromoPrice                                  AS BranchPromoPrice,
    ISNULL(bpp.BasePrice,  p.BasePrice)             AS EffectiveBasePrice,
    ISNULL(bpp.PromoPrice, p.PromoPrice)            AS EffectivePromoPrice,
    CASE WHEN bpp.ProductId IS NOT NULL THEN N'Override trụ sở' ELSE N'Giá global' END AS PriceSource,
    bpp.Note                                        AS OverrideNote,
    bpp.UpdatedAt                                   AS OverrideUpdatedAt,
    bpp.UpdatedBy                                   AS OverrideUpdatedBy
FROM Products p
LEFT JOIN BranchProductPrices bpp
    ON bpp.ProductId = p.Id AND bpp.BranchId = @BranchIdFilter
WHERE p.IsAvailable = 1
ORDER BY p.CategoryId, p.Id;
GO

-- =========================================================================================
-- [Query 10] DANH SÁCH VOUCHER THEO TRỤ SỞ  ← MỚI
-- Dùng cho: CoffeeCatalogService.GetVouchersByBranch()
-- Trả về: voucher global (BranchId IS NULL) + voucher riêng trụ sở đang xem
-- =========================================================================================
DECLARE @BranchIdV INT = 1;

SELECT
    Id, Code, Name, Description,
    DiscountType, DiscountValue,
    MinOrderAmount, MaxDiscountAmount,
    StartDate, EndDate,
    IsActive, UsageLimit, UsedCount,
    BranchId,
    CASE WHEN BranchId IS NULL THEN N'Toàn hệ thống' ELSE N'Riêng trụ sở' END AS VoucherScope,
    CASE
        WHEN IsActive = 0                                       THEN N'Tạm ngưng'
        WHEN EndDate IS NOT NULL AND GETDATE() > EndDate        THEN N'Đã hết hạn'
        WHEN StartDate IS NOT NULL AND GETDATE() < StartDate    THEN N'Sắp diễn ra'
        WHEN UsageLimit IS NOT NULL AND UsedCount >= UsageLimit THEN N'Hết lượt'
        ELSE N'Đang áp dụng'
    END AS StatusText
FROM Vouchers
WHERE BranchId IS NULL OR BranchId = @BranchIdV
ORDER BY BranchId NULLS FIRST, Id;
GO

-- =========================================================================================
-- [Query 11] TỔNG HỢP HOẠT ĐỘNG THEO TỪNG TRỤ SỞ (Admin Dashboard)  ← MỚI
-- =========================================================================================
SELECT
    b.Id                                              AS BranchId,
    b.ShortName                                       AS BranchName,
    COUNT(DISTINCT dt.TableId)                        AS TotalTables,
    COUNT(DISTINCT CASE WHEN dt.Status = 1 THEN dt.TableId END) AS OccupiedTables,
    COUNT(DISTINCT u.Id)                              AS StaffCount,
    COUNT(DISTINCT bpp.ProductId)                     AS ProductsWithOverridePrice,
    COUNT(DISTINCT v.Id)                              AS BranchVouchers
FROM Branches b
LEFT JOIN DiningTables        dt  ON dt.BranchId  = b.Id
LEFT JOIN Users               u   ON u.BranchId   = b.Id
LEFT JOIN BranchProductPrices bpp ON bpp.BranchId = b.Id
LEFT JOIN Vouchers            v   ON v.BranchId   = b.Id
WHERE b.IsActive = 1
GROUP BY b.Id, b.ShortName
ORDER BY b.Id;
GO
