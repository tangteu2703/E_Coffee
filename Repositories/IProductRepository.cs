using System.Collections.Generic;
using E_Coffee.Models;

namespace E_Coffee.Repositories
{
    public interface IProductRepository
    {
        List<Product> GetAll(int categoryId = 0, string searchQuery = "", bool includeUnavailable = false);
        List<Product> GetAllForManagement(); // Trả về tất cả kể cả đã ngưng bán
        Product? GetById(int id);
        List<ToppingOption> GetToppings();
        ToppingOption? GetToppingById(int id);
        void AddTopping(ToppingOption topping);
        void UpdateTopping(ToppingOption topping);
        void DeleteTopping(int id);
        List<SizeOption> GetSizes();
        void Add(Product product);
        void Update(Product product);
        void Delete(int id);
        void ToggleAvailability(int id);
    }
}
