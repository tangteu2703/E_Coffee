using System.Collections.Generic;
using E_Coffee.Models;

namespace E_Coffee.Services
{
    public interface ICoffeeCatalogService
    {
        // === Existing POS / Bar Methods ===
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
        List<BarOrderHistoryItem> GetOrderHistory();
        bool CancelOnlineOrder(string orderId, string reason);

        // === Product Management Methods ===
        ProductManagementIndexViewModel GetProductManagementViewModel();

        // Category CRUD
        void SaveCategory(CategorySaveDto dto);
        void DeleteCategory(int id);

        // Topping CRUD
        ToppingOption? GetToppingById(int id);
        void SaveTopping(ToppingSaveDto dto);
        void DeleteTopping(int id);

        // Product CRUD + Price History
        void SaveProduct(ProductSaveDto dto);
        void DeleteProduct(int id);
        void ToggleProductStatus(int id);
        void QuickUpdatePrice(QuickPriceUpdateDto dto);
        List<ProductPriceHistory> GetPriceHistories(int productId = 0);

        // Voucher CRUD
        void SaveVoucher(VoucherSaveDto dto);
        void DeleteVoucher(int id);
        void ToggleVoucherStatus(int id);
        List<Voucher> GetAllVouchers();

        // User Authentication
        AppUser? AuthenticateUser(string username, string password);
        List<AppUser> GetAllUsers();
    }
}
