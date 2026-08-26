using System.Collections.Generic;

namespace E_Coffee.Models
{
    public class Product
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal BasePrice { get; set; }
        public decimal? PromoPrice { get; set; }
        public decimal CostPrice { get; set; } // Giá nhập / Giá vốn nguyên liệu
        public bool HasPromo => PromoPrice.HasValue && PromoPrice.Value > 0 && PromoPrice.Value < BasePrice;
        public decimal EffectivePrice => HasPromo ? PromoPrice!.Value : BasePrice;
        public decimal ProfitPerUnit => EffectivePrice - CostPrice;
        public decimal ProfitMarginPercent => EffectivePrice > 0 ? System.Math.Round((EffectivePrice - CostPrice) * 100 / EffectivePrice, 1) : 0;
        public string ImageUrl { get; set; } = string.Empty;
        public string Badge { get; set; } = string.Empty; // "Bán Chạy", "Mới", "Hot", "Signature"
        public List<SizeOption> AvailableSizes { get; set; } = new();
        public List<ToppingOption> AvailableToppings { get; set; } = new();
        public List<string> SugarLevels { get; set; } = new() { "100%", "70%", "50%", "30%", "Không đường" };
        public List<string> IceLevels { get; set; } = new() { "100%", "70%", "50%", "30%", "Không đá", "Đá riêng" };
        public bool IsAvailable { get; set; } = true;
    }
}
