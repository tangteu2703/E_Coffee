using System;
using System.Collections.Generic;

namespace E_Coffee.Models
{
    // ─────────────────────────────────────────────────────────────────────────────
    // Analytics Filter Request
    // ─────────────────────────────────────────────────────────────────────────────

    public class AnalyticsFilterRequest
    {
        public string FromDate { get; set; } = string.Empty;
        public string ToDate   { get; set; } = string.Empty;

        /// <summary>"day" | "week" | "month" | "hour"</summary>
        public string GroupBy  { get; set; } = "day";

        /// <summary>"all" | "dine_in" | "delivery" | "pickup"</summary>
        public string Channel  { get; set; } = "all";

        /// <summary>
        /// null = Tổng hợp tất cả trụ sở (Admin default).
        /// Có giá trị = lọc 1 trụ sở cụ thể.
        /// Lưu ý: Client không gửi field này — server sẽ tự điền từ Session.
        /// Để mở rộng sau này có thể cho Admin chọn override qua request.
        /// </summary>
        public int? BranchId { get; set; } = null;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // KPI / Summary Cards
    // ─────────────────────────────────────────────────────────────────────────────

    public class RevenueKpiDto
    {
        public decimal TotalRevenue      { get; set; }
        public int     TotalItemsSold    { get; set; }
        public int     TotalOrders       { get; set; }
        public decimal AverageOrderValue { get; set; }
        public decimal VoucherDiscount   { get; set; }
        public decimal NetRevenue        { get; set; }

        // Growth vs previous period (%)
        public double RevenuePctChange      { get; set; }
        public double ItemsSoldPctChange    { get; set; }
        public double OrdersPctChange       { get; set; }
        public double AovPctChange          { get; set; }

        // Channel breakdown
        public decimal DineInRevenue    { get; set; }
        public decimal DeliveryRevenue  { get; set; }
        public decimal PickupRevenue    { get; set; }

        public int     DineInOrders     { get; set; }
        public int     DeliveryOrders   { get; set; }
        public int     PickupOrders     { get; set; }

        // Convenience percentages (0-100)
        public double DineInPct   => TotalOrders == 0 ? 0 : Math.Round(DineInOrders   * 100.0 / TotalOrders, 1);
        public double DeliveryPct => TotalOrders == 0 ? 0 : Math.Round(DeliveryOrders * 100.0 / TotalOrders, 1);
        public double PickupPct   => TotalOrders == 0 ? 0 : Math.Round(PickupOrders   * 100.0 / TotalOrders, 1);

        // Peak hour label
        public string PeakHour { get; set; } = "08:00 – 10:00";
        public int    PeakOrderCount { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Chart Data – Dual Y-Axis Combo (Bar + Line)
    // ─────────────────────────────────────────────────────────────────────────────

    public class RevenueChartDataDto
    {
        /// <summary>Nhãn trục X (ngày, tuần, tháng, hoặc giờ)</summary>
        public List<string>  Labels     { get; set; } = new();

        /// <summary>Doanh thu VND – trục Y phải (Line chart)</summary>
        public List<decimal> Revenues   { get; set; } = new();

        /// <summary>Số lượng sản phẩm – trục Y trái (Bar chart)</summary>
        public List<int>     Quantities { get; set; } = new();

        /// <summary>Số đơn hàng</summary>
        public List<int>     Orders     { get; set; } = new();

        /// <summary>Giảm giá voucher VND</summary>
        public List<decimal> Discounts  { get; set; } = new();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Top Selling Products
    // ─────────────────────────────────────────────────────────────────────────────

    public class TopSellingProductDto
    {
        public int     Rank         { get; set; }
        public int     ProductId    { get; set; }
        public string  Name         { get; set; } = string.Empty;
        public string  CategoryName { get; set; } = string.Empty;
        public string  ImageUrl     { get; set; } = string.Empty;
        public int     QuantitySold { get; set; }
        public decimal Revenue      { get; set; }
        public double  SharePct     { get; set; }  // Thị phần doanh thu %
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Category Revenue Breakdown (Donut Chart)
    // ─────────────────────────────────────────────────────────────────────────────

    public class CategoryRevenueDto
    {
        public int     CategoryId   { get; set; }
        public string  Name         { get; set; } = string.Empty;
        public string  Icon         { get; set; } = string.Empty;
        public string  Color        { get; set; } = string.Empty;  // HEX color for chart
        public decimal Revenue      { get; set; }
        public int     QuantitySold { get; set; }
        public double  SharePct     { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Detail Table Row (per time bucket)
    // ─────────────────────────────────────────────────────────────────────────────

    public class RevenueDetailRowDto
    {
        public string  Label         { get; set; } = string.Empty;
        public int     Orders        { get; set; }
        public int     ItemsSold     { get; set; }
        public decimal GrossRevenue  { get; set; }
        public decimal Discounts     { get; set; }
        public decimal NetRevenue    => GrossRevenue - Discounts;
        public decimal AvgOrderValue => Orders == 0 ? 0 : Math.Round(GrossRevenue / Orders, 0);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Main Page ViewModel (Server-Side rendered initial state)
    // ─────────────────────────────────────────────────────────────────────────────

    public class AnalyticsPageViewModel
    {
        // KPI summary
        public RevenueKpiDto Kpi { get; set; } = new();

        // Combo chart data
        public RevenueChartDataDto ChartData { get; set; } = new();

        // Category donut
        public List<CategoryRevenueDto> CategoryRevenues { get; set; } = new();

        // Top selling products
        public List<TopSellingProductDto> TopProducts { get; set; } = new();

        // Detail table
        public List<RevenueDetailRowDto> DetailRows { get; set; } = new();

        // Current filter state (for rendering inputs)
        public string FilterFromDate { get; set; } = string.Empty;
        public string FilterToDate   { get; set; } = string.Empty;
        public string FilterGroupBy  { get; set; } = "day";
        public string FilterChannel  { get; set; } = "all";

        // === Branch Context ===
        /// <summary>null = Admin đang xem tổng hợp tất cả trụ sở.</summary>
        public int? ActiveBranchId   { get; set; } = null;
        public string ActiveBranchName { get; set; } = "Tổng hợp tất cả trụ sở";
        /// <summary>Danh sách trụ sở cho dropdown Admin. Rỗng nếu là Staff/Manager.</summary>
        public List<Branch> AvailableBranches { get; set; } = new();
        public bool IsAdminView { get; set; } = false;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // AJAX Response wrapper
    // ─────────────────────────────────────────────────────────────────────────────

    public class AnalyticsApiResponse
    {
        public bool                       Success        { get; set; } = true;
        public string                     Message        { get; set; } = string.Empty;
        public RevenueKpiDto?             Kpi            { get; set; }
        public RevenueChartDataDto?       ChartData      { get; set; }
        public List<CategoryRevenueDto>?  CategoryData   { get; set; }
        public List<TopSellingProductDto>? TopProducts   { get; set; }
        public List<RevenueDetailRowDto>?  DetailRows    { get; set; }
        /// <summary>Tên trụ sở đang xem — JS sẽ cập nhật breadcrumb khi AJAX refresh.</summary>
        public string ActiveBranchName { get; set; } = string.Empty;
    }
}
