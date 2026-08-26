using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using E_Coffee.Models;
using E_Coffee.Services;
using System;
using System.Collections.Generic;
using System.Linq;

namespace E_Coffee.Controllers
{
    [Authorize(Roles = "Admin,Manager")]
    public class AnalyticsController : Controller
    {
        private readonly ICoffeeCatalogService _catalogService;

        public AnalyticsController(ICoffeeCatalogService catalogService)
        {
            _catalogService = catalogService;
        }

        // ──────────────────────────────────────────────────────────────────────────
        // GET: /Analytics  (trang chính)
        // ──────────────────────────────────────────────────────────────────────────
        public IActionResult Index()
        {
            var toDate   = DateTime.Today;
            var fromDate = toDate.AddDays(-6); // mặc định: 7 ngày gần nhất

            var vm = BuildViewModel(fromDate, toDate, "day", "all");
            vm.FilterFromDate = fromDate.ToString("dd/MM/yyyy");
            vm.FilterToDate   = toDate.ToString("dd/MM/yyyy");
            vm.FilterGroupBy  = "day";
            vm.FilterChannel  = "all";

            return View(vm);
        }

        // ──────────────────────────────────────────────────────────────────────────
        // POST: /Analytics/GetData  (AJAX filter – dùng dữ liệu từ DB)
        // ──────────────────────────────────────────────────────────────────────────
        [HttpPost]
        public IActionResult GetData([FromBody] AnalyticsFilterRequest req)
        {
            if (req == null)
                return BadRequest(new AnalyticsApiResponse { Success = false, Message = "Yêu cầu không hợp lệ" });

            if (!DateTime.TryParseExact(req.FromDate, "dd/MM/yyyy",
                    System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None, out var from))
                from = DateTime.Today.AddDays(-6);

            if (!DateTime.TryParseExact(req.ToDate, "dd/MM/yyyy",
                    System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None, out var to))
                to = DateTime.Today;

            if (from > to) (from, to) = (to, from);

            var vm = BuildViewModel(from, to, req.GroupBy ?? "day", req.Channel ?? "all");

            return Json(new AnalyticsApiResponse
            {
                Success      = true,
                Kpi          = vm.Kpi,
                ChartData    = vm.ChartData,
                CategoryData = vm.CategoryRevenues,
                TopProducts  = vm.TopProducts,
                DetailRows   = vm.DetailRows
            });
        }

        // ══════════════════════════════════════════════════════════════════════════
        // Core builder – lấy sản phẩm thực từ DB, build fake orders theo phân phối
        // ══════════════════════════════════════════════════════════════════════════
        private AnalyticsPageViewModel BuildViewModel(DateTime from, DateTime to, string groupBy, string channel)
        {
            // ── Lấy dữ liệu thực từ MockDbContext (qua service) ─────────────────
            var dbProducts   = _catalogService.GetProducts();
            var dbCategories = _catalogService.GetCategories();

            var rng    = new Random(42); // seed cố định → số nhất quán mỗi lần
            var orders = GenerateMockOrders(from, to, dbProducts, rng);

            // Lọc theo kênh
            if (channel != "all")
                orders = orders.Where(o => o.Channel == channel).ToList();

            var kpi         = BuildKpi(orders, rng);
            var chartData   = BuildChartData(orders, from, to, groupBy);
            var catRevenues = BuildCategoryRevenues(orders, dbCategories);
            var topProducts = BuildTopProducts(orders);
            var detailRows  = BuildDetailRows(orders, from, to, groupBy);

            return new AnalyticsPageViewModel
            {
                Kpi              = kpi,
                ChartData        = chartData,
                CategoryRevenues = catRevenues,
                TopProducts      = topProducts,
                DetailRows       = detailRows
            };
        }

        // ══════════════════════════════════════════════════════════════════════════
        // Mock Order – Dùng Product thực từ DB
        // ══════════════════════════════════════════════════════════════════════════

