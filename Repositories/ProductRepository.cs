using System.Collections.Generic;
using System.Linq;
using E_Coffee.Data;
using E_Coffee.Models;

namespace E_Coffee.Repositories
{
    public class ProductRepository : IProductRepository
    {
        private readonly MockDbContext _context;
        public ProductRepository(MockDbContext context) => _context = context;

        public List<Product> GetAll(int categoryId = 0, string searchQuery = "", bool includeUnavailable = false)
        {
            var query = _context.Products.AsQueryable();
            if (!includeUnavailable) query = query.Where(p => p.IsAvailable);
            if (categoryId > 0) query = query.Where(p => p.CategoryId == categoryId);
            if (!string.IsNullOrWhiteSpace(searchQuery))
            {
                var kw = searchQuery.Trim().ToLower();
                query = query.Where(p => p.Name.ToLower().Contains(kw) || p.Description.ToLower().Contains(kw));
            }
            return query.ToList();
        }

        public List<Product> GetAllForManagement() => _context.Products.OrderBy(p => p.CategoryId).ThenBy(p => p.Name).ToList();

        public Product? GetById(int id) => _context.Products.FirstOrDefault(p => p.Id == id);
        public List<ToppingOption> GetToppings() => _context.Toppings;
        public ToppingOption? GetToppingById(int id) => _context.Toppings.FirstOrDefault(t => t.Id == id);

        public void AddTopping(ToppingOption topping)
        {
            topping.Id = _context.Toppings.Any() ? _context.Toppings.Max(t => t.Id) + 1 : 101;
            _context.Toppings.Add(topping);
        }

        public void UpdateTopping(ToppingOption topping)
        {
            var existing = GetToppingById(topping.Id);
            if (existing == null) return;
            existing.Name = topping.Name;
            existing.Price = topping.Price;
        }

        public void DeleteTopping(int id)
        {
            var existing = GetToppingById(id);
            if (existing != null) _context.Toppings.Remove(existing);
        }

        public List<SizeOption> GetSizes() => _context.Sizes;

        public void Add(Product product)
        {
            product.Id = _context.Products.Any() ? _context.Products.Max(p => p.Id) + 1 : 1;
            _context.Products.Add(product);
        }

        public void Update(Product product)
        {
            var existing = GetById(product.Id);
            if (existing == null) return;
            existing.Name = product.Name;
            existing.CategoryId = product.CategoryId;
            existing.CategoryName = product.CategoryName;
            existing.Description = product.Description;
            existing.BasePrice = product.BasePrice;
            existing.PromoPrice = product.PromoPrice;
            existing.CostPrice = product.CostPrice;
            existing.ImageUrl = product.ImageUrl;
            existing.Badge = product.Badge;
            existing.IsAvailable = product.IsAvailable;
            existing.AvailableSizes = product.AvailableSizes;
            existing.AvailableToppings = product.AvailableToppings;
        }

        public void Delete(int id)
        {
            var item = GetById(id);
            if (item != null) _context.Products.Remove(item);
        }

        public void ToggleAvailability(int id)
        {
            var item = GetById(id);
            if (item != null) item.IsAvailable = !item.IsAvailable;
        }
    }
}
