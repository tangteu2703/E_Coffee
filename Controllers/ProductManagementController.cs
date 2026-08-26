using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using E_Coffee.Models;
using E_Coffee.Services;

namespace E_Coffee.Controllers
{
    [Authorize(Roles = "Admin,Manager")]
    public class ProductManagementController : Controller
    {
        private readonly ICoffeeCatalogService _catalogService;
        private readonly IWebHostEnvironment _webHostEnvironment;

        public ProductManagementController(ICoffeeCatalogService catalogService, IWebHostEnvironment webHostEnvironment)
        {
            _catalogService = catalogService;
            _webHostEnvironment = webHostEnvironment;
        }

        // GET: /ProductManagement
        public IActionResult Index(string tab = "products")
        {
            var vm = _catalogService.GetProductManagementViewModel();
            vm.ActiveTab = tab;
            ViewData["Title"] = "Quản Lý Sản Phẩm & Menu";
            return View(vm);
        }

        // =====================================================================
        // API AJAX – PRODUCT
        // =====================================================================
        [HttpGet]
        public IActionResult GetProductDetail(int id)
        {
            var product = _catalogService.GetProductById(id);
            if (product == null) return NotFound(new { success = false, message = "Không tìm thấy sản phẩm" });
            return Json(new { success = true, data = product });
        }

        [HttpPost]
        public IActionResult SaveProduct([FromBody] ProductSaveDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ" });
            try
            {
                _catalogService.SaveProduct(dto);
                return Json(new { success = true, message = dto.Id == 0 ? "Thêm sản phẩm thành công!" : "Cập nhật sản phẩm thành công!" });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public IActionResult DeleteProduct([FromBody] IdRequest req)
        {
            _catalogService.DeleteProduct(req.Id);
            return Json(new { success = true, message = "Đã xóa sản phẩm" });
        }

        [HttpPost]
        public IActionResult ToggleProductStatus([FromBody] IdRequest req)
        {
            _catalogService.ToggleProductStatus(req.Id);
            var product = _catalogService.GetProductById(req.Id);
            return Json(new { success = true, isAvailable = product?.IsAvailable, message = product?.IsAvailable == true ? "Sản phẩm đang kinh doanh" : "Sản phẩm tạm ngưng" });
        }

        [HttpPost]
        public IActionResult QuickUpdatePrice([FromBody] QuickPriceUpdateDto dto)
        {
            if (dto == null) return BadRequest(new { success = false });
            _catalogService.QuickUpdatePrice(dto);
            return Json(new { success = true, message = "Đã cập nhật giá và lưu lịch sử!" });
        }

        // =====================================================================
        // API AJAX – CATEGORY
        // =====================================================================
        [HttpGet]
        public IActionResult GetCategoryDetail(int id)
        {
            var vm = _catalogService.GetProductManagementViewModel();
            var cat = vm.Categories.FirstOrDefault(c => c.Id == id);
            if (cat == null) return NotFound(new { success = false });
            return Json(new { success = true, data = cat });
        }

        [HttpPost]
        public IActionResult SaveCategory([FromBody] CategorySaveDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { success = false, message = "Tên danh mục không được để trống" });
            _catalogService.SaveCategory(dto);
            return Json(new { success = true, message = dto.Id == 0 ? "Thêm danh mục thành công!" : "Cập nhật danh mục thành công!" });
        }

        [HttpPost]
        public IActionResult DeleteCategory([FromBody] IdRequest req)
        {
            _catalogService.DeleteCategory(req.Id);
            return Json(new { success = true, message = "Đã xóa danh mục" });
        }

        // =====================================================================
        // API AJAX – TOPPING
        // =====================================================================
        [HttpGet]
        public IActionResult GetToppingDetail(int id)
        {
            var topping = _catalogService.GetToppingById(id);
            if (topping == null) return NotFound(new { success = false, message = "Không tìm thấy topping" });
            return Json(new { success = true, data = topping });
        }

        [HttpPost]
        public IActionResult SaveTopping([FromBody] ToppingSaveDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { success = false, message = "Tên topping không được để trống" });
            if (dto.Price < 0)
                return BadRequest(new { success = false, message = "Giá topping không hợp lệ" });

            _catalogService.SaveTopping(dto);
            return Json(new { success = true, message = dto.Id == 0 ? "Thêm topping thành công!" : "Cập nhật topping thành công!" });
        }