        private record MockOrder(
            DateTime Date,
            string   Channel,       // "dine_in" | "delivery" | "pickup"
            int      CategoryId,
            string   CategoryName,
            int      ProductId,
            string   ProductName,
            string   ProductImage,
            decimal  UnitPrice,
            int      Qty,
            decimal  Discount
        )
        {
            public decimal GrossRevenue => UnitPrice * Qty;
            public decimal NetRevenue   => GrossRevenue - Discount;
        }

        private List<MockOrder> GenerateMockOrders(DateTime from, DateTime to, List<Product> products, Random rng)
        {
            if (products == null || products.Count == 0)
                return new List<MockOrder>();

            var channels       = new[] { "dine_in", "delivery", "pickup" };
            var channelWeights = new[] { 60, 25, 15 };

            // Trọng số bán chạy: sản phẩm có badge hot/bán chạy/signature bán nhiều hơn
            var weights = products.Select(p => p.Badge is "Bán Chạy" or "Hot" or "Signature" or "Best Seller" or "Hot Trend" ? 18
                                              : p.Badge is "Must Try" or "Yêu Thích" or "Mới" ? 10
                                              : 5).ToArray();

            var orders = new List<MockOrder>();

            for (var d = from.Date; d <= to.Date; d = d.AddDays(1))
            {
                // Số lượng orders/ngày: 45-95, cuối tuần nhiều hơn
                int ordersPerDay = 50 + rng.Next(-20, 45)
                                 + (d.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday ? 30 : 0);

                for (int i = 0; i < ordersPerDay; i++)
                {
                    int pidx = WeightedRandom(rng, weights);
                    var p    = products[pidx];

                    int     qty  = rng.Next(1, 5);
                    decimal disc = rng.Next(0, 10) < 2
                        ? Math.Round(p.EffectivePrice * qty * (decimal)(rng.Next(10, 30) / 100.0), 0)
                        : 0;
                    string ch     = channels[WeightedRandom(rng, channelWeights)];

                    int hour   = PickHour(rng);
                    int minute = rng.Next(0, 60);
                    var time   = d.AddHours(hour).AddMinutes(minute);

                    orders.Add(new MockOrder(time, ch, p.CategoryId, p.CategoryName,
                        p.Id, p.Name, p.ImageUrl, p.EffectivePrice, qty, disc));
                }
            }
            return orders;
        }

        private static int WeightedRandom(Random rng, int[] weights)
        {
            int total = weights.Sum();
            int rand  = rng.Next(total);
            int cum   = 0;
            for (int i = 0; i < weights.Length; i++)
            {
                cum += weights[i];
                if (rand < cum) return i;
            }
            return weights.Length - 1;
        }

        /// <summary>Phân phối giờ thực tế: cao điểm 7-10, 11-13, 15-17</summary>
        private static int PickHour(Random rng)
        {
            var dist = new[] { 1, 1, 1, 2, 2, 3, 5, 9, 10, 8, 5, 8, 10, 7, 5, 7, 9, 8, 5, 3, 2, 2, 1, 1 };
            return WeightedRandom(rng, dist);
        }

