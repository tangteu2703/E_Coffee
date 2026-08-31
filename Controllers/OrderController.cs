using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using E_Coffee.Hubs;
using E_Coffee.Models;
using E_Coffee.Services;

namespace E_Coffee.Controllers
{
    public class OrderController : Controller
    {
        private readonly ICoffeeCatalogService _catalogService;
        private readonly IHubContext<OrderHub> _hubContext;

        public OrderController(ICoffeeCatalogService catalogService, IHubContext<OrderHub> hubContext)
        {
            _catalogService = catalogService;
            _hubContext = hubContext;
        }

        // GET: /Order?cat=1&q=phin&table=B05
        public IActionResult Index(int cat = 0, string q = "", string table = "", string mode = "")
        {
            var categories = _catalogService.GetCategories();
            var products = _catalogService.GetProducts(cat, q);

            var orderMode = new OrderModeInfo();
            if (!string.IsNullOrEmpty(table))
            {
                orderMode.Type = OrderType.AtTable;
                orderMode.TableNumber = table.StartsWith("Bàn") ? table : $"Bàn {table}";
            }
            else if (mode == "delivery")
            {
                orderMode.Type = OrderType.Delivery;
            }
            else if (mode == "pickup")
            {
                orderMode.Type = OrderType.Pickup;
            }

            var vm = new OrderViewModel
            {
                Categories = categories,
                Products = products,
                ActiveCategoryId = cat,
                SearchQuery = q,
                OrderMode = orderMode
            };

            return View(vm);
        }

        [HttpGet]
        public IActionResult GetProducts(int categoryId = 0, string search = "")
        {
            var products = _catalogService.GetProducts(categoryId, search);
            return Json(products);
        }

        [HttpGet]
        public IActionResult GetProductDetail(int id)
        {
            var product = _catalogService.GetProductById(id);
            if (product == null)
            {
                return NotFound(new { message = "Không tìm thấy sản phẩm" });
            }
            return Json(product);
        }

        [HttpPost]
        public IActionResult ValidateVoucher([FromBody] VoucherValidationRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Code))
            {
                return BadRequest(new VoucherValidationResult
                {
                    IsValid = false,
                    Message = "Vui lòng nhập mã voucher hợp lệ"
                });
            }

            var result = _catalogService.ValidateVoucher(request.Code, request.OrderAmount);
            if (!result.IsValid)
            {
                return BadRequest(result);
            }
            return Json(result);
        }

        // POST: /Order/PlaceOrder — Khách hàng xác nhận đặt đơn, lưu server + broadcast SignalR
        [HttpPost]
        public async Task<IActionResult> PlaceOrder([FromBody] OnlinePlaceOrderRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.CustomerName))
            {
                return BadRequest(new { success = false, message = "Thông tin đơn hàng không hợp lệ" });
            }

            try
            {
                // Lưu đơn vào hệ thống
                var order = _catalogService.PlaceOnlineOrder(request);

                // Broadcast real-time tới tất cả client Bar qua SignalR
                var payload = new
                {
                    orderId         = order.OrderId,
                    customerName    = order.CustomerName,
                    customerPhone   = order.CustomerPhone,
                    orderType       = order.OrderType.ToString(),    // "Delivery" | "Pickup" | "AtTable"
                    deliveryAddress = order.DeliveryAddress,
                    customerNote    = order.CustomerNote,
                    orderTime       = order.OrderTime.ToString("HH:mm"),
                    totalAmount     = order.TotalAmount,
                    itemCount       = order.ItemCount,
                    status          = (int)order.Status,             // 1 = Pending
                    items = order.Items.Select(i => new
                    {
                        productName = i.ProductName,
                        sizeName    = i.SelectedSize?.Name,
                        quantity    = i.Quantity,
                        unitPrice   = i.SingleItemPrice,
                        subTotal    = i.SubTotal,
                        toppings    = string.Join(", ", i.SelectedToppings.Select(t => t.Name))
                    })
                };

                await _hubContext.Clients.All.SendAsync("NewOrderReceived", payload);

                return Json(new { success = true, orderId = order.OrderId, message = $"Đơn {order.OrderId} đã được gửi tới quầy Bar!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Lỗi xử lý đơn: {ex.Message}" });
            }
        }
    }
}
