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

        public bool CancelOnlineOrder(string orderId, string reason)
        {
            var order = GetOnlineOrderById(orderId);
            if (order == null) return false;

            // Chỉ hủy được đơn đang Pending hoặc Preparing
            if (order.Status != BarOnlineOrderStatus.Pending && order.Status != BarOnlineOrderStatus.Preparing)
                return false;

            var orderTypeLabel = order.OrderType == OrderType.Delivery ? "Giao tận nơi"
                               : order.OrderType == OrderType.Pickup ? "Đến lấy / Mang đi"
                               : "Tại quầy";

            // Đẩy vào lịch sử trước khi xóa
            _context.OrderHistory.Insert(0, new BarOrderHistoryItem
            {
                OrderId = order.OrderId,
                CustomerName = order.CustomerName,
                CustomerPhone = order.CustomerPhone,
                OrderType = order.OrderType,
                OrderTypeLabel = orderTypeLabel,
                OrderTime = order.OrderTime,
                ClosedAt = DateTime.Now,
                FinalStatus = BarOnlineOrderStatus.Cancelled,
                TotalAmount = order.TotalAmount,
                DiscountAmount = 0,
                FinalAmount = order.TotalAmount,
                PaymentMethod = "",
                CancelReason = reason,
                ItemCount = order.ItemCount,
                TableOrOrderId = order.OrderId
            });

            // Xóa khỏi danh sách active orders
            _context.OnlineOrders.Remove(order);
            return true;
        }

        public List<BarOrderHistoryItem> GetOrderHistory()
        {
            return _context.OrderHistory.OrderByDescending(h => h.ClosedAt).ToList();
        }

        public void AddToHistory(BarOrderHistoryItem historyItem)
        {
            if (historyItem == null) return;
            _context.OrderHistory.Insert(0, historyItem);
        }
    }
}
