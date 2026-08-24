using System.Collections.Generic;

namespace E_Coffee.Models
{
    public class CartItem
    {
        public string CartItemId { get; set; } = System.Guid.NewGuid().ToString("N");
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string ProductImage { get; set; } = string.Empty;
        public SizeOption SelectedSize { get; set; } = new SizeOption();
        public string SugarLevel { get; set; } = "100%";
        public string IceLevel { get; set; } = "100%";
        public List<ToppingOption> SelectedToppings { get; set; } = new();
        public string SpecialNote { get; set; } = string.Empty;
        public decimal UnitBasePrice { get; set; }
        public int Quantity { get; set; } = 1;

        public decimal SingleItemPrice => UnitBasePrice + SelectedSize.ExtraPrice + System.Linq.Enumerable.Sum(SelectedToppings, t => t.Price);
        public decimal SubTotal => SingleItemPrice * Quantity;
    }

    public class OrderViewModel
    {
        public List<Category> Categories { get; set; } = new();
        public List<Product> Products { get; set; } = new();
        public int ActiveCategoryId { get; set; } = 0; // 0 = Tất cả
        public string SearchQuery { get; set; } = string.Empty;
        public OrderModeInfo OrderMode { get; set; } = new();
    }
}
