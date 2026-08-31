using System;
using System.Collections.Generic;
using System.Linq;
using E_Coffee.Models;

namespace E_Coffee.Data
{
    /// <summary>
    /// Giả lập Database Context (In-Memory Database Store)
    /// Đóng vai trò là Data Store tập trung lưu trữ các bảng Categories, Products, Vouchers, Tables, Orders.
    /// Sẵn sàng chuyển đổi sang Entity Framework Core DbContext khi kết nối CSDL thực tế (SQL Server / PostgreSQL).
    /// </summary>
    public class MockDbContext
    {
        public List<Category> Categories { get; set; } = new();
        public List<Product> Products { get; set; } = new();
        public List<ToppingOption> Toppings { get; set; } = new();
        public List<SizeOption> Sizes { get; set; } = new();
        public List<Voucher> Vouchers { get; set; } = new();
        public List<BarTableItem> Tables { get; set; } = new();
        public List<BarOnlineOrderItem> OnlineOrders { get; set; } = new();
        public List<BarOrderHistoryItem> OrderHistory { get; set; } = new();
        public List<ProductPriceHistory> PriceHistories { get; set; } = new();
        public List<AppUser> Users { get; set; } = new();

        public MockDbContext()
        {
            SeedData();
            SeedOrderHistory();
        }

