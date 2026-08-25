using System;

namespace E_Coffee.Models
{
    public enum VoucherDiscountType
    {
        Percent = 1,     // Giảm theo % tổng đơn
        FixedAmount = 2   // Giảm số tiền cố định (VD: 20.000đ)
    }

    public class Voucher
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public VoucherDiscountType DiscountType { get; set; } = VoucherDiscountType.Percent;
        public decimal DiscountValue { get; set; } // 10 (%) hoặc 20000 (VNĐ)
        public decimal MinOrderAmount { get; set; } = 0; // Giá trị đơn hàng tối thiểu
        public decimal? MaxDiscountAmount { get; set; } // Giảm tối đa bao nhiêu tiền đối với loại %
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public bool IsActive { get; set; } = true;
        public int? UsageLimit { get; set; }
        public int UsedCount { get; set; } = 0;
    }

    public class VoucherValidationRequest
    {
        public string Code { get; set; } = string.Empty;
        public decimal OrderAmount { get; set; } = 0;
    }

    public class VoucherValidationResult
    {
        public bool IsValid { get; set; }
        public string Message { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = "percent"; // "percent" | "fixed"
        public decimal Value { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal FinalAmount { get; set; }
    }
}
