using System.Collections.Generic;
using System.Linq;
using E_Coffee.Models;

namespace E_Coffee.Services
{
    public class CoffeeCatalogService : ICoffeeCatalogService
    {
        private readonly List<Category> _categories;
        private readonly List<Product> _products;
        private readonly List<ToppingOption> _toppings;
        private readonly List<SizeOption> _sizes;
        private static readonly List<BarTableItem> _tables = new();
        private static readonly List<BarOnlineOrderItem> _onlineOrders = new();

        public CoffeeCatalogService()
        {
            _categories = new List<Category>
            {
                new Category { Id = 1, Name = "Cà Phê Phin", Icon = "bi-cup-hot-fill", Slug = "ca-phe-phin", DisplayOrder = 1, Description = "Đậm đà hương vị truyền thống Việt Nam" },
                new Category { Id = 2, Name = "Freeze Hoàng Gia", Icon = "bi-snow2", Slug = "freeze-hoang-gia", DisplayOrder = 2, Description = "Đá xay thơm béo thạch dai ngon" },
                new Category { Id = 3, Name = "Trà Thạch & Trái Cây", Icon = "bi-cup-straw", Slug = "tra-thach", DisplayOrder = 3, Description = "Thanh mát hương hoa trái sảng khoái" },
                new Category { Id = 4, Name = "Bánh Mỳ & Snacking", Icon = "bi-pie-chart-fill", Slug = "banh-my-snacking", DisplayOrder = 4, Description = "Bánh mỳ que giòn rụm & bánh ngọt ngon khó cưỡng" },
                new Category { Id = 5, Name = "Cà Phê Chai & Đóng Gói", Icon = "bi-box-seam-fill", Slug = "ca-phe-chai", DisplayOrder = 5, Description = "Tiện lợi thưởng thức mọi lúc mọi nơi" }
            };

            _toppings = new List<ToppingOption>
            {
                new ToppingOption { Id = 101, Name = "Thạch Cà Phê", Price = 10000 },
                new ToppingOption { Id = 102, Name = "Thạch Đào", Price = 10000 },
                new ToppingOption { Id = 103, Name = "Hạt Sen Bùi", Price = 12000 },
                new ToppingOption { Id = 104, Name = "Kem Phô Mai Cheese", Price = 15000 },
                new ToppingOption { Id = 105, Name = "Thạch Củ Năng", Price = 10000 },
                new ToppingOption { Id = 106, Name = "Extra Shot Espresso", Price = 15000 }
            };

            _sizes = new List<SizeOption>
            {
                new SizeOption { Code = "S", Name = "Nhỏ (S)", ExtraPrice = 0 },
                new SizeOption { Code = "M", Name = "Vừa (M)", ExtraPrice = 6000 },
                new SizeOption { Code = "L", Name = "Lớn (L)", ExtraPrice = 12000 }
            };

            _products = new List<Product>
            {
                // Cà Phê Phin
                new Product
                {
                    Id = 1,
                    CategoryId = 1,
                    CategoryName = "Cà Phê Phin",
                    Name = "Phin Sữa Đá",
                    BasePrice = 29000,
                    PromoPrice = 24000,
                    Badge = "Bán Chạy",
                    Description = "Hương vị cà phê phin đậm đà nguyên chất kết hợp cùng lớp sữa đặc béo ngậy truyền thống Cà Phê Hoàng Gia.",
                    ImageUrl = "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = _sizes,
                    AvailableToppings = _toppings
                },
                new Product
                {
                    Id = 2,
                    CategoryId = 1,
                    CategoryName = "Cà Phê Phin",
                    Name = "Phin Đen Đá",
                    BasePrice = 29000,
                    Badge = "Đón Đầu",
                    Description = "Dành cho tín đồ cà phê đích thực. Vị đắng nồng nàn thơm lừng lưu lại nơi hậu vị.",
                    ImageUrl = "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = _sizes,
                    AvailableToppings = _toppings
                },
                new Product
                {
                    Id = 3,
                    CategoryId = 1,
                    CategoryName = "Cà Phê Phin",
                    Name = "PhinDi Hạnh Nhân",
                    BasePrice = 39000,
                    PromoPrice = 33000,
                    Badge = "Must Try",
                    Description = "Cà phê Phin thế hệ mới hòa quyện sốt Hạnh Nhân béo ngậy bùi bùi và lớp foam mịn màng.",
                    ImageUrl = "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = _sizes,
                    AvailableToppings = _toppings
                },
                new Product
                {
                    Id = 4,
                    CategoryId = 1,
                    CategoryName = "Cà Phê Phin",
                    Name = "Bạc Xỉu Đá",
                    BasePrice = 35000,
                    Badge = "Yêu Thích",
                    Description = "Ngọt ngào êm dịu với lượng sữa tươi nhiều hơn, quyện chút cà phê phin thơm lừng.",
                    ImageUrl = "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = _sizes,
                    AvailableToppings = _toppings
                },

                // Freeze Hoàng Gia
                new Product
                {
                    Id = 5,
                    CategoryId = 2,
                    CategoryName = "Freeze Hoàng Gia",
                    Name = "Freeze Trà Xanh",
                    BasePrice = 49000,
                    PromoPrice = 39000,
                    Badge = "Bán Chạy",
                    Description = "Trà xanh Uji Nhật Bản đá xay mát lạnh, kết hợp thạch trà xanh giòn sần sật và kem tươi thơm béo.",
                    ImageUrl = "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = _sizes,
                    AvailableToppings = _toppings
                },
                new Product
                {
                    Id = 6,
                    CategoryId = 2,
                    CategoryName = "Freeze Hoàng Gia",
                    Name = "Freeze Cà Phê Phin",
                    BasePrice = 49000,
                    Badge = "Hot",
                    Description = "Thức uống đá xay đậm vị cà phê phin Hoàng Gia đặc trưng, giòn ngon cùng thạch cà phê dai dai.",
                    ImageUrl = "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = _sizes,
                    AvailableToppings = _toppings
                },
                new Product
                {
                    Id = 7,
                    CategoryId = 2,
                    CategoryName = "Freeze Hoàng Gia",
                    Name = "Cookies & Cream Freeze",
                    BasePrice = 55000,
                    Badge = "Mới",
                    Description = "Bánh quy sô-cô-la xay mịn cùng kem sữa thơm ngon, phủ lớp vụn bánh giòn rụm bên trên.",
                    ImageUrl = "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = _sizes,
                    AvailableToppings = _toppings
                },

                // Trà Thạch & Trái Cây
                new Product
                {
                    Id = 8,
                    CategoryId = 3,
                    CategoryName = "Trà Thạch & Trái Cây",
                    Name = "Trà Sen Vàng (Signature)",
                    BasePrice = 45000,
                    PromoPrice = 39000,
                    Badge = "Signature",
                    Description = "Trà Ô Long đậm vị hòa quyện hạt sen bùi ngọt, củ năng giòn rụm và lớp kem phô mai cheese béo ngậy.",
                    ImageUrl = "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = _sizes,
                    AvailableToppings = _toppings
                },
                new Product
                {
                    Id = 9,
                    CategoryId = 3,
                    CategoryName = "Trà Thạch & Trái Cây",
                    Name = "Trà Thạch Đào",
                    BasePrice = 45000,
                    Badge = "Bán Chạy",
                    Description = "Trà đào thanh mát kết hợp những miếng đào ngâm giòn ngọt mọng nước cùng thạch đào dẻo ngon.",
                    ImageUrl = "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = _sizes,
                    AvailableToppings = _toppings
                },
                new Product
                {
                    Id = 10,
                    CategoryId = 3,
                    CategoryName = "Trà Thạch & Trái Cây",
                    Name = "Trà Thanh Đào Sả",
                    BasePrice = 45000,
                    Badge = "Hot",
                    Description = "Sự kết hợp độc đáo giữa vị trà thơm ngát, nước sả tươi ấm áp và vị đào dịu ngọt sảng khoái.",
                    ImageUrl = "https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = _sizes,
                    AvailableToppings = _toppings
                },

                // Bánh Mỳ & Snacking
                new Product
                {
                    Id = 11,
                    CategoryId = 4,
                    CategoryName = "Bánh Mỳ & Snacking",
                    Name = "Bánh Mỳ Que Gà Xé Phô Mai",
                    BasePrice = 19000,
                    Badge = "Giòn Rụm",
                    Description = "Bánh mỳ que nướng nóng hổi nhân thịt gà xé đậm đà phết phô mai thơm ngon quyến rũ.",
                    ImageUrl = "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = new List<SizeOption> { _sizes[0] },
                    AvailableToppings = new List<ToppingOption>()
                },
                new Product
                {
                    Id = 12,
                    CategoryId = 4,
                    CategoryName = "Bánh Mỳ & Snacking",
                    Name = "Bánh Tiramisu Hoàng Gia",
                    BasePrice = 35000,
                    Badge = "Ngon Khó Cưỡng",
                    Description = "Bánh mousse mềm mịn đượm vị espresso thơm nồng và lớp bột cacao nguyên chất đắng nhẹ.",
                    ImageUrl = "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = new List<SizeOption> { _sizes[0] },
                    AvailableToppings = new List<ToppingOption>()
                },

                // Cà Phê Chai & Đóng Gói
                new Product
                {
                    Id = 13,
                    CategoryId = 5,
                    CategoryName = "Cà Phê Chai & Đóng Gói",
                    Name = "Cà Phê Phin Sữa Đá Chai 330ml",
                    BasePrice = 49000,
                    Badge = "Pha Sẵn",
                    Description = "Chai cà phê phin sữa đá 330ml pha sẵn ướp lạnh, tiện lợi mang đi làm, giữ trọn vị thơm đậm.",
                    ImageUrl = "https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?auto=format&fit=crop&w=600&q=80",
                    AvailableSizes = new List<SizeOption> { _sizes[0] },
                    AvailableToppings = _toppings
                }
            };

            InitMockBarData();
        }

