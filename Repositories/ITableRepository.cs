using System.Collections.Generic;
using E_Coffee.Models;

namespace E_Coffee.Repositories
{
    public interface ITableRepository
    {
        List<BarTableItem> GetAll();
        BarTableItem? GetByIdOrName(string identifier);
        void ResetTable(string identifier);
        void UpdateTable(BarTableItem table);
        void SaveTableOrder(string identifier, List<CartItem> items, int customerCount = 1, string customerName = "", string customerPhone = "", string customerNote = "");
    }
}
