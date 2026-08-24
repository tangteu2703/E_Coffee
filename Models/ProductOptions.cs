namespace E_Coffee.Models
{
    public class ToppingOption
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
    }

    public class SizeOption
    {
        public string Code { get; set; } = "M"; // S, M, L
        public string Name { get; set; } = "Vừa"; // Nhỏ, Vừa, Lớn
        public decimal ExtraPrice { get; set; } // 0, 6000, 10000
    }
}
