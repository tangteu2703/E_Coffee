using System;
using System.Collections.Generic;
using System.Linq;

namespace E_Coffee.Models
{
    public enum BarTableStatus
    {
        Empty = 0,    // Bàn trống
        Occupied = 1, // Đã ngồi / Có khách
        Reserved = 2  // Đã đặt trước
    }

    public class BarTableItem
    {
        public string TableId { get; set; } = string.Empty;
        public string TableName { get; set; } = string.Empty;
        public string Zone { get; set; } = "Tầng 1";
        public BarTableStatus Status { get; set; } = BarTableStatus.Empty;
        public int Capacity { get; set; } = 4;
        public int CustomerCount { get; set; } = 0;
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string CustomerNote { get; set; } = string.Empty;
        public DateTime? OccupiedTime { get; set; }
        public List<CartItem> Items { get; set; } = new();

        public decimal TotalAmount => Items.Sum(i => i.SubTotal);
        public int ItemCount => Items.Sum(i => i.Quantity);

        public string DisplayDuration
        {
            get
            {
                if (!OccupiedTime.HasValue) return string.Empty;
                var duration = DateTime.Now - OccupiedTime.Value;
                if (duration.TotalMinutes < 60)
                {
                    return $"{(int)duration.TotalMinutes} phút";
                }
                return $"{(int)duration.TotalHours}h {duration.Minutes}m";
            }
        }
    }

    public enum BarOnlineOrderStatus
    {
        Pending = 1,   // Mới / Chờ nhận
        Preparing = 2, // Đang pha chế
        Ready = 3,     // Chờ giao / Chờ lấy
        Completed = 4  // Hoàn tất
    }

    public class BarOnlineOrderItem
    {
        public string OrderId { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public OrderType OrderType { get; set; } = OrderType.Delivery; // Delivery or Pickup
        public string DeliveryAddress { get; set; } = string.Empty;
        public DateTime OrderTime { get; set; } = DateTime.Now;
        public BarOnlineOrderStatus Status { get; set; } = BarOnlineOrderStatus.Pending;
        public List<CartItem> Items { get; set; } = new();
        public string CustomerNote { get; set; } = string.Empty;

        public decimal TotalAmount => Items.Sum(i => i.SubTotal);
        public int ItemCount => Items.Sum(i => i.Quantity);
    }

    public class BarPageViewModel
    {
        public List<BarTableItem> Tables { get; set; } = new();
        public List<BarOnlineOrderItem> OnlineOrders { get; set; } = new();
        public List<Category> Categories { get; set; } = new();
        public List<Product> Products { get; set; } = new();
        public int EmptyTableCount => Tables.Count(t => t.Status == BarTableStatus.Empty);
        public int OccupiedTableCount => Tables.Count(t => t.Status == BarTableStatus.Occupied);
        public int PendingOnlineOrderCount => OnlineOrders.Count(o => o.Status == BarOnlineOrderStatus.Pending || o.Status == BarOnlineOrderStatus.Preparing);
    }

    public class BarCheckoutRequest
    {
        public string TargetType { get; set; } = "counter"; // "table", "online", "counter"
        public string TargetId { get; set; } = string.Empty; // "Bàn 01", "#ORD-1001", etc.
        public string PaymentMethod { get; set; } = "cash"; // "cash", "qr", "card"
        public decimal TotalAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal FinalAmount { get; set; }
        public decimal CashGiven { get; set; }
        public decimal ChangeReturned { get; set; }
        public string Notes { get; set; } = string.Empty;
        public List<CartItem> Items { get; set; } = new();
    }

    public class BarSaveOrderRequest
    {
        public string TargetType { get; set; } = "table"; // "table", "pickup", "delivery"
        public string TargetId { get; set; } = string.Empty; // Table name/ID, "TAKEAWAY", or existing OrderId
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string CustomerNote { get; set; } = string.Empty;
        public decimal DiscountAmount { get; set; }
        public List<CartItem> Items { get; set; } = new();
    }

    public class BarSaveOrderResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string TargetType { get; set; } = string.Empty;
        public string TargetId { get; set; } = string.Empty;
        public string DisplayTitle { get; set; } = string.Empty;
    }

    public class CustomerLookupResult
    {
        public bool Found { get; set; }
        public string CustomerPhone { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerNote { get; set; } = string.Empty;
        public int TotalOrders { get; set; } = 1;
        public string MemberTier { get; set; } = "Thành viên";
        public string LastOrderSummary { get; set; } = string.Empty;
    }
}
