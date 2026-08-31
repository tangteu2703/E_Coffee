using System;
using System.Collections.Generic;
using System.Linq;
using E_Coffee.Models;
using E_Coffee.Repositories;

namespace E_Coffee.Services
{
    /// <summary>
    /// Business Logic Service xử lý toàn bộ nghiệp vụ danh mục, sản phẩm, tính toán giảm giá voucher, đặt bàn, POS
    /// Gọi gián tiếp xuống tầng Repository để truy vấn dữ liệu từ CSDL
    /// </summary>
    public class CoffeeCatalogService : ICoffeeCatalogService
    {
        private readonly ICategoryRepository _categoryRepo;
        private readonly IProductRepository _productRepo;
        private readonly IVoucherRepository _voucherRepo;
        private readonly ITableRepository _tableRepo;
        private readonly IOrderRepository _orderRepo;
        private readonly Data.MockDbContext _context;

        public CoffeeCatalogService(
            ICategoryRepository categoryRepo,
            IProductRepository productRepo,
            IVoucherRepository voucherRepo,
            ITableRepository tableRepo,
            IOrderRepository orderRepo,
            Data.MockDbContext context)
        {
            _categoryRepo = categoryRepo;
            _productRepo = productRepo;
            _voucherRepo = voucherRepo;
            _tableRepo = tableRepo;
            _orderRepo = orderRepo;
            _context = context;
        }

        public List<Category> GetCategories()
        {
            return _categoryRepo.GetAll();
        }

        public List<Product> GetProducts(int categoryId = 0, string searchQuery = "")
        {
            return _productRepo.GetAll(categoryId, searchQuery);
        }

        public Product? GetProductById(int id)
        {
            return _productRepo.GetById(id);
        }

        public List<ToppingOption> GetGlobalToppings()
        {
            return _productRepo.GetToppings();
        }

        public List<SizeOption> GetGlobalSizes()
        {
            return _productRepo.GetSizes();
        }

        public List<BarTableItem> GetBarTables()
        {
            return _tableRepo.GetAll();
        }

        public List<BarOnlineOrderItem> GetBarOnlineOrders()
        {
            return _orderRepo.GetOnlineOrders();
        }

