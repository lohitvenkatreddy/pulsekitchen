import orderService from '../orderService';
import api from '../api';

// Mock the API client
jest.mock('../api');

describe('orderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrders', () => {
    it('should fetch orders with default pagination', async () => {
      const mockOrders = [
        {
          id: 'order1',
          restaurant_name: 'Pizza Place',
          total_amount: 25.99,
          status: 'delivered',
          priority_level: 'normal',
          placed_at: '2024-01-15T10:00:00Z',
        },
        {
          id: 'order2',
          restaurant_name: 'Burger Joint',
          total_amount: 18.50,
          status: 'delivered',
          priority_level: 'normal',
          placed_at: '2024-01-14T15:30:00Z',
        },
      ];

      api.get.mockResolvedValue({ data: mockOrders });

      const result = await orderService.getOrders();

      expect(api.get).toHaveBeenCalledWith('/orders/', {
        params: {
          skip: 0,
          limit: 10,
        },
      });
      expect(result.data).toEqual(mockOrders);
    });

    it('should fetch orders with custom pagination', async () => {
      const mockOrders = [];
      api.get.mockResolvedValue({ data: mockOrders });

      const result = await orderService.getOrders(2, 20);

      expect(api.get).toHaveBeenCalledWith('/orders/', {
        params: {
          skip: 20,
          limit: 20,
        },
      });
      expect(result.data).toEqual(mockOrders);
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      api.get.mockRejectedValue(error);

      await expect(orderService.getOrders()).rejects.toThrow('Network error');
    });

    it('should handle 401 unauthorized error', async () => {
      const error = {
        response: {
          status: 401,
          data: { detail: 'Token expired' },
        },
      };
      api.get.mockRejectedValue(error);

      await expect(orderService.getOrders()).rejects.toEqual(error);
    });
  });

  describe('getOrderDetail', () => {
    it('should fetch order details successfully', async () => {
      const orderId = 'order1';
      const mockOrderDetail = {
        id: orderId,
        restaurant_name: 'Pizza Place',
        items: [
          {
            id: 'item1',
            name: 'Margherita Pizza',
            quantity: 2,
            price: 12.99,
          },
        ],
        total_amount: 25.99,
        status: 'delivered',
        priority_level: 'normal',
        delivery_address: {
          street_address_1: '123 Main St',
          city: 'New York',
        },
        placed_at: '2024-01-15T10:00:00Z',
        timeline: [
          {
            status: 'confirmed',
            timestamp: '2024-01-15T10:05:00Z',
            description: 'Order confirmed',
          },
        ],
      };

      api.get.mockResolvedValue({ data: mockOrderDetail });

      const result = await orderService.getOrderDetail(orderId);

      expect(api.get).toHaveBeenCalledWith(`/orders/${orderId}`);
      expect(result.data).toEqual(mockOrderDetail);
    });

    it('should handle 404 when order not found', async () => {
      const orderId = 'nonexistent';

      const error = {
        response: {
          status: 404,
          data: { detail: 'Order not found' },
        },
      };

      api.get.mockRejectedValue(error);

      await expect(orderService.getOrderDetail(orderId)).rejects.toEqual(error);
    });
  });

  describe('reorderItems', () => {
    it('should reorder items from a previous order successfully', async () => {
      const orderId = 'order1';
      const mockNewOrder = {
        id: 'order_new',
        restaurant_id: 'restaurant1',
        items: [
          {
            id: 'item1',
            name: 'Margherita Pizza',
            quantity: 2,
            price: 12.99,
          },
        ],
        total_amount: 25.99,
        status: 'pending',
      };

      api.post.mockResolvedValue({ data: mockNewOrder });

      const result = await orderService.reorderItems(orderId);

      expect(api.post).toHaveBeenCalledWith(`/orders/${orderId}/reorder`);
      expect(result.data).toEqual(mockNewOrder);
      // Verify items match original order
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].quantity).toBe(2);
    });

    it('should handle 404 when original order not found', async () => {
      const orderId = 'nonexistent';

      const error = {
        response: {
          status: 404,
          data: { detail: 'Order not found' },
        },
      };

      api.post.mockRejectedValue(error);

      await expect(orderService.reorderItems(orderId)).rejects.toEqual(error);
    });

    it('should handle unavailable items error', async () => {
      const orderId = 'order1';

      const error = {
        response: {
          status: 400,
          data: { detail: 'Some items are no longer available' },
        },
      };

      api.post.mockRejectedValue(error);

      await expect(orderService.reorderItems(orderId)).rejects.toEqual(error);
    });
  });

  describe('createOrder', () => {
    it('should create a new order successfully', async () => {
      const orderData = {
        restaurant_id: 'restaurant1',
        items: [
          {
            item_id: 'item1',
            quantity: 2,
          },
        ],
        delivery_address_id: 'address1',
        payment_method_id: 'payment1',
      };

      const mockResponse = {
        id: 'order_new',
        ...orderData,
        status: 'pending',
      };

      api.post.mockResolvedValue({ data: mockResponse });

      const result = await orderService.createOrder(orderData);

      expect(api.post).toHaveBeenCalledWith('/orders/', orderData);
      expect(result.data).toEqual(mockResponse);
    });

    it('should handle validation errors', async () => {
      const invalidOrderData = {
        // Missing required fields
      };

      const error = {
        response: {
          status: 400,
          data: { detail: 'Missing required fields' },
        },
      };

      api.post.mockRejectedValue(error);

      await expect(orderService.createOrder(invalidOrderData)).rejects.toEqual(error);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an order successfully', async () => {
      const orderId = 'order1';
      const mockResponse = {
        id: orderId,
        status: 'cancelled',
      };

      api.patch.mockResolvedValue({ data: mockResponse });

      const result = await orderService.cancelOrder(orderId);

      expect(api.patch).toHaveBeenCalledWith(`/orders/${orderId}/status`, {
        status: 'cancelled',
      });
      expect(result.data).toEqual(mockResponse);
    });

    it('should handle 404 when order not found', async () => {
      const orderId = 'nonexistent';

      const error = {
        response: {
          status: 404,
          data: { detail: 'Order not found' },
        },
      };

      api.patch.mockRejectedValue(error);

      await expect(orderService.cancelOrder(orderId)).rejects.toEqual(error);
    });
  });
});