        private void SeedData()
        {
            // 1. Seed Categories (Danh mục sản phẩm)
            Categories = new List<Category>
            {
                new Category { Id = 1, Name = "Cà Phê Phin", Icon = "bi-cup-hot-fill", Slug = "ca-phe-phin", DisplayOrder = 1, Description = "Đậm đà hương vị truyền thống Việt Nam" },
                new Category { Id = 2, Name = "Freeze Hoàng Gia", Icon = "bi-snow2", Slug = "freeze-hoang-gia", DisplayOrder = 2, Description = "Đá xay thơm béo thạch dai ngon" },
                new Category { Id = 3, Name = "Trà Thạch & Trái Cây", Icon = "bi-cup-straw", Slug = "tra-thach", DisplayOrder = 3, Description = "Thanh mát hương hoa trái sảng khoái" },
                new Category { Id = 6, Name = "Trà Chanh & Trà Tắc", Icon = "bi-brightness-high-fill", Slug = "tra-chanh-tra-tac", DisplayOrder = 4, Description = "Giải khát sảng khoái, chua thanh ngọt mát với chanh tươi & tắc đường phèn" },
                new Category { Id = 4, Name = "Bánh Mỳ & Snacking", Icon = "bi-pie-chart-fill", Slug = "banh-my-snacking", DisplayOrder = 5, Description = "Bánh mỳ que giòn rụm & bánh ngọt ngon khó cưỡng" },
            };

            // 2. Seed Toppings (Topping phong phú cho trà chanh tắc & cà phê)
            Toppings = new List<ToppingOption>
            {
                new ToppingOption { Id = 101, Name = "Thạch Cà Phê", Price = 10000 },
                new ToppingOption { Id = 102, Name = "Thạch Đào", Price = 10000 },
                new ToppingOption { Id = 103, Name = "Hạt Sen Bùi", Price = 12000 },
                new ToppingOption { Id = 104, Name = "Kem Phô Mai Cheese", Price = 15000 },
                new ToppingOption { Id = 105, Name = "Thạch Củ Năng", Price = 10000 },
                new ToppingOption { Id = 106, Name = "Extra Shot Espresso", Price = 15000 },
                new ToppingOption { Id = 107, Name = "Trân Châu Trắng 3Q", Price = 8000 },
                new ToppingOption { Id = 108, Name = "Nha Đam Giòn Ngọt", Price = 8000 },
                new ToppingOption { Id = 109, Name = "Xí Muội Mặn Ngọt", Price = 5000 },
                new ToppingOption { Id = 110, Name = "Hạt Chia Tươi", Price = 5000 },
                new ToppingOption { Id = 111, Name = "Thạch Lá Dứa Băng Tuyết", Price = 8000 }
            };

            // 3. Seed Sizes
            Sizes = new List<SizeOption>
            {
                new SizeOption { Code = "S", Name = "Nhỏ (S)", ExtraPrice = 0 },
                new SizeOption { Code = "M", Name = "Vừa (M)", ExtraPrice = 6000 },
                new SizeOption { Code = "L", Name = "Lớn (L)", ExtraPrice = 12000 }
            };

            // 4. Seed Products
            Products = new List<Product>
            {
                // ==================== CÀ PHÊ PHIN ====================
                new Product
                {
                    Id = 1, CategoryId = 1, CategoryName = "Cà Phê Phin",
                    Name = "Phin Sữa Đá", BasePrice = 29000, PromoPrice = 24000, CostPrice = 9500,
                    Badge = "Bán Chạy",
                    Description = "Hương vị cà phê phin đậm đà nguyên chất kết hợp cùng lớp sữa đặc béo ngậy truyền thống Cà Phê Hoàng Gia.",
                    ImageUrl = "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = Sizes, AvailableToppings = Toppings
                },
                new Product
                {
                    Id = 2, CategoryId = 1, CategoryName = "Cà Phê Phin",
                    Name = "Phin Đen Đá", BasePrice = 29000, CostPrice = 8500,
                    Badge = "Đón Đầu",
                    Description = "Dành cho tín đồ cà phê đích thực. Vị đắng nồng nàn thơm lừng lưu lại nơi hậu vị.",
                    ImageUrl = "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = Sizes, AvailableToppings = Toppings
                },
                new Product
                {
                    Id = 3, CategoryId = 1, CategoryName = "Cà Phê Phin",
                    Name = "PhinDi Hạnh Nhân", BasePrice = 39000, PromoPrice = 33000, CostPrice = 13500,
                    Badge = "Must Try",
                    Description = "Cà phê Phin thế hệ mới hòa quyện sốt Hạnh Nhân béo ngậy bùi bùi và lớp foam mịn màng.",
                    ImageUrl = "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = Sizes, AvailableToppings = Toppings
                },
                new Product
                {
                    Id = 4, CategoryId = 1, CategoryName = "Cà Phê Phin",
                    Name = "Bạc Xỉu Đá", BasePrice = 35000, CostPrice = 11000,
                    Badge = "Yêu Thích",
                    Description = "Ngọt ngào êm dịu với lượng sữa tươi nhiều hơn, quyện chút cà phê phin thơm lừng.",
                    ImageUrl = "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = Sizes, AvailableToppings = Toppings
                },

                // ==================== FREEZE HOÀNG GIA ====================
                new Product
                {
                    Id = 5, CategoryId = 2, CategoryName = "Freeze Hoàng Gia",
                    Name = "Freeze Trà Xanh", BasePrice = 49000, PromoPrice = 39000, CostPrice = 15000,
                    Badge = "Bán Chạy",
                    Description = "Trà xanh Uji Nhật Bản đá xay mát lạnh, kết hợp thạch trà xanh giòn sần sật và kem tươi thơm béo.",
                    ImageUrl = "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = Sizes, AvailableToppings = Toppings
                },
                new Product
                {
                    Id = 6, CategoryId = 2, CategoryName = "Freeze Hoàng Gia",
                    Name = "Freeze Cà Phê Phin", BasePrice = 49000, CostPrice = 16000,
                    Badge = "Hot",
                    Description = "Thức uống đá xay đậm vị cà phê phin Hoàng Gia đặc trưng, giòn ngon cùng thạch cà phê dai dai.",
                    ImageUrl = "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = Sizes, AvailableToppings = Toppings
                },
                new Product
                {
                    Id = 7, CategoryId = 2, CategoryName = "Freeze Hoàng Gia",
                    Name = "Cookies & Cream Freeze", BasePrice = 55000, CostPrice = 20000,
                    Badge = "Mới",
                    Description = "Bánh quy sô-cô-la xay mịn cùng kem sữa thơm ngon, phủ lớp vụn bánh giòn rụm bên trên.",
                    ImageUrl = "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = Sizes, AvailableToppings = Toppings
                },

                // ==================== TRÀ THẠCH & TRÁI CÂY ====================
                new Product
                {
                    Id = 8, CategoryId = 3, CategoryName = "Trà Thạch & Trái Cây",
                    Name = "Trà Sen Vàng (Signature)", BasePrice = 45000, PromoPrice = 39000, CostPrice = 14000,
                    Badge = "Signature",
                    Description = "Trà Ô Long đậm vị hòa quyện hạt sen bùi ngọt, củ năng giòn rụm và lớp kem phô mai cheese béo ngậy.",
                    ImageUrl = "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = Sizes, AvailableToppings = Toppings
                },
                new Product
                {
                    Id = 9, CategoryId = 3, CategoryName = "Trà Thạch & Trái Cây",
                    Name = "Trà Thạch Đào", BasePrice = 45000, CostPrice = 13500,
                    Badge = "Bán Chạy",
                    Description = "Trà đào thanh mát kết hợp những miếng đào ngâm giòn ngọt mọng nước cùng thạch đào dẻo ngon.",
                    ImageUrl = "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = Sizes, AvailableToppings = Toppings
                },
                new Product
                {
                    Id = 10, CategoryId = 3, CategoryName = "Trà Thạch & Trái Cây",
                    Name = "Trà Thanh Đào Sả", BasePrice = 45000, CostPrice = 13000,
                    Badge = "Hot",
                    Description = "Sự kết hợp độc đáo giữa vị trà thơm ngát, nước sả tươi ấm áp và vị đào dịu ngọt sảng khoái.",
                    ImageUrl = "https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = Sizes, AvailableToppings = Toppings
                },

                // ==================== TRÀ CHANH & TRÀ TẮC ====================
                new Product
                {
                    Id = 14, CategoryId = 6, CategoryName = "Trà Chanh & Trà Tắc",
                    Name = "Trà Chanh Giã Tay Quảng Đông", BasePrice = 29000, PromoPrice = 24000, CostPrice = 7500,
                    Badge = "Hot Trend",
                    Description = "Trà xanh lài hảo hạng kết hợp cùng chanh nước hoa tươi giã tay bùng nổ tinh dầu thơm lừng, chua thanh sảng khoái.",
                    ImageUrl = "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = Sizes, AvailableToppings = Toppings
                },
                new Product
                {
                    Id = 15, CategoryId = 6, CategoryName = "Trà Chanh & Trà Tắc",
                    Name = "Trà Tắc Xí Muội Đường Phèn", BasePrice = 25000, PromoPrice = 20000, CostPrice = 6000,
                    Badge = "Bán Chạy",
                    Description = "Trà tắc truyền thống vị chua ngọt hài hòa, thơm ngậy xí muội mặn nhẹ và hậu vị ngọt dịu từ đường phèn thanh nhiệt.",
                    ImageUrl = "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = Sizes, AvailableToppings = Toppings
                },
                new Product
                {
                    Id = 16, CategoryId = 6, CategoryName = "Trà Chanh & Trà Tắc",
                    Name = "Trà Chanh Mật Ong Hoa Cúc", BasePrice = 29000, CostPrice = 8500,
                    Badge = "Thanh Mát",
                    Description = "Cốt trà hoa cúc êm dịu hòa cùng chanh tươi mọng nước và mật ong hoa rừng nguyên chất, bổ sung vitamin C mỗi ngày.",
                    ImageUrl = "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = Sizes, AvailableToppings = Toppings
                },
                new Product
                {
                    Id = 17, CategoryId = 6, CategoryName = "Trà Chanh & Trà Tắc",
                    Name = "Trà Tắc Nha Đam Hạt Chia", BasePrice = 28000, CostPrice = 8000,
                    Badge = "Yêu Thích",
                    Description = "Thức uống giải nhiệt ngày hè cực đã với thạch nha đam tươi giòn ngọt sần sật kết hợp hạt chia organic dinh dưỡng.",
                    ImageUrl = "https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = Sizes, AvailableToppings = Toppings
                },
                new Product
                {
                    Id = 18, CategoryId = 6, CategoryName = "Trà Chanh & Trà Tắc",
                    Name = "Trà Chanh Sả Bạc Hà Tuyết Lạnh", BasePrice = 27000, CostPrice = 7500,
                    Badge = "Sảng Khoái",
                    Description = "Vị trà xanh thanh khiết quyện cùng tinh chất sả đập dập và lá bạc hà the mát, đập tan mọi cơn khát tức thì.",
                    ImageUrl = "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = Sizes, AvailableToppings = Toppings
                },
                new Product
                {
                    Id = 19, CategoryId = 6, CategoryName = "Trà Chanh & Trà Tắc",
                    Name = "Trà Tắc Khổng Lồ Hoàng Gia (700ml)", BasePrice = 22000, CostPrice = 5500,
                    Badge = "Best Seller",
                    Description = "Ly trà tắc dung tích lớn 700ml siêu đã, vị trà lài đậm đà kết hợp nước cốt tắc tươi 100% cực kỳ đã khát.",
                    ImageUrl = "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = Sizes, AvailableToppings = Toppings
                },
                new Product
                {
                    Id = 20, CategoryId = 6, CategoryName = "Trà Chanh & Trà Tắc",
                    Name = "Trà Chanh Đào Hồng Ruby", BasePrice = 32000, PromoPrice = 27000, CostPrice = 9000,
                    Badge = "Mới",
                    Description = "Trà chanh đào với màu hồng ngọc bắt mắt, vị ngọt dịu từ đào ngâm và vị chua thanh tao từ chanh đào tươi.",
                    ImageUrl = "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = Sizes, AvailableToppings = Toppings
                },

                // ==================== BÁNH MỲ & SNACKING ====================
                new Product
                {
                    Id = 11, CategoryId = 4, CategoryName = "Bánh Mỳ & Snacking",
                    Name = "Bánh Mỳ Que Gà Xé Phô Mai", BasePrice = 19000, CostPrice = 8000,
                    Badge = "Giòn Rụm",
                    Description = "Bánh mỳ que nướng nóng hổi nhân thịt gà xé đậm đà phết phô mai thơm ngon quyến rũ.",
                    ImageUrl = "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = new List<SizeOption> { Sizes[0] }, AvailableToppings = new List<ToppingOption>()
                },
                new Product
                {
                    Id = 12, CategoryId = 4, CategoryName = "Bánh Mỳ & Snacking",
                    Name = "Bánh Tiramisu Hoàng Gia", BasePrice = 35000, CostPrice = 14000,
                    Badge = "Ngon Khó Cưỡng",
                    Description = "Bánh mousse mềm mịn đượm vị espresso thơm nồng và lớp bột cacao nguyên chất đắng nhẹ.",
                    ImageUrl = "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = new List<SizeOption> { Sizes[0] }, AvailableToppings = new List<ToppingOption>()
                },

                // ==================== CÀ PHÊ CHAI & ĐÓNG GÓI ====================
                new Product
                {
                    Id = 13, CategoryId = 5, CategoryName = "Cà Phê Chai & Đóng Gói",
                    Name = "Cà Phê Phin Sữa Đá Chai 330ml", BasePrice = 49000, CostPrice = 22000,
                    Badge = "Pha Sẵn",
                    Description = "Chai cà phê phin sữa đá 330ml pha sẵn ướp lạnh, tiện lợi mang đi làm, giữ trọn vị thơm đậm.",
                    ImageUrl = "https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = new List<SizeOption> { Sizes[0] }, AvailableToppings = Toppings
                }
            };

            // 5. Seed Vouchers (Lấy toàn bộ từ CSDL)
            Vouchers = new List<Voucher>
            {
                new Voucher { Id = 1, Code = "ECOFFEE10", Name = "Giảm 10% tổng hóa đơn",
                    Description = "Ưu đãi tri ân khách hàng, giảm 10% cho mọi đơn hàng",
                    DiscountType = VoucherDiscountType.Percent, DiscountValue = 10, MinOrderAmount = 0, MaxDiscountAmount = 50000,
                    StartDate = new DateTime(2026, 8, 1), EndDate = new DateTime(2026, 9, 30),
                    IsActive = true, UsageLimit = 200, UsedCount = 47 },
                new Voucher { Id = 2, Code = "HE2026", Name = "Giảm 20.000đ chào hè",
                    Description = "Ưu đãi chào hè 2026, giảm 20k cho hóa đơn từ 40k",
                    DiscountType = VoucherDiscountType.FixedAmount, DiscountValue = 20000, MinOrderAmount = 40000,
                    StartDate = new DateTime(2026, 6, 1), EndDate = new DateTime(2026, 8, 31),
                    IsActive = true, UsageLimit = 100, UsedCount = 83 },
                new Voucher { Id = 3, Code = "FREESHIP", Name = "Trợ giá ship 15.000đ",
                    Description = "Hỗ trợ 15k phí giao hàng tận nơi cho đơn online từ 30k",
                    DiscountType = VoucherDiscountType.FixedAmount, DiscountValue = 15000, MinOrderAmount = 30000,
                    StartDate = new DateTime(2026, 8, 15), EndDate = new DateTime(2026, 10, 15),
                    IsActive = true, UsageLimit = 500, UsedCount = 129 },
                new Voucher { Id = 4, Code = "HOANGGIA50K", Name = "Giảm 50.000đ đơn tiệc",
                    Description = "Ưu đãi đơn nhóm / tiệc từ 200k",
                    DiscountType = VoucherDiscountType.FixedAmount, DiscountValue = 50000, MinOrderAmount = 200000,
                    StartDate = new DateTime(2026, 7, 1), EndDate = new DateTime(2026, 12, 31),
                    IsActive = true, UsageLimit = 50, UsedCount = 12 },
                new Voucher { Id = 5, Code = "VIPMEMBER", Name = "Giảm 15% khách VIP",
                    Description = "Đặc quyền thẻ thành viên VIP – không giới hạn đơn tối thiểu",
                    DiscountType = VoucherDiscountType.Percent, DiscountValue = 15, MinOrderAmount = 50000, MaxDiscountAmount = 100000,
                    StartDate = new DateTime(2026, 1, 1), EndDate = new DateTime(2026, 12, 31),
                    IsActive = true, UsageLimit = null, UsedCount = 68 },
                new Voucher { Id = 6, Code = "KHAIHANG", Name = "Khai trương -30%",
                    Description = "Voucher khai trương đã kết thúc",
                    DiscountType = VoucherDiscountType.Percent, DiscountValue = 30, MinOrderAmount = 0,
                    StartDate = new DateTime(2026, 5, 1), EndDate = new DateTime(2026, 5, 31),
                    IsActive = false, UsageLimit = 300, UsedCount = 298 },
                new Voucher { Id = 7, Code = "TUUUDAI9X", Name = "Ưu đãi 9x - Sắp ra mắt",
                    Description = "Voucher đặc biệt dành cho thế hệ 9x, sắp diễn ra",
                    DiscountType = VoucherDiscountType.Percent, DiscountValue = 20, MinOrderAmount = 60000, MaxDiscountAmount = 80000,
                    StartDate = new DateTime(2026, 9, 1), EndDate = new DateTime(2026, 9, 30),
                    IsActive = true, UsageLimit = 150, UsedCount = 0 }
            };

            // 5.1 Seed Price Histories (Lịch sử điều chỉnh giá vốn & giá bán)
            PriceHistories = new List<ProductPriceHistory>
            {
                new ProductPriceHistory { Id = 1, ProductId = 1, ProductName = "Phin Sữa Đá",
                    OldCostPrice = 8000, NewCostPrice = 9500, OldBasePrice = 27000, NewBasePrice = 29000,
                    ChangedAt = DateTime.Now.AddDays(-45), Reason = "Điều chỉnh giá nguyên liệu cà phê hạt tăng" },
                new ProductPriceHistory { Id = 2, ProductId = 5, ProductName = "Freeze Trà Xanh",
                    OldCostPrice = 13000, NewCostPrice = 15000, OldBasePrice = 45000, NewBasePrice = 49000,
                    ChangedAt = DateTime.Now.AddDays(-30), Reason = "Cập nhật giá matcha Uji nhập khẩu" },
                new ProductPriceHistory { Id = 3, ProductId = 8, ProductName = "Trà Sen Vàng (Signature)",
                    OldCostPrice = 12000, NewCostPrice = 14000, OldBasePrice = 42000, NewBasePrice = 45000,
                    OldPromoPrice = 36000, NewPromoPrice = 39000,
                    ChangedAt = DateTime.Now.AddDays(-15), Reason = "Giá kem phô mai tăng 15% theo thị trường" },
                new ProductPriceHistory { Id = 4, ProductId = 2, ProductName = "Phin Đen Đá",
                    OldCostPrice = 7500, NewCostPrice = 8500, OldBasePrice = 27000, NewBasePrice = 29000,
                    ChangedAt = DateTime.Now.AddDays(-45), Reason = "Đồng điều chỉnh với toàn bộ dòng Phin" },
            };

            // 6. Seed Dining Tables
            for (int i = 1; i <= 12; i++)
            {
                var tableNumber = i < 10 ? $"Bàn 0{i}" : $"Bàn {i}";
                var zone = i <= 6 ? "Tầng 1 - Trong nhà" : (i <= 10 ? "Tầng 2 - Máy lạnh" : "Sân vườn");
                var status = BarTableStatus.Empty;
                var items = new List<CartItem>();
                DateTime? occupiedTime = null;
                int custCount = 0;

                // Giả lập bàn 02, 05, 08 đang có khách
                if (i == 2)
                {
                    status = BarTableStatus.Occupied;
                    occupiedTime = DateTime.Now.AddMinutes(-35);
                    custCount = 2;
                    items.Add(new CartItem
                    {
                        ProductId = 1,
                        ProductName = "Phin Sữa Đá",
                        ProductImage = Products[0].ImageUrl,
                        SelectedSize = Sizes[1], // Size M (+6k) -> 35k
                        SugarLevel = "100%",
                        IceLevel = "70%",
                        SpecialNote = "Ít sữa đặc, đậm vị cà phê",
                        UnitBasePrice = 29000,
                        Quantity = 2,
                        SelectedToppings = new List<ToppingOption> { Toppings[0] } // Thạch cà phê +10k -> 45k/ly -> 90k
                    });
                    items.Add(new CartItem
                    {
                        ProductId = 11,
                        ProductName = "Bánh Mỳ Que Gà Xé Phô Mai",
                        ProductImage = Products.First(p => p.Id == 11).ImageUrl,
                        SelectedSize = Sizes[0],
                        SpecialNote = "Nướng giòn nóng hổi",
                        UnitBasePrice = 19000,
                        Quantity = 1
                    });
                }
                else if (i == 5)
                {
                    status = BarTableStatus.Occupied;
                    occupiedTime = DateTime.Now.AddMinutes(-15);
                    custCount = 4;
                    items.Add(new CartItem
                    {
                        ProductId = 14,
                        ProductName = "Trà Chanh Giã Tay Quảng Đông",
                        ProductImage = Products.First(p => p.Id == 14).ImageUrl,
                        SelectedSize = Sizes[1], // Size M (+6k)
                        SugarLevel = "70%",
                        IceLevel = "100%",
                        SpecialNote = "Nhiều đá, chua ngọt vừa",
                        UnitBasePrice = 24000,
                        Quantity = 2,
                        SelectedToppings = new List<ToppingOption> { Toppings.First(t => t.Id == 107) } // Trân Châu Trắng 3Q +8k
                    });
                    items.Add(new CartItem
                    {
                        ProductId = 15,
                        ProductName = "Trà Tắc Xí Muội Đường Phèn",
                        ProductImage = Products.First(p => p.Id == 15).ImageUrl,
                        SelectedSize = Sizes[2], // Size L (+12k)
                        SugarLevel = "100%",
                        IceLevel = "100%",
                        SpecialNote = "Thêm 1 viên xí muội",
                        UnitBasePrice = 20000,
                        Quantity = 2,
                        SelectedToppings = new List<ToppingOption> { Toppings.First(t => t.Id == 109) } // Xí muội +5k
                    });
                }
                else if (i == 8)
                {
                    status = BarTableStatus.Occupied;
                    occupiedTime = DateTime.Now.AddMinutes(-50);
                    custCount = 3;
                    items.Add(new CartItem
                    {
                        ProductId = 3,
                        ProductName = "PhinDi Hạnh Nhân",
                        ProductImage = Products.First(p => p.Id == 3).ImageUrl,
                        SelectedSize = Sizes[1],
                        SugarLevel = "70%",
                        IceLevel = "70%",
                        SpecialNote = "Ly mang đi, ít ngọt",
                        UnitBasePrice = 39000,
                        Quantity = 3
                    });
                }

                string seedCustName = "";
                string seedCustPhone = "";
                if (i == 2) { seedCustName = "Hoàng Nam"; seedCustPhone = "0912 345 678"; }
                else if (i == 5) { seedCustName = "Thu Trang"; seedCustPhone = "0933 456 789"; }
                else if (i == 8) { seedCustName = "Đức Minh"; seedCustPhone = "0977 112 233"; }

                Tables.Add(new BarTableItem
                {
                    TableId = $"T{i}",
                    TableName = tableNumber,
                    Zone = zone,
                    Status = status,
                    CustomerCount = custCount,
                    CustomerName = seedCustName,
                    CustomerPhone = seedCustPhone,
                    OccupiedTime = occupiedTime,
                    Items = items
                });
            }

            // 7. Seed Online Orders
            OnlineOrders.Add(new BarOnlineOrderItem
            {
                OrderId = "#ORD-1024",
                CustomerName = "Nguyễn Văn An",
                CustomerPhone = "0988 123 456",
                OrderType = OrderType.Delivery,
                DeliveryAddress = "Tòa B, Vincom Center, 72 Lê Thánh Tôn, Q.1",
                OrderTime = DateTime.Now.AddMinutes(-10),
                Status = BarOnlineOrderStatus.Pending,
                CustomerNote = "Ít đá, giao trước 11h30 giúp em",
                Items = new List<CartItem>
                {
                    new CartItem
                    {
                        ProductId = 14,
                        ProductName = "Trà Chanh Giã Tay Quảng Đông",
                        ProductImage = Products.First(p => p.Id == 14).ImageUrl,
                        SelectedSize = Sizes[1],
                        SugarLevel = "70%",
                        IceLevel = "70%",
                        UnitBasePrice = 24000,
                        Quantity = 2,
                        SelectedToppings = new List<ToppingOption> { Toppings.First(t => t.Id == 107) }
                    },
                    new CartItem
                    {
                        ProductId = 9,
                        ProductName = "Trà Thạch Đào",
                        ProductImage = Products.First(p => p.Id == 9).ImageUrl,
                        SelectedSize = Sizes[2],
                        SugarLevel = "70%",
                        IceLevel = "100%",
                        UnitBasePrice = 45000,
                        Quantity = 1
                    }
                }
            });

            OnlineOrders.Add(new BarOnlineOrderItem
            {
                OrderId = "#ORD-1025",
                CustomerName = "Trần Thị Mai",
                CustomerPhone = "0909 888 999",
                OrderType = OrderType.Pickup,
                DeliveryAddress = "Khách tự scan & chọn mang đi",
                OrderTime = DateTime.Now.AddMinutes(-18),
                Status = BarOnlineOrderStatus.Preparing,
                CustomerNote = "Cho nhiều trân châu trắng & xí muội",
                Items = new List<CartItem>
                {
                    new CartItem
                    {
                        ProductId = 15,
                        ProductName = "Trà Tắc Xí Muội Đường Phèn",
                        ProductImage = Products.First(p => p.Id == 15).ImageUrl,
                        SelectedSize = Sizes[2],
                        SugarLevel = "100%",
                        IceLevel = "100%",
                        UnitBasePrice = 20000,
                        Quantity = 2,
                        SelectedToppings = new List<ToppingOption> { Toppings.First(t => t.Id == 109) }
                    }
                }
            });

            OnlineOrders.Add(new BarOnlineOrderItem
            {
                OrderId = "#ORD-1026",
                CustomerName = "Lê Hoàng Nam",
                CustomerPhone = "0977 654 321",
                OrderType = OrderType.Pickup,
                DeliveryAddress = "Khách hẹn 11h45 ghé lấy",
                OrderTime = DateTime.Now.AddMinutes(-5),
                Status = BarOnlineOrderStatus.Pending,
                CustomerNote = "Trà chanh mật ong ấm nóng không đá",
                Items = new List<CartItem>
                {
                    new CartItem
                    {
                        ProductId = 16,
                        ProductName = "Trà Chanh Mật Ong Hoa Cúc",
                        ProductImage = Products.First(p => p.Id == 16).ImageUrl,
                        SelectedSize = Sizes[1],
                        SugarLevel = "50%",
                        IceLevel = "Không đá",
                        UnitBasePrice = 29000,
                        Quantity = 2
                    }
                }
            });

            // 6. Seed App Users (Tài khoản Quản trị & Nhân sự)
            Users = new List<AppUser>
            {
                new AppUser
                {
                    Id = 1,
                    Username = "admin",
                    Password = "123", // Cho phép đăng nhập bằng 123 hoặc 123456 hoặc admin123
                    FullName = "Nguyễn Hoàng Gia",
                    Role = "Admin",
                    RoleDisplayName = "Tổng Quản Trị",
                    Email = "admin@hoanggiacoffee.vn",
                    Phone = "0988 123 456",
                    Branch = "Hoàng Gia - Trụ sở chính",
                    Avatar = "HG",
                    IsActive = true
                },
                new AppUser
                {
                    Id = 2,
                    Username = "manager",
                    Password = "123",
                    FullName = "Trần Thanh Hà",
                    Role = "Manager",
                    RoleDisplayName = "Quản Lý Chi Nhánh",
                    Email = "manager@hoanggiacoffee.vn",
                    Phone = "0977 888 999",
                    Branch = "Hoàng Gia - Chi nhánh Phùng Chí Kiên",
                    Avatar = "TH",
                    IsActive = true
                },
                new AppUser
                {
                    Id = 3,
                    Username = "barista",
                    Password = "123",
                    FullName = "Lê Quốc Bảo",
                    Role = "Staff",
                    RoleDisplayName = "Pha Chế Ca 1",
                    Email = "barista@hoanggiacoffee.vn",
                    Phone = "0912 345 678",
                    Branch = "Quầy Bar Pha Chế - Ca Sáng",
                    Avatar = "QB",
                    IsActive = true
                }
            };
        }

