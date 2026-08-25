using System.Collections.Generic;
using System.Linq;
using E_Coffee.Data;
using E_Coffee.Models;

namespace E_Coffee.Repositories
{
    public class VoucherRepository : IVoucherRepository
    {
        private readonly MockDbContext _context;

        public VoucherRepository(MockDbContext context)
        {
            _context = context;
        }

        public List<Voucher> GetAll()
        {
            return _context.Vouchers.Where(v => v.IsActive).ToList();
        }

        public Voucher? GetByCode(string code)
        {
            if (string.IsNullOrWhiteSpace(code)) return null;
            var cleanCode = code.Trim().ToUpperInvariant();
            return _context.Vouchers.FirstOrDefault(v => v.Code.ToUpperInvariant() == cleanCode && v.IsActive);
        }

        public void UpdateUsage(string code)
        {
            var voucher = GetByCode(code);
            if (voucher != null)
            {
                voucher.UsedCount++;
            }
        }
    }
}
