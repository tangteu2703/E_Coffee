namespace E_Coffee.Models
{
    /// <summary>
    /// Đại diện một trụ sở / chi nhánh Hoàng Gia Coffee.
    /// Tọa độ GPS dùng để tính trụ sở gần nhất khi khách nhập địa chỉ.
    /// </summary>
    public class Branch
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;        // Tên hiển thị đầy đủ
        public string ShortName { get; set; } = string.Empty;   // Tên rút gọn
        public string Address { get; set; } = string.Empty;     // Địa chỉ đầy đủ
        public string District { get; set; } = string.Empty;    // Quận / Huyện
        public string City { get; set; } = string.Empty;        // Thành phố
        public double Lat { get; set; }                          // Vĩ độ GPS
        public double Lng { get; set; }                          // Kinh độ GPS
        public string Phone { get; set; } = string.Empty;
        public string OpenHours { get; set; } = "06:30 – 22:00";
        public bool IsActive { get; set; } = true;
    }
}
