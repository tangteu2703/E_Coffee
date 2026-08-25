using System;
using System.Collections.Generic;
using System.Linq;
using E_Coffee.Data;
using E_Coffee.Models;

namespace E_Coffee.Repositories
{
    public class TableRepository : ITableRepository
    {
        private readonly MockDbContext _context;

        public TableRepository(MockDbContext context)
        {
            _context = context;
        }

        public List<BarTableItem> GetAll()
        {
            return _context.Tables;
        }

        public BarTableItem? GetByIdOrName(string identifier)
        {
            if (string.IsNullOrWhiteSpace(identifier)) return null;
            var clean = identifier.Trim();
            return _context.Tables.FirstOrDefault(t =>
                t.TableId.Equals(clean, StringComparison.OrdinalIgnoreCase) ||
                t.TableName.Equals(clean, StringComparison.OrdinalIgnoreCase)
            );
        }

        public void ResetTable(string identifier)
        {
            var table = GetByIdOrName(identifier);
            if (table != null)
            {
                table.Status = BarTableStatus.Empty;
                table.Items.Clear();
                table.OccupiedTime = null;
                table.CustomerCount = 0;
                table.CustomerName = string.Empty;
                table.CustomerPhone = string.Empty;
                table.CustomerNote = string.Empty;
            }
        }

        public void UpdateTable(BarTableItem table)
        {
            var existing = GetByIdOrName(table.TableId);
            if (existing != null)
            {
                existing.Status = table.Status;
                existing.CustomerCount = table.CustomerCount;
                existing.CustomerName = table.CustomerName;
                existing.CustomerPhone = table.CustomerPhone;
                existing.CustomerNote = table.CustomerNote;
                existing.OccupiedTime = table.OccupiedTime;
                existing.Items = table.Items;
            }
        }

        public void SaveTableOrder(string identifier, List<CartItem> items, int customerCount = 1, string customerName = "", string customerPhone = "", string customerNote = "")
        {
            var table = GetByIdOrName(identifier);
            if (table != null)
            {
                table.Items = items ?? new List<CartItem>();
                if (table.Items.Count > 0)
                {
                    table.Status = BarTableStatus.Occupied;
                    if (!table.OccupiedTime.HasValue)
                    {
                        table.OccupiedTime = DateTime.Now;
                    }
                    table.CustomerCount = customerCount > 0 ? customerCount : 1;
                    if (!string.IsNullOrWhiteSpace(customerName)) table.CustomerName = customerName.Trim();
                    if (!string.IsNullOrWhiteSpace(customerPhone)) table.CustomerPhone = customerPhone.Trim();
                    if (!string.IsNullOrWhiteSpace(customerNote)) table.CustomerNote = customerNote.Trim();
                }
                else
                {
                    table.Status = BarTableStatus.Empty;
                    table.OccupiedTime = null;
                    table.CustomerCount = 0;
                    table.CustomerName = string.Empty;
                    table.CustomerPhone = string.Empty;
                    table.CustomerNote = string.Empty;
                }
            }
        }
    }
}
