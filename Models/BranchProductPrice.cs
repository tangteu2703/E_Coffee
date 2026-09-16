using System;

namespace E_Coffee.Models
{
    // =========================================================================
    // GIA BAN THEO TRU SO (BRANCH PRICE OVERRIDE)
    // =========================================================================
    /// <summary>
    /// Luu gia ban rieng cua tung tru so cho tung san pham.
    /// Neu khong co record → dung gia global trong Product.BasePrice / PromoPrice.
    /// </summary>
    public class BranchProductPrice
    {
        public int BranchId    { get; set; }
        public int ProductId   { get; set; }

        /// <summary>Gia ban tai tru so nay (ghi de Product.BasePrice)</summary>
        public decimal BasePrice   { get; set; }

        /// <summary>Gia khuyen mai tai tru so (ghi de Product.PromoPrice). null = khong KM</summary>
        public decimal? PromoPrice { get; set; }

        /// <summary>Ghi chu ly do dat gia rieng</summary>
        public string Note      { get; set; } = string.Empty;

        public DateTime UpdatedAt  { get; set; } = DateTime.Now;
        public string UpdatedBy    { get; set; } = string.Empty;

        // Helper: gia co hieu luc tai tru so nay
        public decimal EffectivePrice => PromoPrice.HasValue && PromoPrice.Value > 0
            ? PromoPrice.Value
            : BasePrice;
    }

    // =========================================================================
    // DTO LUU / CAP NHAT GIA THEO TRU SO
    // =========================================================================
    public class BranchProductPriceSaveDto
    {
        public int     BranchId   { get; set; }
        public int     ProductId  { get; set; }
        public decimal BasePrice  { get; set; }
        public decimal? PromoPrice { get; set; }
        public string  Note       { get; set; } = string.Empty;
    }
}
