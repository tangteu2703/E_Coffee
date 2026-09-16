using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using E_Coffee.Models;
using E_Coffee.Services;

namespace E_Coffee.Controllers
{
    /// <summary>
    /// Quản lý Tài khoản &amp; Trụ sở – chỉ Admin mới được truy cập.
    /// Route: /UserManagement
    /// </summary>
    [Authorize(Roles = "Admin")]
    public class UserManagementController : Controller
    {
        private readonly ICoffeeCatalogService _catalogService;

        public UserManagementController(ICoffeeCatalogService catalogService)
        {
            _catalogService = catalogService;
        }

        // =====================================================================
        // GET: /UserManagement  (mặc định tab Tài khoản)
        // GET: /UserManagement?tab=branches
        // =====================================================================
        [HttpGet]
        public IActionResult Index(string? tab)
        {
            var vm = _catalogService.GetUserManagementViewModel();
            vm.ActiveTab = tab == "branches" ? "branches" : "accounts";
            ViewData["Title"] = "Quản Lý Tài Khoản & Trụ Sở";
            return View(vm);
        }

        // =====================================================================
        // USER API (AJAX JSON)
        // =====================================================================

        [HttpGet]
        public IActionResult GetUser(int id)
        {
            var user = _catalogService.GetUserById(id);
            if (user == null)
                return Json(new AjaxResult { Success = false, Message = "Không tìm thấy tài khoản" });
            return Json(new AjaxResult { Success = true, Data = user });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult SaveUser([FromBody] UserSaveDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .FirstOrDefault() ?? "Dữ liệu không hợp lệ";
                return Json(new AjaxResult { Success = false, Message = errors });
            }

            var (success, message) = _catalogService.SaveUser(dto);
            return Json(new AjaxResult { Success = success, Message = message });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult DeleteUser([FromBody] IdRequest req)
        {
            var (success, message) = _catalogService.DeleteUser(req.Id);
            return Json(new AjaxResult { Success = success, Message = message });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult ToggleUserStatus([FromBody] IdRequest req)
        {
            var (success, message) = _catalogService.ToggleUserStatus(req.Id);
            return Json(new AjaxResult { Success = success, Message = message });
        }

        // =====================================================================
        // BRANCH API (AJAX JSON)
        // =====================================================================

        [HttpGet]
        public IActionResult GetBranch(int id)
        {
            var branch = _catalogService.GetBranchById(id);
            if (branch == null)
                return Json(new AjaxResult { Success = false, Message = "Không tìm thấy trụ sở" });
            return Json(new AjaxResult { Success = true, Data = branch });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult SaveBranch([FromBody] BranchSaveDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .FirstOrDefault() ?? "Dữ liệu không hợp lệ";
                return Json(new AjaxResult { Success = false, Message = errors });
            }

            var (success, message) = _catalogService.SaveBranch(dto);
            return Json(new AjaxResult { Success = success, Message = message });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult DeleteBranch([FromBody] IdRequest req)
        {
            var (success, message) = _catalogService.DeleteBranch(req.Id);
            return Json(new AjaxResult { Success = success, Message = message });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult ToggleBranchStatus([FromBody] IdRequest req)
        {
            var (success, message) = _catalogService.ToggleBranchStatus(req.Id);
            return Json(new AjaxResult { Success = success, Message = message });
        }
    }

}
