using System.Collections.Generic;
using E_Coffee.Models;

namespace E_Coffee.Services
{
    public interface ICoffeeCatalogService
    {
        // === Existing POS / Bar Methods ===
        List<Category> GetCategories();
        List<Branch> GetBranches();
        List<Product> GetProducts(int categoryId = 0, string searchQuery = "");

        /// <summary>
        /// Lấy danh sách sản phẩm đã áp giá trụ sở (BranchProductPrice override).
        /// branchId = null → trả giá global (Product.BasePrice/PromoPrice).
        /// branchId = X    → apply override từ BranchProductPrices nếu có.
        /// </summary>
        List<Product> GetProductsWithBranchPrice(int? branchId, int categoryId = 0, string searchQuery = "");
        Product? GetProductById(int id);
        List<ToppingOption> GetGlobalToppings();
        List<SizeOption> GetGlobalSizes();
        List<BarTableItem> GetBarTables(int? branchId = null);
        List<BarOnlineOrderItem> GetBarOnlineOrders(int? branchId = null);
        VoucherValidationResult ValidateVoucher(string code, decimal orderAmount);
        List<Voucher> GetActiveVouchers();
        bool CheckoutBarOrder(BarCheckoutRequest request);
        BarSaveOrderResult SaveBarOrder(BarSaveOrderRequest request);
        bool UpdateOnlineOrderStatus(string orderId, BarOnlineOrderStatus status);
        CustomerLookupResult FindCustomerByPhone(string phone);
        List<BarOrderHistoryItem> GetOrderHistory(int? branchId = null);
        bool CancelOnlineOrder(string orderId, string reason);
        BarOnlineOrderItem PlaceOnlineOrder(OnlinePlaceOrderRequest request);
        Branch? GetBranchById(int id);

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
        /// <summary>
        /// Lọc voucher theo trụ sở:
        ///   branchId = null → Admin xem tất cả (global + mọi branch)
        ///   branchId = X    → Voucher global (BranchId=null) + voucher trụ sở X
        /// </summary>
        List<Voucher> GetVouchersByBranch(int? branchId);

        // === Branch Price Override ===
        /// <summary>Lấy danh sách giá override theo trụ sở.</summary>
        List<BranchProductPrice> GetBranchProductPrices(int branchId);

        /// <summary>Upsert giá override cho 1 sản phẩm tại 1 trụ sở.</summary>
        void SaveBranchProductPrice(BranchProductPriceSaveDto dto);

        /// <summary>
        /// Xoá giá override → trả về giá global.
        /// </summary>
        void DeleteBranchProductPrice(int branchId, int productId);


        // User Authentication
        AppUser? AuthenticateUser(string username, string password);
        List<AppUser> GetAllUsers();
    }
}