        // ─────────────────────────────────────────────────────────────────────────
        // KPI
        // ─────────────────────────────────────────────────────────────────────────
        private RevenueKpiDto BuildKpi(List<MockOrder> orders, Random rng)
        {
            decimal gross  = orders.Sum(o => o.GrossRevenue);
            decimal disc   = orders.Sum(o => o.Discount);
            decimal net    = gross - disc;
            int     items  = orders.Sum(o => o.Qty);

            // Gom nhóm theo "session" (mỗi 3-4 dòng = 1 đơn)
            int realOrders = Math.Max(1, orders.Count / 3);
            decimal aov    = realOrders == 0 ? 0 : Math.Round(net / realOrders, 0);

            var dineIn   = orders.Where(o => o.Channel == "dine_in").ToList();
            var delivery = orders.Where(o => o.Channel == "delivery").ToList();
            var pickup   = orders.Where(o => o.Channel == "pickup").ToList();

            // Growth ngẫu nhiên nhưng hợp lý (seed cố định)
            var g = new Random(DateTime.Today.DayOfYear);
            return new RevenueKpiDto
            {
                TotalRevenue      = gross,
                TotalItemsSold    = items,
                TotalOrders       = realOrders,
                AverageOrderValue = aov,
                VoucherDiscount   = disc,
                NetRevenue        = net,

                RevenuePctChange   = Math.Round((g.NextDouble() * 0.6 - 0.15) * 100, 1),
                ItemsSoldPctChange = Math.Round((g.NextDouble() * 0.5 - 0.1)  * 100, 1),
                OrdersPctChange    = Math.Round((g.NextDouble() * 0.5 - 0.12) * 100, 1),
                AovPctChange       = Math.Round((g.NextDouble() * 0.3 - 0.05) * 100, 1),

                DineInRevenue   = dineIn.Sum(o   => o.GrossRevenue),
                DeliveryRevenue = delivery.Sum(o => o.GrossRevenue),
                PickupRevenue   = pickup.Sum(o   => o.GrossRevenue),

                DineInOrders   = Math.Max(1, dineIn.Count   / 3),
                DeliveryOrders = Math.Max(1, delivery.Count / 3),
                PickupOrders   = Math.Max(1, pickup.Count   / 3),

                PeakHour       = "08:00 – 10:00",
                PeakOrderCount = g.Next(55, 95)
            };
        }

        // ─────────────────────────────────────────────────────────────────────────
        // Chart Data
        // ─────────────────────────────────────────────────────────────────────────
        private RevenueChartDataDto BuildChartData(List<MockOrder> orders, DateTime from, DateTime to, string groupBy)
        {
            var dto = new RevenueChartDataDto();

            void AddBucket(string label, List<MockOrder> b)
            {
                dto.Labels.Add(label);
                dto.Revenues.Add(b.Sum(o => o.GrossRevenue));
                dto.Quantities.Add(b.Sum(o => o.Qty));
                dto.Orders.Add(Math.Max(1, b.Count / 3));
                dto.Discounts.Add(b.Sum(o => o.Discount));
            }

            switch (groupBy.ToLower())
            {
                case "hour":
                    for (int h = 6; h <= 22; h++)
                        AddBucket($"{h:D2}:00", orders.Where(o => o.Date.Hour == h).ToList());
                    break;

                case "week":
                    var mon = from.Date.AddDays(-(from.DayOfWeek == DayOfWeek.Sunday ? 6 : (int)from.DayOfWeek - 1));
                    for (var ws = mon; ws <= to; ws = ws.AddDays(7))
                    {
                        var we = ws.AddDays(6);
                        var b  = orders.Where(o => o.Date.Date >= ws && o.Date.Date <= we).ToList();
                        AddBucket($"{ws:dd/MM}–{(we > to ? to : we):dd/MM}", b);
                    }
                    break;

                case "month":
                    for (var m = new DateTime(from.Year, from.Month, 1); m <= to; m = m.AddMonths(1))
                    {
                        var b = orders.Where(o => o.Date.Year == m.Year && o.Date.Month == m.Month).ToList();
                        AddBucket($"T{m.Month}/{m.Year}", b);
                    }
                    break;

                default: // day
                    for (var d = from.Date; d <= to.Date; d = d.AddDays(1))
                        AddBucket(d.ToString("dd/MM"), orders.Where(o => o.Date.Date == d).ToList());
                    break;
            }
            return dto;
        }

