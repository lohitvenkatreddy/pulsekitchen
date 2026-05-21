import addressService from '../addressService';
import apiClient from '../api';

// Mock the API client
jest.mock('../api');

describe('addressService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAddresses', () => {
    it('should fetch all addresses successfully', async () => {
      const mockAddresses = [
        {
          id: '1',
          label: 'Home',
          street_address_1: '123 Main St',
          city: 'New York',
          is_default: true,
        },
        {
          id: '2',
          label: 'Work',
          street_address_1: '456 Work Ave',
          city: 'New York',
          is_default: false,
        },
      ];

      apiClient.get.mockResolvedValue({ data: mockAddresses });

      const result = await addressService.getAddresses();

      expect(apiClient.get).toHaveBeenCalledWith('/users/me/addresses');
      expect(result.data).toEqual(mockAddresses);
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      apiClient.get.mockRejectedValue(error);

      await expect(addressService.getAddresses()).rejects.toThrow('Network error');
    });

    it('should handle 401 unauthorized error', async () => {
      const error = {
        response: {
          status: 401,
          data: { detail: 'Token expired' },
        },
      };
      apiClient.get.mockRejectedValue(error);

      await expect(addressService.getAddresses()).rejects.toEqual(error);
    });

    it('should handle 404 not found error', async () => {
      const error = {
        response: {
          status: 404,
          data: { detail: 'User not found' },
        },
      };
      apiClient.get.mockRejectedValue(error);

      await expect(addressService.getAddresses()).rejects.toEqual(error);
    });
  });

  describe('addAddress', () => {
    it('should add a new address successfully', async () => {
      const newAddress = {
        label: 'Home',
        street_address_1: '123 Main St',
        city: 'New York',
        region_state: 'NY',
        postal_code: '10001',
        country: 'USA',
      };

      const mockResponse = {
        id: '1',
        ...newAddress,
        is_default: false,
      };

      apiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await addressService.addAddress(newAddress);

      expect(apiClient.post).toHaveBeenCalledWith('/users/me/addresses', newAddress);
      expect(result.data).toEqual(mockResponse);
    });

    it('should handle validation errors (400)', async () => {
      const invalidAddress = {
        label: 'Home',
        // Missing required fields
      };

      const error = {
        response: {
          status: 400,
          data: { detail: 'Missing required fields' },
        },
      };

      apiClient.post.mockRejectedValue(error);

      await expect(addressService.addAddress(invalidAddress)).rejects.toEqual(error);
    });

    it('should handle server errors (500)', async () => {
      const newAddress = {
        label: 'Home',
        street_address_1: '123 Main St',
        city: 'New York',
        region_state: 'NY',
        postal_code: '10001',
        country: 'USA',
      };

      const error = {
        response: {
          status: 500,
          data: { detail: 'Internal server error' },
        },
      };

      apiClient.post.mockRejectedValue(error);

      await expect(addressService.addAddress(newAddress)).rejects.toEqual(error);
    });
  });

  describe('updateAddress', () => {
    it('should update an address successfully', async () => {
      const addressId = '1';
      const updatedData = {
        label: 'Home Updated',
        street_address_1: '456 New St',
      };

      const mockResponse = {
        id: addressId,
        ...updatedData,
        is_default: true,
      };

      apiClient.patch.mockResolvedValue({ data: mockResponse });

      const result = await addressService.updateAddress(addressId, updatedData);

      expect(apiClient.patch).toHaveBeenCalledWith(`/users/me/addresses/${addressId}`, updatedData);
      expect(result.data).toEqual(mockResponse);
    });

    it('should handle 404 when address not found', async () => {
      const addressId = 'nonexistent';
      const updatedData = { label: 'Updated' };

      const error = {
        response: {
          status: 404,
          data: { detail: 'Address not found' },
        },
      };

      apiClient.patch.mockRejectedValue(error);

      await expect(addressService.updateAddress(addressId, updatedData)).rejects.toEqual(error);
    });
  });

  describe('deleteAddress', () => {
    it('should delete an address successfully', async () => {
      const addressId = '1';
      const mockResponse = { message: 'Address deleted successfully' };

      apiClient.delete.mockResolvedValue({ data: mockResponse });

      const result = await addressService.deleteAddress(addressId);

      expect(apiClient.delete).toHaveBeenCalledWith(`/users/me/addresses/${addressId}`);
      expect(result.data).toEqual(mockResponse);
    });

    it('should handle 404 when address not found', async () => {
      const addressId = 'nonexistent';

      const error = {
        response: {
          status: 404,
          data: { detail: 'Address not found' },
        },
      };

      apiClient.delete.mockRejectedValue(error);

      await expect(addressService.deleteAddress(addressId)).rejects.toEqual(error);
    });
  });

  describe('setDefaultAddress', () => {
    it('should set an address as default successfully', async () => {
      const addressId = '1';
      const mockResponse = {
        id: addressId,
        label: 'Home',
        is_default: true,
      };

      apiClient.patch.mockResolvedValue({ data: mockResponse });

      const result = await addressService.setDefaultAddress(addressId);

      expect(apiClient.patch).toHaveBeenCalledWith(`/users/me/addresses/${addressId}`, {
        is_default: true,
      });
      expect(result.data).toEqual(mockResponse);
    });

    it('should handle 404 when address not found', async () => {
      const addressId = 'nonexistent';

      const error = {
        response: {
          status: 404,
          data: { detail: 'Address not found' },
        },
      };

      apiClient.patch.mockRejectedValue(error);

      await expect(addressService.setDefaultAddress(addressId)).rejects.toEqual(error);
    });
  });
});
