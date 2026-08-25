using System.Collections.Generic;
using E_Coffee.Models;

namespace E_Coffee.Repositories
{
    public interface IVoucherRepository
    {
        List<Voucher> GetAll();
        Voucher? GetByCode(string code);
        void UpdateUsage(string code);
    }
}
