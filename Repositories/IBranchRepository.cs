using System.Collections.Generic;
using E_Coffee.Models;

namespace E_Coffee.Repositories
{
    public interface IBranchRepository
    {
        List<Branch> GetAll();
        Branch? GetById(int id);
    }
}
