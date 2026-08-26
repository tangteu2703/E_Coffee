using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using E_Coffee.Models;
using E_Coffee.Services;

namespace E_Coffee.Controllers
{
    public class AccountController : Controller
    {
        private readonly ICoffeeCatalogService _catalogService;

        public AccountController(ICoffeeCatalogService catalogService)
        {
            _catalogService = catalogService;
        }

        // =====================================================================
        // GET: /Account/Login
        // =====================================================================
        [HttpGet]
        [AllowAnonymous]
        public IActionResult Login(string? returnUrl = null)
        {
            // Nếu đã đăng nhập rồi thì chuyển hướng vào trang quản trị hoặc returnUrl
            if (User.Identity?.IsAuthenticated == true)
            {
                if (!string.IsNullOrEmpty(returnUrl) && Url.IsLocalUrl(returnUrl))
                {
                    return Redirect(returnUrl);
                }
                return RedirectToAction("Index", "Analytics");
            }

            var model = new LoginViewModel
            {
                ReturnUrl = returnUrl,
                RememberMe = true
            };

            return View(model);
        }

        // =====================================================================
        // POST: /Account/Login
        // =====================================================================
        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Login(LoginViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var user = _catalogService.AuthenticateUser(model.Username, model.Password);
            if (user == null)
            {
                ModelState.AddModelError(string.Empty, "Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng thử lại!");
                return View(model);
            }

            // Tạo danh sách Claims xác thực
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim(ClaimTypes.GivenName, user.FullName),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim("FullName", user.FullName),
                new Claim("RoleDisplayName", user.RoleDisplayName),
                new Claim("Branch", user.Branch),
                new Claim("Avatar", user.Avatar),
                new Claim("Phone", user.Phone)
            };

            var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            var claimsPrincipal = new ClaimsPrincipal(claimsIdentity);

            var authProperties = new AuthenticationProperties
            {
                IsPersistent = model.RememberMe,
                ExpiresUtc = model.RememberMe 
                    ? DateTimeOffset.UtcNow.AddDays(14) 
                    : DateTimeOffset.UtcNow.AddHours(8),
                IssuedUtc = DateTimeOffset.UtcNow
            };

            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                claimsPrincipal,
                authProperties);

            // Kiểm tra returnUrl hợp lệ để chuyển hướng
            if (!string.IsNullOrEmpty(model.ReturnUrl) && Url.IsLocalUrl(model.ReturnUrl))
            {
                return Redirect(model.ReturnUrl);
            }

            // Mặc định chuyển hướng theo vai trò
            if (user.Role == "Staff")
            {
                return RedirectToAction("Index", "Bar");
            }

            return RedirectToAction("Index", "Analytics");
        }

        // =====================================================================
        // GET/POST: /Account/Logout
        // =====================================================================
        [HttpGet]
        [HttpPost]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return RedirectToAction("Login", "Account", new { logout = 1 });
        }

        // =====================================================================
        // GET: /Account/AccessDenied
        // =====================================================================
        [HttpGet]
        public IActionResult AccessDenied()
        {
            return View();
        }
    }
}
