using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using E_Coffee.Models;
using E_Coffee.Services;

namespace E_Coffee.Controllers
{
    [Authorize(Roles = "Admin,Manager,Staff")]
    public class BarController : Controller
    {
        private readonly ICoffeeCatalogService _catalogService;

        public BarController(ICoffeeCatalogService catalogService)
        {
            _catalogService = catalogService;
        }

        // GET: /Bar
        public IActionResult Index()
        {
            var isAdmin = User.IsInRole("Admin");

            // Đọc trụ sở đang active từ Session
            // Admin: có thể null (xem tất cả) hoặc đã chọn 1 trụ sở qua SwitchBranch
            // Staff/Manager: luôn có giá trị cố định từ lúc login
            int? activeBranchId = HttpContext.Session.GetInt32("ActiveBranchId");

            var categories    = _catalogService.GetCategories();
            var products      = _catalogService.GetProductsWithBranchPrice(activeBranchId);
            var tables        = _catalogService.GetBarTables(activeBranchId);
            var onlineOrders  = _catalogService.GetBarOnlineOrders(activeBranchId);
            var orderHistory  = _catalogService.GetOrderHistory(activeBranchId);

            // Thông tin trụ sở đang xem
            string activeBranchName = "Tất cả trụ sở";
            if (activeBranchId.HasValue)
            {
                var activeBranch = _catalogService.GetBranchById(activeBranchId.Value);
                activeBranchName = activeBranch?.ShortName ?? activeBranch?.Name ?? "Trụ sở #" + activeBranchId;
            }

            var vm = new BarPageViewModel
            {
                Categories       = categories,
                Products         = products,
                Tables           = tables,
                OnlineOrders     = onlineOrders,
                OrderHistory     = orderHistory,
                ActiveBranchId   = activeBranchId,
                ActiveBranchName = activeBranchName,
                IsAdminView      = isAdmin,
                // Admin mới thấy danh sách để switch; Staff/Manager list rỗng
                AvailableBranches = isAdmin ? _catalogService.GetBranches() : new()
            };

            return View(vm);
        }

        // POST: /Bar/SwitchBranch — Chỉ Admin mới được dùng
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public IActionResult SwitchBranch(int? branchId)
        {
            if (branchId.HasValue && branchId.Value > 0)
                HttpContext.Session.SetInt32("ActiveBranchId", branchId.Value);
            else
                HttpContext.Session.Remove("ActiveBranchId"); // Reset về "Tất cả"

            return RedirectToAction("Index");
        }

        // AJAX API: Lấy danh sách danh mục
        [HttpGet]
        public IActionResult GetCategories()
        {
            var categories = _catalogService.GetCategories();
            return Json(categories);
        }

        // AJAX API: Lấy danh sách sản phẩm theo bộ lọc — áp giá trụ sở đang active
        [HttpGet]
        public IActionResult GetProducts(int categoryId = 0, string search = "")
        {
            int? activeBranchId = HttpContext.Session.GetInt32("ActiveBranchId");
            var products = _catalogService.GetProductsWithBranchPrice(activeBranchId, categoryId, search);
            return Json(products);
        }

        // AJAX API: Lấy chi tiết một sản phẩm (gồm Topping, Size...) — áp giá trụ sở
        [HttpGet]
        public IActionResult GetProductDetail(int id)
        {
            var product = _catalogService.GetProductById(id);
            if (product == null)
            {
                return NotFound(new { success = false, message = "Không tìm thấy sản phẩm" });
            }

            // Apply branch price override nếu đang xem 1 trụ sở cụ thể
            int? activeBranchId = HttpContext.Session.GetInt32("ActiveBranchId");
            if (activeBranchId.HasValue)
            {
                var overrides = _catalogService.GetBranchProductPrices(activeBranchId.Value);
                var ov = overrides.FirstOrDefault(b => b.ProductId == id);
                if (ov != null)
                {
                    product.BasePrice  = ov.BasePrice;
                    product.PromoPrice = ov.PromoPrice;
                }
            }

            return Json(product);
        }

