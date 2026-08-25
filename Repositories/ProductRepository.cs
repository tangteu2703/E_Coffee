using System.Collections.Generic;
using System.Linq;
using E_Coffee.Data;
using E_Coffee.Models;

namespace E_Coffee.Repositories
{
    public class ProductRepository : IProductRepository
    {
        private readonly MockDbContext _context;

        public ProductRepository(MockDbContext context)
        {
            _context = context;
        }

        public List<Product> GetAll(int categoryId = 0, string searchQuery = "")
        {
            var query = _context.Products.AsQueryable();

            if (categoryId > 0)
            {
                query = query.Where(p => p.CategoryId == categoryId);
            }

            if (!string.IsNullOrWhiteSpace(searchQuery))
            {
                var keyword = searchQuery.Trim().ToLower();
                query = query.Where(p => p.Name.ToLower().Contains(keyword) || p.Description.ToLower().Contains(keyword));
            }

            return query.Where(p => p.IsAvailable).ToList();
        }

        public Product? GetById(int id)
        {
            return _context.Products.FirstOrDefault(p => p.Id == id);
        }

        public List<ToppingOption> GetToppings()
        {
            return _context.Toppings;
        }

        public List<SizeOption> GetSizes()
        {
            return _context.Sizes;
        }
    }
}
