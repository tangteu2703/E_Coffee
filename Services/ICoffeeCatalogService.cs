using System.Collections.Generic;
using E_Coffee.Models;

namespace E_Coffee.Services
{
    public interface ICoffeeCatalogService
    {
        List<Category> GetCategories();
        List<Product> GetProducts(int categoryId = 0, string searchQuery = "");
        Product? GetProductById(int id);
        List<ToppingOption> GetGlobalToppings();
        List<SizeOption> GetGlobalSizes();
        List<BarTableItem> GetBarTables();
        List<BarOnlineOrderItem> GetBarOnlineOrders();
        bool CheckoutBarOrder(BarCheckoutRequest request);
        bool UpdateOnlineOrderStatus(string orderId, BarOnlineOrderStatus status);
    }
}
