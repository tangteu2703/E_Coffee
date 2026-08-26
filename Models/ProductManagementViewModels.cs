using System;
using System.Collections.Generic;
using System.Linq;

namespace E_Coffee.Models
{
    // =========================================================================
    // LỊCH SỬ THAY ĐỔI GIÁ BÁN & GIÁ VỐN (PRICE & COST HISTORY)
    // =========================================================================
    public class ProductPriceHistory
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public decimal OldCostPrice { get; set; }
        public decimal NewCostPrice { get; set; }
        public decimal OldBasePrice { get; set; }
        public decimal NewBasePrice { get; set; }
        public decimal? OldPromoPrice { get; set; }
        public decimal? NewPromoPrice { get; set; }
        public DateTime ChangedAt { get; set; } = DateTime.Now;
        public string ChangedBy { get; set; } = "Quản lý / Thu ngân";
        public string Reason { get; set; } = "Điều chỉnh định kỳ";

        // Helpers
        public decimal CostChange => NewCostPrice - OldCostPrice;
        public decimal PriceChange => NewBasePrice - OldBasePrice;
        public decimal ProfitAfterChange => (NewPromoPrice.HasValue && NewPromoPrice.Value > 0 ? NewPromoPrice.Value : NewBasePrice) - NewCostPrice;
        public decimal MarginAfterChange => (NewPromoPrice.HasValue && NewPromoPrice.Value > 0 ? NewPromoPrice.Value : NewBasePrice) > 0
            ? Math.Round(((NewPromoPrice.HasValue && NewPromoPrice.Value > 0 ? NewPromoPrice.Value : NewBasePrice) - NewCostPrice) * 100 / (NewPromoPrice.HasValue && NewPromoPrice.Value > 0 ? NewPromoPrice.Value : NewBasePrice), 1)
            : 0;
    }

    // =========================================================================
    // KPI TỔNG QUAN PHÂN HỆ QUẢN LÝ SẢN PHẨM & MENU
    // =========================================================================
    public class ProductManagementKpiSummary
    {
        public int TotalProducts { get; set; }
        public int ActiveProducts { get; set; }
        public int InactiveProducts { get; set; }
        public int TotalCategories { get; set; }
        public int TotalToppings { get; set; }
        public int TotalVouchers { get; set; }
        public int ActiveVouchers { get; set; }
        public decimal AverageCostPrice { get; set; }
        public decimal AverageSellingPrice { get; set; }
        public decimal AverageProfitPerUnit { get; set; }
        public decimal AverageMarginPercent { get; set; }

        public string TopMarginProductName { get; set; } = string.Empty;
        public decimal TopMarginPercent { get; set; }
        public string LowestCostProductName { get; set; } = string.Empty;
        public decimal LowestCostPrice { get; set; }
    }

    // =========================================================================
    // VIEW MODEL TRANG CHÍNH QUẢN LÝ SẢN PHẨM (TABBED DASHBOARD)
    // =========================================================================
    public class ProductManagementIndexViewModel
    {
        public List<Product> Products { get; set; } = new();
        public List<Category> Categories { get; set; } = new();
        public List<Voucher> Vouchers { get; set; } = new();
        public List<ProductPriceHistory> PriceHistories { get; set; } = new();
        public List<ToppingOption> MasterToppings { get; set; } = new();
        public List<SizeOption> MasterSizes { get; set; } = new();

        public ProductManagementKpiSummary Kpi { get; set; } = new();

        // Active Tab Selector: "products" | "categories" | "toppings" | "vouchers" | "history"
        public string ActiveTab { get; set; } = "products";

        // Category items count lookup
        public Dictionary<int, int> CategoryProductCount { get; set; } = new();
    }

    // =========================================================================
    // DTO CHO THÊM / SỬA SẢN PHẨM
    // =========================================================================
    public class ProductSaveDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int CategoryId { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal BasePrice { get; set; }
        public decimal? PromoPrice { get; set; }
        public decimal CostPrice { get; set; } // Giá nhập / giá vốn nguyên liệu
        public string ImageUrl { get; set; } = string.Empty;
        public string Badge { get; set; } = string.Empty;
        public bool IsAvailable { get; set; } = true;
        public List<int>? SelectedToppingIds { get; set; }
        public List<string>? SelectedSizeCodes { get; set; }
        public string? ChangeReason { get; set; } // Lý do thay đổi giá (nếu có chỉnh sửa)
    }

    // =========================================================================
    // DTO CHO THÊM / SỬA TOPPING
    // =========================================================================
    public class ToppingSaveDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
    }

    // =========================================================================
    // DTO CHO THÊM / SỬA LOẠI / DANH MỤC
    // =========================================================================
    public class CategorySaveDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Icon { get; set; } = "bi-cup-hot-fill";
        public string Slug { get; set; } = string.Empty;
        public int DisplayOrder { get; set; } = 1;
        public string Description { get; set; } = string.Empty;
    }

    // =========================================================================
    // DTO CHO THÊM / SỬA VOUCHER KHUYẾN MÃI
    // =========================================================================
    public class VoucherSaveDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int DiscountType { get; set; } = 1; // 1 = Percent, 2 = FixedAmount
        public decimal DiscountValue { get; set; }
        public decimal MinOrderAmount { get; set; } = 0;
        public decimal? MaxDiscountAmount { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public bool IsActive { get; set; } = true;
        public int? UsageLimit { get; set; }
    }

    // =========================================================================
    // DTO CẬP NHẬT NHANH GIÁ & GIÁ VỐN
    // =========================================================================
    public class QuickPriceUpdateDto
    {
        public int ProductId { get; set; }
        public decimal CostPrice { get; set; }
        public decimal BasePrice { get; set; }
        public decimal? PromoPrice { get; set; }
        public string Reason { get; set; } = "Cập nhật giá nhanh từ bảng quản lý";
    }
}