        public BarOnlineOrderItem PlaceOnlineOrder(OnlinePlaceOrderRequest request)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));

            // Xác định OrderType
            var orderType = request.OrderType switch
            {
                "Delivery" => OrderType.Delivery,
                "AtTable"  => OrderType.AtTable,
                _          => OrderType.Pickup
            };

            // Build CartItem list từ request
            var cartItems = (request.Items ?? new()).Select(i => new CartItem
            {
                ProductId   = i.ProductId,
                ProductName = i.ProductName,
                Quantity    = i.Quantity,
                UnitBasePrice = i.UnitBasePrice,
                SelectedSize = new SizeOption
                {
                    Code       = string.IsNullOrWhiteSpace(i.SizeName) ? "S" : i.SizeName,
                    Name       = i.SizeName,
                    ExtraPrice = i.SizeExtraPrice
                },
                SugarLevel = i.SugarLevel,
                IceLevel   = i.IceLevel,
                SelectedToppings = (i.SelectedToppings ?? new()).Select(t => new ToppingOption
                {
                    Id    = t.Id,
                    Name  = t.Name,
                    Price = t.Price
                }).ToList(),
                SpecialNote = i.SpecialNote
            }).ToList();

            // Tạo mã đơn duy nhất dạng ECO-xxxxxx
            var orderId = $"ECO-{DateTime.Now:MMdd}{new Random().Next(100, 999)}";

            var order = new BarOnlineOrderItem
            {
                OrderId         = orderId,
                CustomerName    = request.CustomerName,
                CustomerPhone   = request.CustomerPhone,
                OrderType       = orderType,
                DeliveryAddress = orderType == OrderType.Delivery
                                    ? request.DeliveryAddress
                                    : (!string.IsNullOrWhiteSpace(request.TableNumber) ? $"Bàn: {request.TableNumber}" : "Tại quầy"),
                CustomerNote    = request.CustomerNote,
                OrderTime       = DateTime.Now,
                Status          = BarOnlineOrderStatus.Pending,
                Items           = cartItems
            };

            _orderRepo.AddOnlineOrder(order);
            return order;
        }


        public List<Voucher> GetActiveVouchers()
        {
            return _voucherRepo.GetAll();
        }

        public VoucherValidationResult ValidateVoucher(string code, decimal orderAmount)
        {
            if (string.IsNullOrWhiteSpace(code))
            {
                return new VoucherValidationResult
                {
                    IsValid = false,
                    Message = "Vui lòng nhập mã voucher"
                };
            }

            var voucher = _voucherRepo.GetByCode(code);
            if (voucher == null || !voucher.IsActive)
            {
                return new VoucherValidationResult
                {
                    IsValid = false,
                    Message = "Mã voucher không tồn tại hoặc đã hết hạn"
                };
            }

            // Kiểm tra ngày hiệu lực
            if (voucher.StartDate.HasValue && DateTime.Now < voucher.StartDate.Value)
            {
                return new VoucherValidationResult
                {
                    IsValid = false,
                    Message = "Mã voucher chưa đến thời gian áp dụng"
                };
            }

            if (voucher.EndDate.HasValue && DateTime.Now > voucher.EndDate.Value)
            {
                return new VoucherValidationResult
                {
                    IsValid = false,
                    Message = "Mã voucher đã hết hạn sử dụng"
                };
            }

            // Kiểm tra số lần sử dụng tối đa
            if (voucher.UsageLimit.HasValue && voucher.UsedCount >= voucher.UsageLimit.Value)
            {
                return new VoucherValidationResult
                {
                    IsValid = false,
                    Message = "Mã voucher đã đạt giới hạn lượt sử dụng"
                };
            }

            // Kiểm tra giá trị đơn hàng tối thiểu
            if (orderAmount < voucher.MinOrderAmount)
            {
                return new VoucherValidationResult
                {
                    IsValid = false,
                    Message = $"Đơn hàng cần tối thiểu {voucher.MinOrderAmount:N0}đ để áp dụng voucher này"
                };
            }

            // Tính số tiền giảm giá
            decimal discount = 0;
            if (voucher.DiscountType == VoucherDiscountType.Percent)
            {
                discount = Math.Round(orderAmount * (voucher.DiscountValue / 100m));
                if (voucher.MaxDiscountAmount.HasValue && voucher.MaxDiscountAmount.Value > 0 && discount > voucher.MaxDiscountAmount.Value)
                {
                    discount = voucher.MaxDiscountAmount.Value;
                }
            }
            else // FixedAmount
            {
                discount = Math.Min(orderAmount, voucher.DiscountValue);
            }

            var finalAmount = Math.Max(0, orderAmount - discount);

            return new VoucherValidationResult
            {
                IsValid = true,
                Message = $"Áp dụng thành công voucher {voucher.Code}",
                Code = voucher.Code,
                Name = voucher.Name,
                Type = voucher.DiscountType == VoucherDiscountType.Percent ? "percent" : "fixed",
                Value = voucher.DiscountValue,
                DiscountAmount = discount,
                FinalAmount = finalAmount
            };
        }

        public bool CheckoutBarOrder(BarCheckoutRequest request)
        {
            if (request == null) return false;

            if (request.TargetType == "table")
            {
                // Ghi lịch sử trước khi reset bàn
                var table = _tableRepo.GetAll().FirstOrDefault(t =>
                    t.TableName.Equals(request.TargetId, StringComparison.OrdinalIgnoreCase));
                if (table != null && table.Items.Count > 0)
                {
                    var payMethod = request.PaymentMethod ?? "cash";
                    var payLabel = payMethod == "qr" ? "Chuyển khoản QR"
                                 : payMethod == "card" ? "Thẻ"
                                 : "Tiền mặt";
                    _orderRepo.AddToHistory(new BarOrderHistoryItem
                    {
                        OrderId = table.TableName,
                        CustomerName = !string.IsNullOrWhiteSpace(table.CustomerName) ? table.CustomerName : "Khách vãng lai",
                        CustomerPhone = table.CustomerPhone ?? "",
                        OrderType = OrderType.Pickup,
                        OrderTypeLabel = "Tại bàn",
                        OrderTime = table.OccupiedTime ?? DateTime.Now.AddMinutes(-30),
                        ClosedAt = DateTime.Now,
                        FinalStatus = BarOnlineOrderStatus.Completed,
                        TotalAmount = request.TotalAmount,
                        DiscountAmount = request.DiscountAmount,
                        FinalAmount = request.FinalAmount > 0 ? request.FinalAmount : request.TotalAmount - request.DiscountAmount,
                        PaymentMethod = payLabel,
                        ItemCount = table.ItemCount,
                        TableOrOrderId = table.TableName,
                        Items = table.Items.Select(i => new BarHistoryItemDetail
                        {
                            ProductName = i.ProductName,
                            SizeName = i.SelectedSize?.Name ?? "",
                            ToppingName = i.SelectedToppings?.FirstOrDefault()?.Name ?? "",
                            Quantity = i.Quantity,
                            SubTotal = i.SubTotal
                        }).ToList()
                    });
                }
                _tableRepo.ResetTable(request.TargetId);
            }
            else if (request.TargetType == "online" || request.TargetType == "pickup" || request.TargetType == "delivery")
            {
                // Ghi lịch sử cho đơn online
                var order = _orderRepo.GetOnlineOrderById(request.TargetId);
                if (order != null)
                {
                    var payMethod = request.PaymentMethod ?? "cash";
                    var payLabel = payMethod == "qr" ? "Chuyển khoản QR"
                                 : payMethod == "card" ? "Thẻ"
                                 : "Tiền mặt";
                    var orderTypeLabel = order.OrderType == OrderType.Delivery ? "Giao tận nơi"
                                       : order.OrderType == OrderType.Pickup ? "Đến lấy / Mang đi"
                                       : "Tại quầy";
                    _orderRepo.AddToHistory(new BarOrderHistoryItem
                    {
                        OrderId = order.OrderId,
                        CustomerName = order.CustomerName,
                        CustomerPhone = order.CustomerPhone,
                        OrderType = order.OrderType,
                        OrderTypeLabel = orderTypeLabel,
                        OrderTime = order.OrderTime,
                        ClosedAt = DateTime.Now,
                        FinalStatus = BarOnlineOrderStatus.Completed,
                        TotalAmount = request.TotalAmount > 0 ? request.TotalAmount : order.TotalAmount,
                        DiscountAmount = request.DiscountAmount,
                        FinalAmount = request.FinalAmount > 0 ? request.FinalAmount : order.TotalAmount - request.DiscountAmount,
                        PaymentMethod = payLabel,
                        ItemCount = order.ItemCount,
                        TableOrOrderId = order.OrderId,
                        Items = order.Items.Select(i => new BarHistoryItemDetail
                        {
                            ProductName = i.ProductName,
                            SizeName = i.SelectedSize?.Name ?? "",
                            ToppingName = i.SelectedToppings?.FirstOrDefault()?.Name ?? "",
                            Quantity = i.Quantity,
                            SubTotal = i.SubTotal
                        }).ToList()
                    });
                }
                _orderRepo.UpdateOnlineOrderStatus(request.TargetId, BarOnlineOrderStatus.Completed);
            }

            // Ghi nhận tăng lượt dùng voucher nếu có áp dụng
            if (request.DiscountAmount > 0 && !string.IsNullOrWhiteSpace(request.Notes) && request.Notes.StartsWith("Voucher:"))
            {
                var code = request.Notes.Replace("Voucher:", "").Trim();
                _voucherRepo.UpdateUsage(code);
            }

            return true;
        }

        public BarSaveOrderResult SaveBarOrder(BarSaveOrderRequest request)
        {
            if (request == null || request.Items == null || request.Items.Count == 0)
            {
                return new BarSaveOrderResult
                {
                    Success = false,
                    Message = "Đơn hàng chưa có món nào để lưu!"
                };
            }

            if (request.TargetType == "table")
            {
                _tableRepo.SaveTableOrder(request.TargetId, request.Items, 1, request.CustomerName, request.CustomerPhone, request.CustomerNote);
                return new BarSaveOrderResult
                {
                    Success = true,
                    Message = $"Đã lưu đơn thành công cho {request.TargetId}!",
                    TargetType = "table",
                    TargetId = request.TargetId,
                    DisplayTitle = request.TargetId
                };
            }
            else
            {
                // Xử lý đơn mang đi / Đơn online
                var isNewTakeaway = string.IsNullOrWhiteSpace(request.TargetId) || 
                                    request.TargetId.Equals("TAKEAWAY", StringComparison.OrdinalIgnoreCase);

                if (isNewTakeaway)
                {
                    var randomCode = new Random().Next(100, 999);
                    var orderId = $"#MD-{DateTime.Now:HHmm}-{randomCode}";

                    var newOrder = new BarOnlineOrderItem
                    {
                        OrderId = orderId,
                        CustomerName = string.IsNullOrWhiteSpace(request.CustomerName) ? "Khách mang đi" : request.CustomerName.Trim(),
                        CustomerPhone = request.CustomerPhone?.Trim() ?? string.Empty,
                        CustomerNote = request.CustomerNote?.Trim() ?? string.Empty,
                        OrderType = OrderType.Pickup,
                        DeliveryAddress = "Đến lấy / Mang đi tại quầy",
                        OrderTime = DateTime.Now,
                        Status = BarOnlineOrderStatus.Pending,
                        Items = request.Items
                    };

                    _orderRepo.AddOnlineOrder(newOrder);

                    return new BarSaveOrderResult
                    {
                        Success = true,
                        Message = $"Đã tạo và lưu đơn mang đi {orderId} thành công!",
                        TargetType = "pickup",
                        TargetId = orderId,
                        DisplayTitle = $"Đến Lấy {orderId}"
                    };
                }
                else
                {
                    var existingOrder = _orderRepo.GetOnlineOrderById(request.TargetId);
                    if (existingOrder != null)
                    {
                        existingOrder.Items = request.Items;
                        if (!string.IsNullOrWhiteSpace(request.CustomerName)) existingOrder.CustomerName = request.CustomerName.Trim();
                        if (!string.IsNullOrWhiteSpace(request.CustomerPhone)) existingOrder.CustomerPhone = request.CustomerPhone.Trim();
                        if (!string.IsNullOrWhiteSpace(request.CustomerNote)) existingOrder.CustomerNote = request.CustomerNote.Trim();

                        return new BarSaveOrderResult
                        {
                            Success = true,
                            Message = $"Đã cập nhật đơn {request.TargetId} thành công!",
                            TargetType = request.TargetType,
                            TargetId = request.TargetId,
                            DisplayTitle = request.TargetId
                        };
                    }
                    else
                    {
                        return new BarSaveOrderResult
                        {
                            Success = false,
                            Message = $"Không tìm thấy đơn hàng {request.TargetId} để cập nhật."
                        };
                    }
                }
            }
        }

        public bool UpdateOnlineOrderStatus(string orderId, BarOnlineOrderStatus status)
        {
            _orderRepo.UpdateOnlineOrderStatus(orderId, status);
            return true;
        }

        public List<BarOrderHistoryItem> GetOrderHistory()
        {
            return _orderRepo.GetOrderHistory();
        }

        public bool CancelOnlineOrder(string orderId, string reason)
        {
            if (string.IsNullOrWhiteSpace(orderId))
                return false;
            return _orderRepo.CancelOnlineOrder(orderId, reason?.Trim() ?? string.Empty);
        }

        public CustomerLookupResult FindCustomerByPhone(string phone)
        {
            if (string.IsNullOrWhiteSpace(phone))
            {
                return new CustomerLookupResult { Found = false };
            }

            var cleanPhone = new string(phone.Where(char.IsDigit).ToArray());
            if (cleanPhone.Length < 4)
            {
                return new CustomerLookupResult { Found = false };
            }

            // 1. Tìm trong danh sách đơn Online
            var orders = _orderRepo.GetOnlineOrders();
            var matchedOrder = orders.FirstOrDefault(o =>
                !string.IsNullOrWhiteSpace(o.CustomerPhone) &&
                new string(o.CustomerPhone.Where(char.IsDigit).ToArray()).EndsWith(cleanPhone));

            if (matchedOrder != null)
            {
                return new CustomerLookupResult
                {
                    Found = true,
                    CustomerPhone = matchedOrder.CustomerPhone,
                    CustomerName = matchedOrder.CustomerName,
                    CustomerNote = matchedOrder.CustomerNote,
                    MemberTier = "Khách thân thiết",
                    TotalOrders = 5,
                    LastOrderSummary = $"Đơn gần nhất: {matchedOrder.OrderId}"
                };
            }

            // 2. Tìm trong danh sách bàn hiện tại
            var tables = _tableRepo.GetAll();
            var matchedTable = tables.FirstOrDefault(t =>
                !string.IsNullOrWhiteSpace(t.CustomerPhone) &&
                new string(t.CustomerPhone.Where(char.IsDigit).ToArray()).EndsWith(cleanPhone));

            if (matchedTable != null)
            {
                return new CustomerLookupResult
                {
                    Found = true,
                    CustomerPhone = matchedTable.CustomerPhone,
                    CustomerName = matchedTable.CustomerName,
                    CustomerNote = matchedTable.CustomerNote,
                    MemberTier = "Thành viên",
                    TotalOrders = 3,
                    LastOrderSummary = $"Đang ngồi tại {matchedTable.TableName}"
                };
            }

            // 3. Khách hàng mẫu phổ biến
            var sampleCustomers = new List<(string Phone, string Name, string Tier, int Orders)>
            {
                ("0988123456", "Nguyễn Văn An", "Khách VIP Kim Cương", 24),
                ("0909888999", "Trần Thị Mai", "Khách VIP Vàng", 12),
                ("0977654321", "Lê Hoàng Nam", "Khách Thân Thiết", 8),
                ("0912345678", "Hoàng Nam", "Thành Viên", 3),
                ("0933456789", "Thu Trang", "Thành Viên Bạc", 5)
            };

            var sample = sampleCustomers.FirstOrDefault(s => s.Phone.EndsWith(cleanPhone) || cleanPhone.EndsWith(s.Phone));
            if (sample != default)
            {
                return new CustomerLookupResult
                {
                    Found = true,
                    CustomerPhone = sample.Phone,
                    CustomerName = sample.Name,
                    MemberTier = sample.Tier,
                    TotalOrders = sample.Orders,
                    LastOrderSummary = $"Tích lũy {sample.Orders * 10} điểm"
                };
            }

            return new CustomerLookupResult { Found = false, CustomerPhone = phone };
        }

        // =====================================================================
        // PRODUCT MANAGEMENT METHODS
        // =====================================================================

        public ProductManagementIndexViewModel GetProductManagementViewModel()
        {
            var products = _productRepo.GetAllForManagement();
            var categories = _categoryRepo.GetAll();
            var vouchers = _voucherRepo.GetAll(includeInactive: true);
            var toppings = _productRepo.GetToppings();
            var sizes = _productRepo.GetSizes();

            var catCountDict = categories.ToDictionary(c => c.Id, c => products.Count(p => p.CategoryId == c.Id));

            var activeProds = products.Where(p => p.IsAvailable).ToList();
            var kpi = new ProductManagementKpiSummary
            {
                TotalProducts = products.Count,
                ActiveProducts = products.Count(p => p.IsAvailable),
                InactiveProducts = products.Count(p => !p.IsAvailable),
                TotalCategories = categories.Count,
                TotalToppings = toppings.Count,
                TotalVouchers = vouchers.Count,
                ActiveVouchers = vouchers.Count(v => v.IsCurrentlyValid),
                AverageCostPrice = activeProds.Any() ? System.Math.Round(activeProds.Average(p => p.CostPrice), 0) : 0,
                AverageSellingPrice = activeProds.Any() ? System.Math.Round(activeProds.Average(p => p.EffectivePrice), 0) : 0,
                AverageProfitPerUnit = activeProds.Any() ? System.Math.Round(activeProds.Average(p => p.ProfitPerUnit), 0) : 0,
                AverageMarginPercent = activeProds.Any() ? System.Math.Round(activeProds.Average(p => p.ProfitMarginPercent), 1) : 0,
                TopMarginProductName = activeProds.Any() ? activeProds.OrderByDescending(p => p.ProfitMarginPercent).First().Name : "",
                TopMarginPercent = activeProds.Any() ? activeProds.Max(p => p.ProfitMarginPercent) : 0,
                LowestCostProductName = activeProds.Any() ? activeProds.OrderBy(p => p.CostPrice).First().Name : "",
                LowestCostPrice = activeProds.Any() ? activeProds.Min(p => p.CostPrice) : 0,
            };

            return new ProductManagementIndexViewModel
            {
                Products = products,
                Categories = categories,
                Vouchers = vouchers,
                PriceHistories = GetPriceHistories(),
                MasterToppings = toppings,
                MasterSizes = sizes,
                Kpi = kpi,
                CategoryProductCount = catCountDict
            };
        }

        // --- Category CRUD ---
        public void SaveCategory(CategorySaveDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Slug))
                dto.Slug = dto.Name.ToLower().Replace(" ", "-");

            if (dto.Id == 0)
            {
                _categoryRepo.Add(new Category
                {
                    Name = dto.Name, Icon = dto.Icon, Slug = dto.Slug,
                    DisplayOrder = dto.DisplayOrder, Description = dto.Description
                });
            }
            else
            {
                _categoryRepo.Update(new Category
                {
                    Id = dto.Id, Name = dto.Name, Icon = dto.Icon, Slug = dto.Slug,
                    DisplayOrder = dto.DisplayOrder, Description = dto.Description
                });
            }
        }
        public void DeleteCategory(int id) => _categoryRepo.Delete(id);

        // --- Topping CRUD ---
        public ToppingOption? GetToppingById(int id) => _productRepo.GetToppingById(id);

        public void SaveTopping(ToppingSaveDto dto)
        {
            if (dto.Id == 0)
            {
                _productRepo.AddTopping(new ToppingOption
                {
                    Name = dto.Name,
                    Price = dto.Price
                });
            }
            else
            {
                _productRepo.UpdateTopping(new ToppingOption
                {
                    Id = dto.Id,
                    Name = dto.Name,
                    Price = dto.Price
                });
            }
        }

        public void DeleteTopping(int id) => _productRepo.DeleteTopping(id);

        // --- Product CRUD + Price History ---
        public void SaveProduct(ProductSaveDto dto)
        {
            var category = _categoryRepo.GetById(dto.CategoryId);
            var allSizes = _productRepo.GetSizes();
            var allToppings = _productRepo.GetToppings();

            var sizes = dto.SelectedSizeCodes != null && dto.SelectedSizeCodes.Any()
                ? allSizes.Where(s => dto.SelectedSizeCodes.Contains(s.Code)).ToList()
                : allSizes;
            var toppings = dto.SelectedToppingIds != null && dto.SelectedToppingIds.Any()
                ? allToppings.Where(t => dto.SelectedToppingIds.Contains(t.Id)).ToList()
                : new System.Collections.Generic.List<ToppingOption>();

            if (dto.Id == 0)
            {
                _productRepo.Add(new Product
                {
                    Name = dto.Name, CategoryId = dto.CategoryId,
                    CategoryName = category?.Name ?? "",
                    Description = dto.Description, BasePrice = dto.BasePrice,
                    PromoPrice = dto.PromoPrice, CostPrice = dto.CostPrice,
                    ImageUrl = dto.ImageUrl, Badge = dto.Badge,
                    IsAvailable = dto.IsAvailable,
                    AvailableSizes = sizes, AvailableToppings = toppings
                });
            }
            else
            {
                var existing = _productRepo.GetById(dto.Id);
                if (existing != null)
                {
                    // Nếu có thay đổi giá, ghi lịch sử trước khi update
                    if (existing.BasePrice != dto.BasePrice || existing.CostPrice != dto.CostPrice || existing.PromoPrice != dto.PromoPrice)
                    {
                        _priceHistoryStore.Add(new ProductPriceHistory
                        {
                            Id = _priceHistoryStore.Any() ? _priceHistoryStore.Max(h => h.Id) + 1 : 1,
                            ProductId = existing.Id, ProductName = existing.Name,
                            OldCostPrice = existing.CostPrice, NewCostPrice = dto.CostPrice,
                            OldBasePrice = existing.BasePrice, NewBasePrice = dto.BasePrice,
                            OldPromoPrice = existing.PromoPrice, NewPromoPrice = dto.PromoPrice,
                            ChangedAt = DateTime.Now,
                            Reason = dto.ChangeReason ?? "Cập nhật từ trang quản lý"
                        });
                    }

                    _productRepo.Update(new Product
                    {
                        Id = dto.Id, Name = dto.Name, CategoryId = dto.CategoryId,
                        CategoryName = category?.Name ?? "",
                        Description = dto.Description, BasePrice = dto.BasePrice,
                        PromoPrice = dto.PromoPrice, CostPrice = dto.CostPrice,
                        ImageUrl = dto.ImageUrl, Badge = dto.Badge,
                        IsAvailable = dto.IsAvailable,
                        AvailableSizes = sizes, AvailableToppings = toppings
                    });
                }
            }
        }

        public void DeleteProduct(int id) => _productRepo.Delete(id);
        public void ToggleProductStatus(int id) => _productRepo.ToggleAvailability(id);

        public void QuickUpdatePrice(QuickPriceUpdateDto dto)
        {
            var existing = _productRepo.GetById(dto.ProductId);
            if (existing == null) return;

            if (existing.BasePrice != dto.BasePrice || existing.CostPrice != dto.CostPrice || existing.PromoPrice != dto.PromoPrice)
            {
                _priceHistoryStore.Add(new ProductPriceHistory
                {
                    Id = _priceHistoryStore.Any() ? _priceHistoryStore.Max(h => h.Id) + 1 : 1,
                    ProductId = existing.Id, ProductName = existing.Name,
                    OldCostPrice = existing.CostPrice, NewCostPrice = dto.CostPrice,
                    OldBasePrice = existing.BasePrice, NewBasePrice = dto.BasePrice,
                    OldPromoPrice = existing.PromoPrice, NewPromoPrice = dto.PromoPrice,
                    ChangedAt = DateTime.Now, Reason = dto.Reason
                });
                existing.BasePrice = dto.BasePrice;
                existing.CostPrice = dto.CostPrice;
                existing.PromoPrice = dto.PromoPrice;
            }
        }

        public List<ProductPriceHistory> GetPriceHistories(int productId = 0)
        {
            var query = _priceHistoryStore.AsQueryable();
            if (productId > 0) query = query.Where(h => h.ProductId == productId);
            return query.OrderByDescending(h => h.ChangedAt).ToList();
        }

        // --- Voucher CRUD ---
        public List<Voucher> GetAllVouchers() => _voucherRepo.GetAll(includeInactive: true);

        public void SaveVoucher(VoucherSaveDto dto)
        {
            var voucher = new Voucher
            {
                Id = dto.Id, Code = dto.Code.ToUpperInvariant(), Name = dto.Name,
                Description = dto.Description,
                DiscountType = (VoucherDiscountType)dto.DiscountType,
                DiscountValue = dto.DiscountValue, MinOrderAmount = dto.MinOrderAmount,
                MaxDiscountAmount = dto.MaxDiscountAmount,
                StartDate = dto.StartDate, EndDate = dto.EndDate,
                IsActive = dto.IsActive, UsageLimit = dto.UsageLimit
            };
            if (dto.Id == 0) _voucherRepo.Add(voucher);
            else _voucherRepo.Update(voucher);
        }

        public void DeleteVoucher(int id) => _voucherRepo.Delete(id);
        public void ToggleVoucherStatus(int id) => _voucherRepo.ToggleStatus(id);

        // =====================================================================
        // AUTHENTICATION & USER MANAGEMENT
        // =====================================================================
        public AppUser? AuthenticateUser(string username, string password)
        {
            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
                return null;

            var u = username.Trim().ToLowerInvariant();
            var p = password.Trim();

            var user = _context.Users.FirstOrDefault(x => 
                (x.Username.ToLower() == u || x.Email.ToLower() == u) && x.IsActive);

            if (user == null) return null;

            // Kiểm tra mật khẩu (hỗ trợ mật khẩu lưu trữ, hoặc các pass demo phổ biến: 123, 123456, admin123)
            bool isValid = (user.Password == p) || 
                           (p == "123") || 
                           (p == "123456") || 
                           (user.Role == "Admin" && p == "admin123");

            return isValid ? user : null;
        }

        public List<AppUser> GetAllUsers()
        {
            return _context.Users.Where(u => u.IsActive).ToList();
        }

        // Private price history in-memory store (injected via context)
        private List<ProductPriceHistory> _priceHistoryStore
        {
            get => _context.PriceHistories;
        }
    }
}
