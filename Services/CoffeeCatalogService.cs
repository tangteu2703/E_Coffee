using System;
using System.Collections.Generic;
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

        public CoffeeCatalogService(
            ICategoryRepository categoryRepo,
            IProductRepository productRepo,
            IVoucherRepository voucherRepo,
            ITableRepository tableRepo,
            IOrderRepository orderRepo)
        {
            _categoryRepo = categoryRepo;
            _productRepo = productRepo;
            _voucherRepo = voucherRepo;
            _tableRepo = tableRepo;
            _orderRepo = orderRepo;
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
                _tableRepo.ResetTable(request.TargetId);
            }
            else if (request.TargetType == "online" || request.TargetType == "pickup" || request.TargetType == "delivery")
            {
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
    }
}
