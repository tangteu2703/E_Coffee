using System.Collections.Generic;
using E_Coffee.Models;

namespace E_Coffee.Repositories
{
    public interface ICategoryRepository
    {
        List<Category> GetAll();
        Category? GetById(int id);
        Category? GetBySlug(string slug);
        void Add(Category category);
        void Update(Category category);
        void Delete(int id);
    }
}
