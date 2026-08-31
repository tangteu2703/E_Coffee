using System.Collections.Generic;
using E_Coffee.Models;

namespace E_Coffee.Repositories
{
    public interface IOrderRepository
    {
        List<BarOnlineOrderItem> GetOnlineOrders();
        BarOnlineOrderItem? GetOnlineOrderById(string orderId);
        void UpdateOnlineOrderStatus(string orderId, BarOnlineOrderStatus status);
        void AddOnlineOrder(BarOnlineOrderItem order);
        void SaveOrUpdateOnlineOrder(BarOnlineOrderItem order);
        bool CancelOnlineOrder(string orderId, string reason);
        List<BarOrderHistoryItem> GetOrderHistory();
        void AddToHistory(BarOrderHistoryItem historyItem);
    }
}
