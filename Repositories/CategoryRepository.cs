using System.Collections.Generic;
using System.Linq;
using E_Coffee.Data;
using E_Coffee.Models;

namespace E_Coffee.Repositories
{
    public class CategoryRepository : ICategoryRepository
    {
        private readonly MockDbContext _context;

        public CategoryRepository(MockDbContext context)
        {
            _context = context;
        }

        public List<Category> GetAll()
        {
            return _context.Categories
                .OrderBy(c => c.DisplayOrder)
                .ToList();
        }

        public Category? GetById(int id)
        {
            return _context.Categories.FirstOrDefault(c => c.Id == id);
        }

        public Category? GetBySlug(string slug)
        {
            return _context.Categories.FirstOrDefault(c => c.Slug.Equals(slug, System.StringComparison.OrdinalIgnoreCase));
        }
    }
}
