using System.Collections.Generic;
using System.Linq;
using E_Coffee.Data;
using E_Coffee.Models;

// =====================================================================
// [FAKE - IN-MEMORY] CategoryRepository dùng MockDbContext
// Chuyển lại fake data để chạy local khi chưa kết nối được SQL Server
// Khi có DB thật → uncommment ADO.NET bên dưới và xóa phần fake này
// =====================================================================

namespace E_Coffee.Repositories
{
    /// <summary>
    /// CategoryRepository - Đọc dữ liệu từ MockDbContext (In-Memory fake data).
    /// Dùng tạm khi chưa kết nối được SQL Server.
    /// </summary>
    public class CategoryRepository : ICategoryRepository
    {
        private readonly MockDbContext _context;

        public CategoryRepository(MockDbContext context) => _context = context;

        // ==================================================================
        // GET ALL - Lấy tất cả danh mục, sắp theo DisplayOrder
        // ==================================================================
        public List<Category> GetAll()
        {
            return _context.Categories
                .OrderBy(c => c.DisplayOrder)
                .ToList();
        }

        // ==================================================================
        // GET BY ID
        // ==================================================================
        public Category? GetById(int id)
        {
            return _context.Categories.FirstOrDefault(c => c.Id == id);
        }

        // ==================================================================
        // GET BY SLUG
        // ==================================================================
        public Category? GetBySlug(string slug)
        {
            if (string.IsNullOrWhiteSpace(slug)) return null;
            return _context.Categories.FirstOrDefault(
                c => c.Slug.Equals(slug.Trim().ToLower(), StringComparison.OrdinalIgnoreCase));
        }

        // ==================================================================
        // ADD - Thêm mới một danh mục
        // ==================================================================
        public void Add(Category category)
        {
            category.Id = _context.Categories.Any()
                ? _context.Categories.Max(c => c.Id) + 1
                : 1;
            _context.Categories.Add(category);
        }

        // ==================================================================
        // UPDATE - Cập nhật thông tin danh mục theo Id
        // ==================================================================
        public void Update(Category category)
        {
            var existing = GetById(category.Id);
            if (existing == null) return;
            existing.Name         = category.Name;
            existing.Icon         = category.Icon;
            existing.Slug         = category.Slug;
            existing.DisplayOrder = category.DisplayOrder;
            existing.Description  = category.Description;
        }

        // ==================================================================
        // DELETE - Xóa khỏi in-memory list
        // ==================================================================
        public void Delete(int id)
        {
            var item = GetById(id);
            if (item != null) _context.Categories.Remove(item);
        }
    }
}