        [HttpPost]
        public IActionResult DeleteTopping([FromBody] IdRequest req)
        {
            _catalogService.DeleteTopping(req.Id);
            return Json(new { success = true, message = "Đã xóa topping" });
        }

        // =====================================================================
        // API AJAX – VOUCHER
        // =====================================================================
        [HttpGet]
        public IActionResult GetVoucherDetail(int id)
        {
            var vouchers = _catalogService.GetAllVouchers();
            var voucher = vouchers.FirstOrDefault(v => v.Id == id);
            if (voucher == null) return NotFound(new { success = false });
            return Json(new { success = true, data = voucher });
        }

        [HttpPost]
        public IActionResult SaveVoucher([FromBody] VoucherSaveDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Code))
                return BadRequest(new { success = false, message = "Mã voucher không được để trống" });
            _catalogService.SaveVoucher(dto);
            return Json(new { success = true, message = dto.Id == 0 ? "Thêm voucher thành công!" : "Cập nhật voucher thành công!" });
        }

        [HttpPost]
        public IActionResult DeleteVoucher([FromBody] IdRequest req)
        {
            _catalogService.DeleteVoucher(req.Id);
            return Json(new { success = true, message = "Đã xóa voucher" });
        }

        [HttpPost]
        public IActionResult ToggleVoucherStatus([FromBody] IdRequest req)
        {
            _catalogService.ToggleVoucherStatus(req.Id);
            return Json(new { success = true, message = "Đã cập nhật trạng thái voucher" });
        }

        // =====================================================================
        // API AJAX – PRICE HISTORY
        // =====================================================================
        [HttpGet]
        public IActionResult GetPriceHistory(int productId = 0)
        {
            var histories = _catalogService.GetPriceHistories(productId);
            return Json(new { success = true, data = histories });
        }

        // =====================================================================
        // API AJAX – UPLOAD IMAGE
        // =====================================================================
        [HttpPost]
        public async Task<IActionResult> UploadImage(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { success = false, message = "Vui lòng chọn một file ảnh!" });

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension))
                return BadRequest(new { success = false, message = "Định dạng file không hỗ trợ! Chỉ chấp nhận: .jpg, .jpeg, .png, .webp, .gif, .svg" });

            if (file.Length > 10 * 1024 * 1024)
                return BadRequest(new { success = false, message = "Dung lượng ảnh tối đa 10MB!" });

            try
            {
                var webRoot = _webHostEnvironment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                var imageFolder = Path.Combine(webRoot, "image");
                if (!Directory.Exists(imageFolder))
                {
                    Directory.CreateDirectory(imageFolder);
                }

                // Clean original name or generate unique name
                var baseName = Path.GetFileNameWithoutExtension(file.FileName);
                var safeBaseName = string.Concat(baseName.Where(c => char.IsLetterOrDigit(c) || c == '_' || c == '-'));
                if (string.IsNullOrWhiteSpace(safeBaseName)) safeBaseName = "prod";
                var uniqueFileName = $"{safeBaseName}_{DateTime.Now:yyyyMMddHHmmssfff}{extension}";
                var filePath = Path.Combine(imageFolder, uniqueFileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var relativeUrl = $"/image/{uniqueFileName}";
                return Json(new { success = true, imageUrl = relativeUrl, message = "Tải ảnh lên thành công!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi khi lưu ảnh: " + ex.Message });
            }
        }
    }

    public class IdRequest { public int Id { get; set; } }
}