        private void InitMockBarData()
        {
            if (_tables.Count == 0)
            {
                // Khởi tạo 12 bàn trong quán
                for (int i = 1; i <= 12; i++)
                {
                    var tableNumber = i < 10 ? $"Bàn 0{i}" : $"Bàn {i}";
                    var zone = i <= 6 ? "Tầng 1 - Trong nhà" : (i <= 10 ? "Tầng 2 - Máy lạnh" : "Sân vườn");
                    var status = BarTableStatus.Empty;
                    var items = new List<CartItem>();
                    System.DateTime? occupiedTime = null;
                    int custCount = 0;

                    // Giả lập bàn 02, 05, 08 đang có khách
                    if (i == 2)
                    {
                        status = BarTableStatus.Occupied;
                        occupiedTime = System.DateTime.Now.AddMinutes(-35);
                        custCount = 2;
                        items.Add(new CartItem
                        {
                            ProductId = 1,
                            ProductName = "Phin Sữa Đá",
                            ProductImage = _products[0].ImageUrl,
                            SelectedSize = _sizes[1], // Size M (+6k) -> 35k
                            SugarLevel = "100%",
                            IceLevel = "70%",
                            UnitBasePrice = 29000,
                            Quantity = 2,
                            SelectedToppings = new List<ToppingOption> { _toppings[0] } // Thạch cà phê +10k -> 45k/ly -> 90k
                        });
                        items.Add(new CartItem
                        {
                            ProductId = 11,
                            ProductName = "Bánh Mỳ Que Gà Xé Phô Mai",
                            ProductImage = _products[10].ImageUrl,
                            SelectedSize = _sizes[0],
                            UnitBasePrice = 19000,
                            Quantity = 1
                        });
                    }
                    else if (i == 5)
                    {
                        status = BarTableStatus.Occupied;
                        occupiedTime = System.DateTime.Now.AddMinutes(-15);
                        custCount = 4;
                        items.Add(new CartItem
                        {
                            ProductId = 8,
                            ProductName = "Trà Sen Vàng (Signature)",
                            ProductImage = _products[7].ImageUrl,
                            SelectedSize = _sizes[2], // Size L (+12k) -> 57k
                            SugarLevel = "70%",
                            IceLevel = "100%",
                            UnitBasePrice = 45000,
                            Quantity = 2
                        });
                        items.Add(new CartItem
                        {
                            ProductId = 5,
                            ProductName = "Freeze Trà Xanh",
                            ProductImage = _products[4].ImageUrl,
                            SelectedSize = _sizes[1],
                            UnitBasePrice = 49000,
                            Quantity = 2
                        });
                    }
                    else if (i == 8)
                    {
                        status = BarTableStatus.Occupied;
                        occupiedTime = System.DateTime.Now.AddMinutes(-50);
                        custCount = 3;
                        items.Add(new CartItem
                        {
                            ProductId = 3,
                            ProductName = "PhinDi Hạnh Nhân",
                            ProductImage = _products[2].ImageUrl,
                            SelectedSize = _sizes[1],
                            UnitBasePrice = 39000,
                            Quantity = 3
                        });
                    }

                    _tables.Add(new BarTableItem
                    {
                        TableId = $"T{i}",
                        TableName = tableNumber,
                        Zone = zone,
                        Status = status,
                        CustomerCount = custCount,
                        OccupiedTime = occupiedTime,
                        Items = items
                    });
                }
            }

            if (_onlineOrders.Count == 0)
            {
                // Khởi tạo các đơn hàng online mẫu
                _onlineOrders.Add(new BarOnlineOrderItem
                {
                    OrderId = "#ORD-1024",
                    CustomerName = "Nguyễn Văn An",
                    CustomerPhone = "0988 123 456",
                    OrderType = OrderType.Delivery,
                    DeliveryAddress = "Tòa B, Vincom Center, 72 Lê Thánh Tôn, Q.1",
                    OrderTime = System.DateTime.Now.AddMinutes(-10),
                    Status = BarOnlineOrderStatus.Pending,
                    CustomerNote = "Ít đá, giao trước 11h30 giúp em",
                    Items = new List<CartItem>
                    {
                        new CartItem
                        {
                            ProductId = 1,
                            ProductName = "Phin Sữa Đá",
                            ProductImage = _products[0].ImageUrl,
                            SelectedSize = _sizes[1],
                            SugarLevel = "100%",
                            IceLevel = "50%",
                            UnitBasePrice = 29000,
                            Quantity = 2
                        },
                        new CartItem
                        {
                            ProductId = 9,
                            ProductName = "Trà Thạch Đào",
                            ProductImage = _products[8].ImageUrl,
                            SelectedSize = _sizes[2],
                            SugarLevel = "70%",
                            IceLevel = "100%",
                            UnitBasePrice = 45000,
                            Quantity = 1
                        }
                    }
                });

                _onlineOrders.Add(new BarOnlineOrderItem
                {
                    OrderId = "#ORD-1025",
                    CustomerName = "Trần Thị Mai",
                    CustomerPhone = "0909 888 999",
                    OrderType = OrderType.Pickup,
                    DeliveryAddress = "Khách tự scan & chọn mang đi",
                    OrderTime = System.DateTime.Now.AddMinutes(-18),
                    Status = BarOnlineOrderStatus.Preparing,
                    CustomerNote = "Cho nhiều thạch trà xanh",
                    Items = new List<CartItem>
                    {
                        new CartItem
                        {
                            ProductId = 5,
                            ProductName = "Freeze Trà Xanh",
                            ProductImage = _products[4].ImageUrl,
                            SelectedSize = _sizes[2],
                            SugarLevel = "100%",
                            IceLevel = "100%",
                            UnitBasePrice = 49000,
                            Quantity = 2
                        }
                    }
                });

                _onlineOrders.Add(new BarOnlineOrderItem
                {
                    OrderId = "#ORD-1026",
                    CustomerName = "Lê Hoàng Nam",
                    CustomerPhone = "0977 654 321",
                    OrderType = OrderType.Pickup,
                    DeliveryAddress = "Khách hẹn 11h45 ghé lấy",
                    OrderTime = System.DateTime.Now.AddMinutes(-5),
                    Status = BarOnlineOrderStatus.Pending,
                    CustomerNote = "Cà phê phin béo, không đường",
                    Items = new List<CartItem>
                    {
                        new CartItem
                        {
                            ProductId = 3,
                            ProductName = "PhinDi Hạnh Nhân",
                            ProductImage = _products[2].ImageUrl,
                            SelectedSize = _sizes[1],
                            SugarLevel = "30%",
                            IceLevel = "70%",
                            UnitBasePrice = 39000,
                            Quantity = 1
                        }
                    }
                });
            }
        }

