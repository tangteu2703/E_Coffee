using Microsoft.AspNetCore.SignalR;

namespace E_Coffee.Hubs
{
    /// <summary>
    /// SignalR Hub cho thông báo đơn hàng real-time giữa khách hàng và quầy Bar.
    /// Server dùng IHubContext<OrderHub> để broadcast, không cần client-invokable methods.
    /// </summary>
    public class OrderHub : Hub
    {
        // Hub intentionally empty — server pushes via IHubContext<OrderHub>
        // Event "NewOrderReceived" → payload: BarOnlineOrderItem (serialized as JSON)
    }
}
