using System.Collections.Generic;
using System.Linq;
using E_Coffee.Data;
using E_Coffee.Models;

namespace E_Coffee.Repositories
{
    public class BranchRepository : IBranchRepository
    {
        private readonly MockDbContext _context;

        public BranchRepository(MockDbContext context)
        {
            _context = context;
        }

        public List<Branch> GetAll()
        {
            return _context.Branches.Where(b => b.IsActive).OrderBy(b => b.City).ThenBy(b => b.Id).ToList();
        }

        public Branch? GetById(int id)
        {
            return _context.Branches.FirstOrDefault(b => b.Id == id);
        }
    }
}
