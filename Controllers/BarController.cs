using Microsoft.AspNetCore.Mvc;
using E_Coffee.Models;
using E_Coffee.Services;

namespace E_Coffee.Controllers
{
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
            var categories = _catalogService.GetCategories();
            var products = _catalogService.GetProducts();
            var tables = _catalogService.GetBarTables();
            var onlineOrders = _catalogService.GetBarOnlineOrders();

            var vm = new BarPageViewModel
            {
                Categories = categories,
                Products = products,
                Tables = tables,
                OnlineOrders = onlineOrders
            };

            return View(vm);
        }

        [HttpGet]
        public IActionResult GetTables()
        {
            var tables = _catalogService.GetBarTables();
            return Json(tables);
        }

        [HttpGet]
        public IActionResult GetOnlineOrders()
        {
            var onlineOrders = _catalogService.GetBarOnlineOrders();
            return Json(onlineOrders);
        }

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
    }
}
