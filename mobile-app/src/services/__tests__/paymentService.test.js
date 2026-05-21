import paymentService from '../paymentService';
import apiClient from '../api';

// Mock the API client
jest.mock('../api');

describe('paymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPaymentMethods', () => {
    it('should fetch all payment methods successfully', async () => {
      const userId = 123;
      const mockPaymentMethods = [
        {
          id: '1',
          card_token: 'tok_visa_1234',
          card_brand: 'visa',
          last_four_digits: '4242',
          expiration_date: '12/25',
          is_default: true,
        },
        {
          id: '2',
          card_token: 'tok_mastercard_5678',
          card_brand: 'mastercard',
          last_four_digits: '5555',
          expiration_date: '06/26',
          is_default: false,
        },
      ];

      apiClient.get.mockResolvedValue({ data: mockPaymentMethods });

      const result = await paymentService.getPaymentMethods(userId);

      expect(apiClient.get).toHaveBeenCalledWith(`/payment/saved-methods/${userId}`);
      expect(result.data).toEqual(mockPaymentMethods);
      // Verify no full card numbers are in the response
      expect(result.data[0]).not.toHaveProperty('card_number');
    });

    it('should handle network errors', async () => {
      const userId = 123;
      const error = new Error('Network error');
      apiClient.get.mockRejectedValue(error);

      await expect(paymentService.getPaymentMethods(userId)).rejects.toThrow('Network error');
    });

    it('should handle 401 unauthorized error', async () => {
      const userId = 123;
      const error = {
        response: {
          status: 401,
          data: { detail: 'Token expired' },
        },
      };
      apiClient.get.mockRejectedValue(error);

      await expect(paymentService.getPaymentMethods(userId)).rejects.toEqual(error);
    });
  });

  describe('addPaymentMethod', () => {
    it('should add a new payment method successfully', async () => {
      const cardData = {
        card_number: '4242424242424242',
        cardholder_name: 'John Doe',
        expiration_date: '12/25',
        cvv: '123',
      };

      const mockResponse = {
        id: '1',
        card_token: 'tok_visa_1234',
        card_brand: 'visa',
        last_four_digits: '4242',
        expiration_date: '12/25',
        is_default: false,
      };

      apiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await paymentService.addPaymentMethod(cardData);

      expect(apiClient.post).toHaveBeenCalledWith('/payment/saved-methods', cardData);
      // Verify response contains only token, not full card number
      expect(result.data).toHaveProperty('card_token');
      expect(result.data).not.toHaveProperty('card_number');
      expect(result.data).not.toHaveProperty('cvv');
    });

    it('should handle validation errors (400)', async () => {
      const invalidCardData = {
        card_number: '1234', // Invalid card number
        cardholder_name: 'John Doe',
        expiration_date: '12/25',
        cvv: '123',
      };

      const error = {
        response: {
          status: 400,
          data: { detail: 'Invalid card number' },
        },
      };

      apiClient.post.mockRejectedValue(error);

      await expect(paymentService.addPaymentMethod(invalidCardData)).rejects.toEqual(error);
    });

    it('should handle expired card error', async () => {
      const expiredCardData = {
        card_number: '4242424242424242',
        cardholder_name: 'John Doe',
        expiration_date: '01/20', // Expired
        cvv: '123',
      };

      const error = {
        response: {
          status: 400,
          data: { detail: 'Card has expired' },
        },
      };

      apiClient.post.mockRejectedValue(error);

      await expect(paymentService.addPaymentMethod(expiredCardData)).rejects.toEqual(error);
    });

    it('should handle server errors (500)', async () => {
      const cardData = {
        card_number: '4242424242424242',
        cardholder_name: 'John Doe',
        expiration_date: '12/25',
        cvv: '123',
      };

      const error = {
        response: {
          status: 500,
          data: { detail: 'Internal server error' },
        },
      };

      apiClient.post.mockRejectedValue(error);

      await expect(paymentService.addPaymentMethod(cardData)).rejects.toEqual(error);
    });
  });

  describe('deletePaymentMethod', () => {
    it('should delete a payment method successfully', async () => {
      const paymentMethodId = '1';
      const mockResponse = { message: 'Payment method deleted successfully' };

      apiClient.delete.mockResolvedValue({ data: mockResponse });

      const result = await paymentService.deletePaymentMethod(paymentMethodId);

      expect(apiClient.delete).toHaveBeenCalledWith(`/payment/saved-methods/${paymentMethodId}`);
      expect(result.data).toEqual(mockResponse);
    });

    it('should handle 404 when payment method not found', async () => {
      const paymentMethodId = 'nonexistent';

      const error = {
        response: {
          status: 404,
          data: { detail: 'Payment method not found' },
        },
      };

      apiClient.delete.mockRejectedValue(error);

      await expect(paymentService.deletePaymentMethod(paymentMethodId)).rejects.toEqual(error);
    });
  });

  describe('setDefaultPaymentMethod', () => {
    it('should set a payment method as default successfully', async () => {
      const paymentMethodId = '1';
      const mockResponse = {
        id: paymentMethodId,
        card_token: 'tok_visa_1234',
        card_brand: 'visa',
        last_four_digits: '4242',
        is_default: true,
      };

      apiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await paymentService.setDefaultPaymentMethod(paymentMethodId);

      expect(apiClient.put).toHaveBeenCalledWith(
        `/payment/saved-methods/${paymentMethodId}/set-default`
      );
      expect(result.data).toEqual(mockResponse);
    });

    it('should handle 404 when payment method not found', async () => {
      const paymentMethodId = 'nonexistent';

      const error = {
        response: {
          status: 404,
          data: { detail: 'Payment method not found' },
        },
      };

      apiClient.put.mockRejectedValue(error);

      await expect(paymentService.setDefaultPaymentMethod(paymentMethodId)).rejects.toEqual(error);
    });
  });
});
