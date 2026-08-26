using System.Collections.Generic;
using E_Coffee.Models;

namespace E_Coffee.Repositories
{
    public interface IVoucherRepository
    {
        List<Voucher> GetAll(bool includeInactive = true);
        Voucher? GetByCode(string code);
        void UpdateUsage(string code);
        void Add(Voucher voucher);
        void Update(Voucher voucher);
        void Delete(int id);
        void ToggleStatus(int id);
    }
}
