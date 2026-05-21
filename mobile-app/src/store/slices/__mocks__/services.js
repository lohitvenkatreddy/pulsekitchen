// Mock services for testing Redux slices
export const mockAddressService = {
  getAddresses: jest.fn(),
  addAddress: jest.fn(),
  updateAddress: jest.fn(),
  deleteAddress: jest.fn(),
  setDefaultAddress: jest.fn(),
};

export const mockPaymentService = {
  getPaymentMethods: jest.fn(),
  addPaymentMethod: jest.fn(),
  deletePaymentMethod: jest.fn(),
  setDefaultPaymentMethod: jest.fn(),
};

export const mockSettingsService = {
  getSettings: jest.fn(),
  updateNotifications: jest.fn(),
  updatePrivacy: jest.fn(),
  updateLanguage: jest.fn(),
  changePassword: jest.fn(),
  deleteAccount: jest.fn(),
};