        // AJAX API: Lấy danh sách bàn & trạng thái
        [HttpGet]
        public IActionResult GetTables()
        {
            var tables = _catalogService.GetBarTables();
            return Json(tables);
        }

        // AJAX API: Lấy danh sách đơn online
        [HttpGet]
        public IActionResult GetOnlineOrders()
        {
            var onlineOrders = _catalogService.GetBarOnlineOrders();
            return Json(onlineOrders);
        }

        // AJAX API: Lấy danh sách các voucher đang hoạt động
        [HttpGet]
        public IActionResult GetActiveVouchers()
        {
            var vouchers = _catalogService.GetActiveVouchers();
            return Json(vouchers);
        }

        // AJAX API: Kiểm tra mã voucher từ Database
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

        // AJAX API: Xử lý thanh toán đơn hàng
        [HttpPost]
        public IActionResult Checkout([FromBody] BarCheckoutRequest request)
        {
            if (request == null)
            {
                return BadRequest(new { success = false, message = "Dữ liệu thanh toán không hợp lệ" });
            }

            var success = _catalogService.CheckoutBarOrder(request);
            if (success)
            {
                return Json(new { success = true, message = "Thanh toán & hoàn tất đơn thành công!" });
            }
            return BadRequest(new { success = false, message = "Không thể xử lý thanh toán" });
        }

        // AJAX API: Xử lý lưu đơn hàng (Lưu bàn hoặc Đơn mang đi)
        [HttpPost]
        public IActionResult SaveOrder([FromBody] BarSaveOrderRequest request)
        {
            if (request == null)
            {
                return BadRequest(new { success = false, message = "Dữ liệu đơn hàng không hợp lệ" });
            }

            var result = _catalogService.SaveBarOrder(request);
            if (result.Success)
            {
                return Json(result);
            }
            return BadRequest(result);
        }

        // AJAX API: Xóa trắng hoặc hủy bàn
        [HttpPost]
        public IActionResult ClearTable([FromBody] string tableIdOrName)
        {
            if (string.IsNullOrWhiteSpace(tableIdOrName))
            {
                return BadRequest(new { success = false, message = "Mã bàn không hợp lệ" });
            }

            var success = _catalogService.CheckoutBarOrder(new BarCheckoutRequest
            {
                TargetType = "table",
                TargetId = tableIdOrName
            });

            return Json(new { success = true, message = "Đã dọn bàn thành công" });
        }

        // AJAX API: Cập nhật trạng thái đơn online
        [HttpPost]
        public IActionResult UpdateOrderStatus(string orderId, int status)
        {
            var success = _catalogService.UpdateOnlineOrderStatus(orderId, (BarOnlineOrderStatus)status);
            if (success)
            {
                return Json(new { success = true });
            }
            return BadRequest(new { success = false, message = "Không tìm thấy đơn hàng" });
        }

        // AJAX API: Tìm kiếm thông tin khách hàng qua số điện thoại
        [HttpGet]
        public IActionResult FindCustomer(string phone)
        {
            var customer = _catalogService.FindCustomerByPhone(phone);
            return Json(customer);
        }

        // AJAX API: Lấy lịch sử đơn đã hoàn tất / đã hủy
        [HttpGet]
        public IActionResult GetOrderHistory()
        {
            var history = _catalogService.GetOrderHistory();
            return Json(history);
        }

        // AJAX API: Hủy đơn Online (Delivery/Pickup đang Pending hoặc Preparing)
        [HttpPost]
        public IActionResult CancelOrder([FromBody] BarCancelOrderRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.OrderId))
            {
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ" });
            }

            if (string.IsNullOrWhiteSpace(request.Reason))
            {
                return BadRequest(new { success = false, message = "Vui lòng nhập lý do hủy đơn" });
            }

            var success = _catalogService.CancelOnlineOrder(request.OrderId, request.Reason);
            if (success)
            {
                return Json(new { success = true, message = $"Đã hủy đơn {request.OrderId} thành công" });
            }
            return BadRequest(new { success = false, message = "Không thể hủy đơn. Đơn không tồn tại hoặc đã hoàn tất" });
        }
    }
}
