namespace E_Coffee.Models
{
    public enum OrderType
    {
        AtTable = 1,  // Tại bàn (Scan QR code)
        Delivery = 2, // Giao tận nơi (Order online)
        Pickup = 3    // Đến lấy tại quán
    }

    public class OrderModeInfo
    {
        public OrderType Type { get; set; } = OrderType.AtTable;
        public string TableNumber { get; set; } = "Bàn 01"; // e.g. "Bàn 05", "Bàn 12"
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string DeliveryAddress { get; set; } = string.Empty;
        public string SelectedStore { get; set; } = "Hoàng Gia Coffee - Vincom Center";

        public string DisplayIdentifier
        {
            get
            {
                if (Type == OrderType.AtTable)
                {
                    return string.IsNullOrEmpty(TableNumber) ? "Tại bàn" : TableNumber;
                }
                else if (Type == OrderType.Delivery)
                {
                    return string.IsNullOrEmpty(CustomerPhone) ? "Giao hàng tận nơi" : $"Giao tới: {CustomerPhone}";
                }
                else
                {
                    return "Đến lấy tại quán";
                }
            }
        }
    }
}
