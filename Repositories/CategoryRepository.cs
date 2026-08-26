using System.Collections.Generic;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using E_Coffee.Models;

// =====================================================================
// [FAKE - ĐÃ TẮT] Import cũ dùng MockDbContext in-memory
// using System.Linq;
// using E_Coffee.Data;
// =====================================================================

namespace E_Coffee.Repositories
{
    /// <summary>
    /// CategoryRepository - Truy vấn bảng [Categories] trên SQL Server thật.
    /// Sử dụng ADO.NET thuần (Microsoft.Data.SqlClient).
    /// Connection string lấy từ appsettings.json -> ConnectionStrings:DefaultConnection
    /// </summary>
    public class CategoryRepository : ICategoryRepository
    {
        // =====================================================================
        // [FAKE - ĐÃ TẮT] Inject MockDbContext in-memory
        // private readonly MockDbContext _context;
        // public CategoryRepository(MockDbContext context) => _context = context;
        // =====================================================================

        private readonly string _connectionString;

        public CategoryRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException("Không tìm thấy 'DefaultConnection' trong appsettings.json");
        }

        // ------------------------------------------------------------------
        // Helper: tạo SqlConnection mới (mỗi method tự mở/đóng)
        // ------------------------------------------------------------------
        private SqlConnection CreateConnection() => new SqlConnection(_connectionString);

        // ------------------------------------------------------------------
        // Helper: Map một SqlDataReader row → Category object
        // ------------------------------------------------------------------
        private static Category MapRow(SqlDataReader reader) => new Category
        {
            Id           = reader.GetInt32(reader.GetOrdinal("Id")),
            Name         = reader.GetString(reader.GetOrdinal("Name")),
            Icon         = reader.GetString(reader.GetOrdinal("Icon")),
            Slug         = reader.GetString(reader.GetOrdinal("Slug")),
            DisplayOrder = reader.GetInt32(reader.GetOrdinal("DisplayOrder")),
            Description  = reader.IsDBNull(reader.GetOrdinal("Description"))
                               ? string.Empty
                               : reader.GetString(reader.GetOrdinal("Description"))
        };

