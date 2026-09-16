using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace E_Coffee.Models
{
    // =====================================================================
    // VIEW MODELS – Quản lý Tài khoản & Trụ sở (chỉ Admin)
    // =====================================================================

    public class UserManagementIndexViewModel
    {
        public List<AppUser> Users { get; set; } = new();
        public List<Branch> Branches { get; set; } = new();
        public string ActiveTab { get; set; } = "accounts"; // "accounts" | "branches"
    }

    // --- User CRUD DTOs ---
    public class UserSaveDto
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "Vui lòng nhập tên đăng nhập")]
        [StringLength(50, MinimumLength = 3, ErrorMessage = "Tên đăng nhập 3–50 ký tự")]
        public string Username { get; set; } = string.Empty;

        [StringLength(100, MinimumLength = 4, ErrorMessage = "Mật khẩu ít nhất 4 ký tự")]
        public string? Password { get; set; }   // null = không đổi mật khẩu

        [Required(ErrorMessage = "Vui lòng nhập họ tên")]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng chọn vai trò")]
        public string Role { get; set; } = "Staff";

        public string RoleDisplayName { get; set; } = string.Empty;

        [EmailAddress(ErrorMessage = "Email không hợp lệ")]
        public string Email { get; set; } = string.Empty;

        public string Phone { get; set; } = string.Empty;

        /// <summary>null = Admin – xem được tất cả trụ sở</summary>
        public int? BranchId { get; set; }

        public bool IsActive { get; set; } = true;
    }

    // --- Branch CRUD DTOs ---
    public class BranchSaveDto
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "Vui lòng nhập tên trụ sở")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng nhập tên rút gọn")]
        public string ShortName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng nhập địa chỉ")]
        public string Address { get; set; } = string.Empty;

        public string District { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;

        public double Lat { get; set; }
        public double Lng { get; set; }

        public string Phone { get; set; } = string.Empty;
        public string OpenHours { get; set; } = "06:30 – 22:00";
        public bool IsActive { get; set; } = true;
    }

    // --- Simple result wrapper ---
    public class AjaxResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public object? Data { get; set; }
    }
}
