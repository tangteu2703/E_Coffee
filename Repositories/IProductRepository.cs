using System.Collections.Generic;
using E_Coffee.Models;

namespace E_Coffee.Repositories
{
    public interface IProductRepository
    {
        List<Product> GetAll(int categoryId = 0, string searchQuery = "");
        Product? GetById(int id);
        List<ToppingOption> GetToppings();
        List<SizeOption> GetSizes();
    }
}
