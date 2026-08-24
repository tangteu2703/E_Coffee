using Microsoft.AspNetCore.Mvc;
using E_Coffee.Models;
using E_Coffee.Services;

namespace E_Coffee.Controllers
{
    public class OrderController : Controller
    {
        private readonly ICoffeeCatalogService _catalogService;

        public OrderController(ICoffeeCatalogService catalogService)
        {
            _catalogService = catalogService;
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
        public IActionResult GetProductDetail(int id)
        {
            var product = _catalogService.GetProductById(id);
            if (product == null)
            {
                return NotFound(new { message = "Không tìm thấy sản phẩm" });
            }
            return Json(product);
        }
    }
}
