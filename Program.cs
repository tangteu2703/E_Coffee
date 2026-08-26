using E_Coffee.Data;
using E_Coffee.Repositories;
using E_Coffee.Services;
using Microsoft.AspNetCore.Authentication.Cookies;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();

// Authentication Configuration with Cookies
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Account/Login";
        options.LogoutPath = "/Account/Logout";
        options.AccessDeniedPath = "/Account/AccessDenied";
        options.ExpireTimeSpan = TimeSpan.FromDays(7);
        options.SlidingExpiration = true;
        options.Cookie.Name = "ECoffee_Auth_Cookie";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
    });

// 1. [FAKE] Data Context - In-Memory Store (sẽ xóa dần khi từng Repository chuyển sang SQL thật)
// CategoryRepository đã kết nối SQL Server thật → không cần MockDbContext cho Categories nữa
builder.Services.AddSingleton<MockDbContext>();

// 2. Repository Layer (Data Access)
// ✅ [SQL THẬT]  CategoryRepository   → dùng IConfiguration + ADO.NET → SQL Server
// ⏳ [FAKE]     ProductRepository    → vẫn dùng MockDbContext (chưa migrate)
// ⏳ [FAKE]     VoucherRepository    → vẫn dùng MockDbContext (chưa migrate)
// ⏳ [FAKE]     TableRepository      → vẫn dùng MockDbContext (chưa migrate)
// ⏳ [FAKE]     OrderRepository      → vẫn dùng MockDbContext (chưa migrate)
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<IVoucherRepository, VoucherRepository>();
builder.Services.AddScoped<ITableRepository, TableRepository>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();

// 3. Service Layer (Business Logic)
builder.Services.AddScoped<ICoffeeCatalogService, CoffeeCatalogService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
