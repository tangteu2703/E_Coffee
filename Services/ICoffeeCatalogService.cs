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
        VoucherValidationResult ValidateVoucher(string code, decimal orderAmount);
        List<Voucher> GetActiveVouchers();
        bool CheckoutBarOrder(BarCheckoutRequest request);
        BarSaveOrderResult SaveBarOrder(BarSaveOrderRequest request);
        bool UpdateOnlineOrderStatus(string orderId, BarOnlineOrderStatus status);
        CustomerLookupResult FindCustomerByPhone(string phone);
    }
}