        // ─────────────────────────────────────────────────────────────────────────
        // Category donut – dùng danh mục thực từ DB
        // ─────────────────────────────────────────────────────────────────────────
        private List<CategoryRevenueDto> BuildCategoryRevenues(List<MockOrder> orders, List<Category> dbCategories)
        {
            var colors = new[] { "#e11d48", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#f97316", "#06b6d4" };

            // Map icon từ danh mục DB
            var iconMap = dbCategories.ToDictionary(c => c.Id, c => c.Icon);

            decimal total = Math.Max(1, orders.Sum(o => o.GrossRevenue));

            return orders
                .GroupBy(o => new { o.CategoryId, o.CategoryName })
                .OrderByDescending(g => g.Sum(o => o.GrossRevenue))
                .Select((g, idx) => new CategoryRevenueDto
                {
                    CategoryId   = g.Key.CategoryId,
                    Name         = g.Key.CategoryName,
                    Icon         = iconMap.GetValueOrDefault(g.Key.CategoryId, "bi-tag"),
                    Color        = colors[idx % colors.Length],
                    Revenue      = g.Sum(o => o.GrossRevenue),
                    QuantitySold = g.Sum(o => o.Qty),
                    SharePct     = Math.Round((double)(g.Sum(o => o.GrossRevenue) / total) * 100, 1)
                })
                .ToList();
        }

        // ─────────────────────────────────────────────────────────────────────────
        // Top products – dùng product thực từ DB
        // ─────────────────────────────────────────────────────────────────────────
        private List<TopSellingProductDto> BuildTopProducts(List<MockOrder> orders)
        {
            decimal totalRevenue = Math.Max(1, orders.Sum(o => o.GrossRevenue));
            return orders
                .GroupBy(o => new { o.ProductId, o.ProductName, o.CategoryName, o.ProductImage })
                .OrderByDescending(g => g.Sum(o => o.GrossRevenue))
                .Take(10)
                .Select((g, idx) => new TopSellingProductDto
                {
                    Rank         = idx + 1,
                    ProductId    = g.Key.ProductId,
                    Name         = g.Key.ProductName,
                    CategoryName = g.Key.CategoryName,
                    ImageUrl     = g.Key.ProductImage,
                    QuantitySold = g.Sum(o => o.Qty),
                    Revenue      = g.Sum(o => o.GrossRevenue),
                    SharePct     = Math.Round((double)(g.Sum(o => o.GrossRevenue) / totalRevenue) * 100, 1)
                })
                .ToList();
        }

        // ─────────────────────────────────────────────────────────────────────────
        // Detail rows
        // ─────────────────────────────────────────────────────────────────────────
        private List<RevenueDetailRowDto> BuildDetailRows(List<MockOrder> orders, DateTime from, DateTime to, string groupBy)
        {
            var rows = new List<RevenueDetailRowDto>();

            void AddRow(string label, List<MockOrder> b)
                => rows.Add(new RevenueDetailRowDto
                {
                    Label        = label,
                    Orders       = Math.Max(1, b.Count / 3),
                    ItemsSold    = b.Sum(o => o.Qty),
                    GrossRevenue = b.Sum(o => o.GrossRevenue),
                    Discounts    = b.Sum(o => o.Discount)
                });

            switch (groupBy.ToLower())
            {
                case "hour":
                    for (int h = 6; h <= 22; h++)
                        AddRow($"{h:D2}:00 – {h + 1:D2}:00", orders.Where(o => o.Date.Hour == h).ToList());
                    break;
                case "week":
                    var mon = from.Date.AddDays(-(from.DayOfWeek == DayOfWeek.Sunday ? 6 : (int)from.DayOfWeek - 1));
                    for (var ws = mon; ws <= to; ws = ws.AddDays(7))
                    {
                        var we = ws.AddDays(6);
                        AddRow($"Tuần {ws:dd/MM} – {(we > to ? to : we):dd/MM}",
                               orders.Where(o => o.Date.Date >= ws && o.Date.Date <= we).ToList());
                    }
                    break;
                case "month":
                    for (var m = new DateTime(from.Year, from.Month, 1); m <= to; m = m.AddMonths(1))
                        AddRow($"Tháng {m.Month}/{m.Year}",
                               orders.Where(o => o.Date.Year == m.Year && o.Date.Month == m.Month).ToList());
                    break;
                default:
                    for (var d = from.Date; d <= to.Date; d = d.AddDays(1))
                    {
                        string dn = d.ToString("dddd", new System.Globalization.CultureInfo("vi-VN"));
                        AddRow($"{d:dd/MM/yyyy} ({dn})", orders.Where(o => o.Date.Date == d).ToList());
                    }
                    break;
            }
            return rows;
        }
    }
}
