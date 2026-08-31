using System.Collections.Generic;

namespace E_Coffee.Models
{
    /// <summary>
    /// DTO nhận từ site.js khi khách hàng xác nhận đặt đơn online (Delivery / Pickup).
    /// </summary>
    public class OnlinePlaceOrderRequest
    {
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string OrderType { get; set; } = "Pickup";  // "Delivery" | "Pickup" | "AtTable"
        public string DeliveryAddress { get; set; } = string.Empty;
        public string TableNumber { get; set; } = string.Empty;
        public string CustomerNote { get; set; } = string.Empty;
        public string VoucherCode { get; set; } = string.Empty;
        public decimal DiscountAmount { get; set; }
        public decimal ShippingFee { get; set; }
        public List<OnlinePlaceOrderItem> Items { get; set; } = new();
    }

    /// <summary>
    /// Chi tiết từng món trong đơn online từ site.js.
    /// </summary>
    public class OnlinePlaceOrderItem
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string SizeName { get; set; } = string.Empty;
        public decimal UnitBasePrice { get; set; }
        public decimal SizeExtraPrice { get; set; }
        public int Quantity { get; set; } = 1;
        public string SugarLevel { get; set; } = "100%";
        public string IceLevel { get; set; } = "100%";
        public List<OnlinePlaceOrderTopping> SelectedToppings { get; set; } = new();
        public string SpecialNote { get; set; } = string.Empty;
    }

    /// <summary>
    /// Topping kèm theo từng món đặt online.
    /// </summary>
    public class OnlinePlaceOrderTopping
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
    }
}