        // ==================================================================
        // GET ALL - Lấy tất cả danh mục đang hoạt động, sắp theo DisplayOrder
        // ==================================================================
        public List<Category> GetAll()
        {
            // ---------------------------------------------------------------
            // [FAKE - ĐÃ TẮT]
            // return _context.Categories.OrderBy(c => c.DisplayOrder).ToList();
            // ---------------------------------------------------------------

            var list = new List<Category>();

            using var conn = CreateConnection();
            conn.Open();
            using var cmd = new SqlCommand(
                @"SELECT Id, Name, Icon, Slug, DisplayOrder, Description
                  FROM   Categories
                  WHERE  IsActive = 1
                  ORDER  BY DisplayOrder ASC", conn);

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
                list.Add(MapRow(reader));

            return list;
        }

        // ==================================================================
        // GET BY ID
        // ==================================================================
        public Category? GetById(int id)
        {
            // ---------------------------------------------------------------
            // [FAKE - ĐÃ TẮT]
            // return _context.Categories.FirstOrDefault(c => c.Id == id);
            // ---------------------------------------------------------------

            using var conn = CreateConnection();
            conn.Open();
            using var cmd = new SqlCommand(
                @"SELECT Id, Name, Icon, Slug, DisplayOrder, Description
                  FROM   Categories
                  WHERE  Id = @Id", conn);

            cmd.Parameters.AddWithValue("@Id", id);

            using var reader = cmd.ExecuteReader();
            return reader.Read() ? MapRow(reader) : null;
        }

        // ==================================================================
        // GET BY SLUG
        // ==================================================================
        public Category? GetBySlug(string slug)
        {
            // ---------------------------------------------------------------
            // [FAKE - ĐÃ TẮT]
            // return _context.Categories.FirstOrDefault(
            //     c => c.Slug.Equals(slug, StringComparison.OrdinalIgnoreCase));
            // ---------------------------------------------------------------

            if (string.IsNullOrWhiteSpace(slug)) return null;

            using var conn = CreateConnection();
            conn.Open();
            using var cmd = new SqlCommand(
                @"SELECT Id, Name, Icon, Slug, DisplayOrder, Description
                  FROM   Categories
                  WHERE  Slug = @Slug", conn);

            cmd.Parameters.AddWithValue("@Slug", slug.Trim().ToLower());

            using var reader = cmd.ExecuteReader();
            return reader.Read() ? MapRow(reader) : null;
        }

        // ==================================================================
        // ADD - Thêm mới một danh mục
        // ==================================================================
        public void Add(Category category)
        {
            // ---------------------------------------------------------------
            // [FAKE - ĐÃ TẮT]
            // category.Id = _context.Categories.Any()
            //     ? _context.Categories.Max(c => c.Id) + 1 : 1;
            // _context.Categories.Add(category);
            // ---------------------------------------------------------------

            using var conn = CreateConnection();
            conn.Open();
            using var cmd = new SqlCommand(
                @"INSERT INTO Categories (Name, Icon, Slug, DisplayOrder, Description, IsActive, CreatedAt)
                  VALUES (@Name, @Icon, @Slug, @DisplayOrder, @Description, 1, GETDATE());
                  SELECT CAST(SCOPE_IDENTITY() AS INT);", conn);

            cmd.Parameters.AddWithValue("@Name",         category.Name);
            cmd.Parameters.AddWithValue("@Icon",         category.Icon);
            cmd.Parameters.AddWithValue("@Slug",         category.Slug.ToLower());
            cmd.Parameters.AddWithValue("@DisplayOrder", category.DisplayOrder);
            cmd.Parameters.AddWithValue("@Description",  category.Description);

            // Gán lại Id từ DB (IDENTITY) cho object
            var newId = cmd.ExecuteScalar();
            if (newId != null)
                category.Id = (int)newId;
        }

        // ==================================================================
        // UPDATE - Cập nhật thông tin danh mục theo Id
        // ==================================================================
        public void Update(Category category)
        {
            // ---------------------------------------------------------------
            // [FAKE - ĐÃ TẮT]
            // var existing = GetById(category.Id);
            // if (existing == null) return;
            // existing.Name = category.Name;
            // existing.Icon = category.Icon;
            // existing.Slug = category.Slug;
            // existing.DisplayOrder = category.DisplayOrder;
            // existing.Description = category.Description;
            // ---------------------------------------------------------------

            using var conn = CreateConnection();
            conn.Open();
            using var cmd = new SqlCommand(
                @"UPDATE Categories
                  SET    Name         = @Name,
                         Icon         = @Icon,
                         Slug         = @Slug,
                         DisplayOrder = @DisplayOrder,
                         Description  = @Description
                  WHERE  Id = @Id", conn);

            cmd.Parameters.AddWithValue("@Id",           category.Id);
            cmd.Parameters.AddWithValue("@Name",         category.Name);
            cmd.Parameters.AddWithValue("@Icon",         category.Icon);
            cmd.Parameters.AddWithValue("@Slug",         category.Slug.ToLower());
            cmd.Parameters.AddWithValue("@DisplayOrder", category.DisplayOrder);
            cmd.Parameters.AddWithValue("@Description",  category.Description);

            cmd.ExecuteNonQuery();
        }

        // ==================================================================
        // DELETE - Xóa mềm (IsActive = 0) thay vì xóa cứng khỏi DB
        // ==================================================================
        public void Delete(int id)
        {
            // ---------------------------------------------------------------
            // [FAKE - ĐÃ TẮT]
            // var item = GetById(id);
            // if (item != null) _context.Categories.Remove(item);
            // ---------------------------------------------------------------

            using var conn = CreateConnection();
            conn.Open();

            // Xóa mềm: đánh dấu IsActive = 0 thay vì DELETE cứng
            // (tránh vi phạm khóa ngoại với bảng Products)
            using var cmd = new SqlCommand(
                @"UPDATE Categories SET IsActive = 0 WHERE Id = @Id", conn);

            cmd.Parameters.AddWithValue("@Id", id);
            cmd.ExecuteNonQuery();
        }
    }
}
