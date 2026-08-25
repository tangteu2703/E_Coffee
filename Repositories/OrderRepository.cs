using System;
using System.Collections.Generic;
using System.Linq;
using E_Coffee.Data;
using E_Coffee.Models;

namespace E_Coffee.Repositories
{
    public class OrderRepository : IOrderRepository
    {
        private readonly MockDbContext _context;

        public OrderRepository(MockDbContext context)
        {
            _context = context;
        }

        public List<BarOnlineOrderItem> GetOnlineOrders()
        {
            return _context.OnlineOrders;
        }

        public BarOnlineOrderItem? GetOnlineOrderById(string orderId)
        {
            if (string.IsNullOrWhiteSpace(orderId)) return null;
            var clean = orderId.Trim();
            return _context.OnlineOrders.FirstOrDefault(o => o.OrderId.Equals(clean, StringComparison.OrdinalIgnoreCase));
        }

        public void UpdateOnlineOrderStatus(string orderId, BarOnlineOrderStatus status)
        {
            var order = GetOnlineOrderById(orderId);
            if (order != null)
            {
                order.Status = status;
            }
        }

        public void AddOnlineOrder(BarOnlineOrderItem order)
        {
            _context.OnlineOrders.Insert(0, order);
        }

        public void SaveOrUpdateOnlineOrder(BarOnlineOrderItem order)
        {
            if (order == null) return;
            var existing = GetOnlineOrderById(order.OrderId);
            if (existing != null)
            {
                existing.Items = order.Items;
                existing.CustomerName = order.CustomerName;
                existing.CustomerPhone = order.CustomerPhone;
                existing.CustomerNote = order.CustomerNote;
                existing.Status = order.Status;
                existing.DeliveryAddress = order.DeliveryAddress;
            }
            else
            {
                _context.OnlineOrders.Insert(0, order);
            }
        }
    }
}
