using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using E_Coffee.Models;
using E_Coffee.Services;

namespace E_Coffee.Controllers
{
    public class HomeController : Controller
    {
        private readonly ICoffeeCatalogService _catalogService;

        public HomeController(ICoffeeCatalogService catalogService)
        {
            _catalogService = catalogService;
        }

        public IActionResult Index()
        {
            var categories = _catalogService.GetCategories();
            var bestSellers = _catalogService.GetProducts().Where(p => p.Badge == "Bán Chạy" || p.Badge == "Signature").Take(4).ToList();
            
            ViewBag.Categories = categories;
            ViewBag.BestSellers = bestSellers;

            return View();
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