        /// <summary>Seed dữ liệu lịch sử đơn đã hoàn tất / đã hủy trong ngày</summary>
        private void SeedOrderHistory()
        {
            OrderHistory = new List<BarOrderHistoryItem>
            {
                new BarOrderHistoryItem
                {
                    OrderId = "#ORD-1018",
                    CustomerName = "Phạm Thùy Linh",
                    CustomerPhone = "0901 234 567",
                    OrderType = OrderType.Delivery,
                    OrderTypeLabel = "Giao tận nơi",
                    OrderTime = DateTime.Now.AddHours(-4).AddMinutes(-15),
                    ClosedAt = DateTime.Now.AddHours(-3).AddMinutes(-42),
                    FinalStatus = BarOnlineOrderStatus.Completed,
                    TotalAmount = 115000,
                    DiscountAmount = 11500,
                    FinalAmount = 103500,
                    PaymentMethod = "qr",
                    ItemCount = 3,
                    TableOrOrderId = "#ORD-1018",
                    Items = new List<BarHistoryItemDetail>
                    {
                        new BarHistoryItemDetail { ProductName = "Phin Sữa Đá", SizeName = "Vừa (M)", Quantity = 2, SubTotal = 58000 },
                        new BarHistoryItemDetail { ProductName = "Trà Thạch Đào", SizeName = "Lớn (L)", ToppingName = "Thạch Lá Dứa", Quantity = 1, SubTotal = 57000 }
                    }
                },
                new BarOrderHistoryItem
                {
                    OrderId = "Bàn 03",
                    CustomerName = "Lê Văn Tuấn",
                    CustomerPhone = "0966 543 210",
                    OrderType = OrderType.Pickup,
                    OrderTypeLabel = "Tại bàn",
                    OrderTime = DateTime.Now.AddHours(-3).AddMinutes(-30),
                    ClosedAt = DateTime.Now.AddHours(-2).AddMinutes(-55),
                    FinalStatus = BarOnlineOrderStatus.Completed,
                    TotalAmount = 87000,
                    DiscountAmount = 0,
                    FinalAmount = 87000,
                    PaymentMethod = "cash",
                    ItemCount = 2,
                    TableOrOrderId = "Bàn 03",
                    Items = new List<BarHistoryItemDetail>
                    {
                        new BarHistoryItemDetail { ProductName = "Bạc Xỉu Nóng", SizeName = "Vừa (M)", Quantity = 1, SubTotal = 35000 },
                        new BarHistoryItemDetail { ProductName = "Bánh Mỳ Que Gà Xé Phô Mai", SizeName = "Nhỏ (S)", Quantity = 2, SubTotal = 52000 }
                    }
                },
                new BarOrderHistoryItem
                {
                    OrderId = "#MD-0930-441",
                    CustomerName = "Khách mang đi",
                    CustomerPhone = "",
                    OrderType = OrderType.Pickup,
                    OrderTypeLabel = "Đến lấy / Mang đi",
                    OrderTime = DateTime.Now.AddHours(-2).AddMinutes(-40),
                    ClosedAt = DateTime.Now.AddHours(-2).AddMinutes(-20),
                    FinalStatus = BarOnlineOrderStatus.Completed,
                    TotalAmount = 58000,
                    DiscountAmount = 5800,
                    FinalAmount = 52200,
                    PaymentMethod = "qr",
                    ItemCount = 2,
                    TableOrOrderId = "#MD-0930-441",
                    Items = new List<BarHistoryItemDetail>
                    {
                        new BarHistoryItemDetail { ProductName = "Trà Chanh Giã Tay Quảng Đông", SizeName = "Vừa (M)", ToppingName = "Trân Châu Trắng 3Q", Quantity = 2, SubTotal = 58000 }
                    }
                },
                new BarOrderHistoryItem
                {
                    OrderId = "#ORD-1020",
                    CustomerName = "Nguyễn Minh Kính",
                    CustomerPhone = "0855 666 777",
                    OrderType = OrderType.Delivery,
                    OrderTypeLabel = "Giao tận nơi",
                    OrderTime = DateTime.Now.AddHours(-1).AddMinutes(-55),
                    ClosedAt = DateTime.Now.AddHours(-1).AddMinutes(-40),
                    FinalStatus = BarOnlineOrderStatus.Cancelled,
                    TotalAmount = 72000,
                    DiscountAmount = 0,
                    FinalAmount = 72000,
                    PaymentMethod = "",
                    CancelReason = "Khách đổi ý, hủy đơn sau khi đặt",
                    ItemCount = 2,
                    TableOrOrderId = "#ORD-1020",
                    Items = new List<BarHistoryItemDetail>
                    {
                        new BarHistoryItemDetail { ProductName = "Trà Tắc Xí Muội Đường Phèn", SizeName = "Lớn (L)", ToppingName = "Xí Muội Mặn Ngọt", Quantity = 2, SubTotal = 72000 }
                    }
                },
                new BarOrderHistoryItem
                {
                    OrderId = "Bàn 07",
                    CustomerName = "Trần Quốc Hùng",
                    CustomerPhone = "0944 112 233",
                    OrderType = OrderType.Pickup,
                    OrderTypeLabel = "Tại bàn",
                    OrderTime = DateTime.Now.AddMinutes(-70),
                    ClosedAt = DateTime.Now.AddMinutes(-45),
                    FinalStatus = BarOnlineOrderStatus.Completed,
                    TotalAmount = 145000,
                    DiscountAmount = 0,
                    FinalAmount = 145000,
                    PaymentMethod = "card",
                    ItemCount = 4,
                    TableOrOrderId = "Bàn 07",
                    Items = new List<BarHistoryItemDetail>
                    {
                        new BarHistoryItemDetail { ProductName = "Cà Phê Đen Đá", SizeName = "Vừa (M)", Quantity = 2, SubTotal = 50000 },
                        new BarHistoryItemDetail { ProductName = "Phin Sữa Đá", SizeName = "Lớn (L)", Quantity = 1, SubTotal = 45000 },
                        new BarHistoryItemDetail { ProductName = "Bánh Mỳ Que Gà Xé Phô Mai", SizeName = "Nhỏ (S)", Quantity = 2, SubTotal = 50000 }
                    }
                },
                new BarOrderHistoryItem
                {
                    OrderId = "#ORD-1022",
                    CustomerName = "Hoàng Thị Thu",
                    CustomerPhone = "0933 878 900",
                    OrderType = OrderType.Pickup,
                    OrderTypeLabel = "Đến lấy / Mang đi",
                    OrderTime = DateTime.Now.AddMinutes(-30),
                    ClosedAt = DateTime.Now.AddMinutes(-18),
                    FinalStatus = BarOnlineOrderStatus.Cancelled,
                    TotalAmount = 49000,
                    DiscountAmount = 0,
                    FinalAmount = 49000,
                    PaymentMethod = "",
                    CancelReason = "Bùng đơn, không đến lấy hàng",
                    ItemCount = 1,
                    TableOrOrderId = "#ORD-1022",
                    Items = new List<BarHistoryItemDetail>
                    {
                        new BarHistoryItemDetail { ProductName = "Trà Sữa Oolong Nướng", SizeName = "Vừa (M)", ToppingName = "Trân Châu Đen", Quantity = 1, SubTotal = 49000 }
                    }
                }
            };
            // Sắp xếp mới nhất trước
            OrderHistory = OrderHistory.OrderByDescending(h => h.ClosedAt).ToList();
        }
    }
}
