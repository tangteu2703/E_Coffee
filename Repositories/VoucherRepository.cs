using System.Collections.Generic;
using System.Linq;
using E_Coffee.Data;
using E_Coffee.Models;

namespace E_Coffee.Repositories
{
    public class VoucherRepository : IVoucherRepository
    {
        private readonly MockDbContext _context;
        public VoucherRepository(MockDbContext context) => _context = context;

        public List<Voucher> GetAll(bool includeInactive = true) =>
            includeInactive ? _context.Vouchers.ToList() : _context.Vouchers.Where(v => v.IsActive).ToList();

        public Voucher? GetByCode(string code)
        {
            if (string.IsNullOrWhiteSpace(code)) return null;
            var cleanCode = code.Trim().ToUpperInvariant();
            return _context.Vouchers.FirstOrDefault(v => v.Code.ToUpperInvariant() == cleanCode && v.IsActive);
        }

        public void UpdateUsage(string code)
        {
            var v = GetByCode(code);
            if (v != null) v.UsedCount++;
        }

        public void Add(Voucher voucher)
        {
            voucher.Id = _context.Vouchers.Any() ? _context.Vouchers.Max(v => v.Id) + 1 : 1;
            _context.Vouchers.Add(voucher);
        }

        public void Update(Voucher voucher)
        {
            var existing = _context.Vouchers.FirstOrDefault(v => v.Id == voucher.Id);
            if (existing == null) return;
            existing.Code = voucher.Code;
            existing.Name = voucher.Name;
            existing.Description = voucher.Description;
            existing.DiscountType = voucher.DiscountType;
            existing.DiscountValue = voucher.DiscountValue;
            existing.MinOrderAmount = voucher.MinOrderAmount;
            existing.MaxDiscountAmount = voucher.MaxDiscountAmount;
            existing.StartDate = voucher.StartDate;
            existing.EndDate = voucher.EndDate;
            existing.IsActive = voucher.IsActive;
            existing.UsageLimit = voucher.UsageLimit;
        }

        public void Delete(int id)
        {
            var item = _context.Vouchers.FirstOrDefault(v => v.Id == id);
            if (item != null) _context.Vouchers.Remove(item);
        }

        public void ToggleStatus(int id)
        {
            var item = _context.Vouchers.FirstOrDefault(v => v.Id == id);
            if (item != null) item.IsActive = !item.IsActive;
        }
    }
}