        public List<Category> GetCategories() => _categories.OrderBy(c => c.DisplayOrder).ToList();

        public List<Product> GetProducts(int categoryId = 0, string searchQuery = "")
        {
            var query = _products.AsQueryable();

            if (categoryId > 0)
            {
                query = query.Where(p => p.CategoryId == categoryId);
            }

            if (!string.IsNullOrWhiteSpace(searchQuery))
            {
                var keyword = searchQuery.Trim().ToLower();
                query = query.Where(p => p.Name.ToLower().Contains(keyword) || p.Description.ToLower().Contains(keyword));
            }

            return query.ToList();
        }

        public Product? GetProductById(int id)
        {
            return _products.FirstOrDefault(p => p.Id == id);
        }

        public List<ToppingOption> GetGlobalToppings() => _toppings;
        public List<SizeOption> GetGlobalSizes() => _sizes;

        public List<BarTableItem> GetBarTables() => _tables;
        public List<BarOnlineOrderItem> GetBarOnlineOrders() => _onlineOrders;

        public bool CheckoutBarOrder(BarCheckoutRequest request)
        {
            if (request.TargetType == "table")
            {
                var table = _tables.FirstOrDefault(t => t.TableName.Equals(request.TargetId, System.StringComparison.OrdinalIgnoreCase) || t.TableId.Equals(request.TargetId, System.StringComparison.OrdinalIgnoreCase));
                if (table != null)
                {
                    table.Status = BarTableStatus.Empty;
                    table.Items.Clear();
                    table.OccupiedTime = null;
                    table.CustomerCount = 0;
                    return true;
                }
            }
            else if (request.TargetType == "online")
            {
                var order = _onlineOrders.FirstOrDefault(o => o.OrderId.Equals(request.TargetId, System.StringComparison.OrdinalIgnoreCase));
                if (order != null)
                {
                    order.Status = BarOnlineOrderStatus.Completed;
                    return true;
                }
            }
            return true;
        }

        public bool UpdateOnlineOrderStatus(string orderId, BarOnlineOrderStatus status)
        {
            var order = _onlineOrders.FirstOrDefault(o => o.OrderId.Equals(orderId, System.StringComparison.OrdinalIgnoreCase));
            if (order != null)
            {
                order.Status = status;
                return true;
            }
            return false;
        }
    }
}
