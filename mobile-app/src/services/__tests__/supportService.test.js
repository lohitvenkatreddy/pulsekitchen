import supportService from '../supportService';
import apiClient from '../api';

// Mock the API client
jest.mock('../api');

describe('supportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('submitSupportRequest', () => {
    it('should submit support request without attachment', async () => {
      const requestData = {
        subject: 'Order not received',
        message: 'I did not receive my order from yesterday',
      };

      const mockResponse = {
        ticket_number: 'TICKET-12345',
        message: 'Support request submitted successfully',
      };

      apiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await supportService.submitSupportRequest(requestData);

      expect(apiClient.post).toHaveBeenCalledWith('/support/requests', {
        subject: requestData.subject,
        message: requestData.message,
      });
      expect(result.data).toEqual(mockResponse);
    });

    it('should submit support request with attachment', async () => {
      const mockFile = {
        uri: 'file:///path/to/file.pdf',
        name: 'receipt.pdf',
        type: 'application/pdf',
      };

      const requestData = {
        subject: 'Order issue',
        message: 'Issue with my order',
        attachment: mockFile,
      };

      const mockResponse = {
        ticket_number: 'TICKET-12346',
        message: 'Support request submitted successfully',
      };

      apiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await supportService.submitSupportRequest(requestData);

      expect(apiClient.post).toHaveBeenCalled();
      expect(result.data).toEqual(mockResponse);
    });

    it('should handle validation errors', async () => {
      const invalidRequest = {
        subject: '', // Empty subject
        message: 'Message',
      };

      const error = {
        response: {
          status: 400,
          data: { detail: 'Subject is required' },
        },
      };

      apiClient.post.mockRejectedValue(error);

      await expect(supportService.submitSupportRequest(invalidRequest)).rejects.toEqual(error);
    });

    it('should handle network errors', async () => {
      const requestData = {
        subject: 'Order issue',
        message: 'Issue with my order',
      };

      const error = new Error('Network error');
      apiClient.post.mockRejectedValue(error);

      await expect(supportService.submitSupportRequest(requestData)).rejects.toThrow(
        'Network error'
      );
    });

    it('should handle 401 unauthorized error', async () => {
      const requestData = {
        subject: 'Order issue',
        message: 'Issue with my order',
      };

      const error = {
        response: {
          status: 401,
          data: { detail: 'Token expired' },
        },
      };

      apiClient.post.mockRejectedValue(error);

      await expect(supportService.submitSupportRequest(requestData)).rejects.toEqual(error);
    });
  });

  describe('submitIssueReport', () => {
    it('should submit issue report without screenshot', async () => {
      const reportData = {
        issue_type: 'app_crash',
        description: 'App crashes when opening order history',
      };

      const mockResponse = {
        report_id: 'REPORT-789',
        message: 'Issue report submitted successfully',
      };

      apiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await supportService.submitIssueReport(reportData);

      expect(apiClient.post).toHaveBeenCalledWith('/support/issues', {
        issue_type: reportData.issue_type,
        description: reportData.description,
      });
      expect(result.data).toEqual(mockResponse);
    });

    it('should submit issue report with screenshot', async () => {
      const mockScreenshot = {
        uri: 'file:///path/to/screenshot.png',
        name: 'screenshot.png',
        type: 'image/png',
      };

      const reportData = {
        issue_type: 'ui_bug',
        description: 'Button is not clickable',
        screenshot: mockScreenshot,
      };

      const mockResponse = {
        report_id: 'REPORT-790',
        message: 'Issue report submitted successfully',
      };

      apiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await supportService.submitIssueReport(reportData);

      expect(apiClient.post).toHaveBeenCalled();
      expect(result.data).toEqual(mockResponse);
    });

    it('should handle validation errors', async () => {
      const invalidReport = {
        issue_type: '', // Empty issue type
        description: 'Description',
      };

      const error = {
        response: {
          status: 400,
          data: { detail: 'Issue type is required' },
        },
      };

      apiClient.post.mockRejectedValue(error);

      await expect(supportService.submitIssueReport(invalidReport)).rejects.toEqual(error);
    });

    it('should handle different issue types', async () => {
      const issueTypes = ['app_crash', 'ui_bug', 'payment_issue', 'delivery_issue', 'other'];

      for (const issueType of issueTypes) {
        const reportData = {
          issue_type: issueType,
          description: 'Test issue',
        };

        apiClient.post.mockResolvedValue({
          data: { report_id: 'REPORT-123', message: 'Success' },
        });

        const result = await supportService.submitIssueReport(reportData);
        expect(result.data).toBeDefined();
      }
    });

    it('should handle server errors', async () => {
      const reportData = {
        issue_type: 'app_crash',
        description: 'App crashes',
      };

      const error = {
        response: {
          status: 500,
          data: { detail: 'Internal server error' },
        },
      };

      apiClient.post.mockRejectedValue(error);

      await expect(supportService.submitIssueReport(reportData)).rejects.toEqual(error);
    });
  });

  describe('getFAQ', () => {
    it('should fetch FAQ successfully', async () => {
      const mockFAQ = [
        {
          id: '1',
          category: 'Account',
          question: 'How do I reset my password?',
          answer: 'You can reset your password by clicking...',
        },
        {
          id: '2',
          category: 'Orders',
          question: 'Can I modify my order?',
          answer: 'You can modify your order within 5 minutes...',
        },
      ];

      apiClient.get.mockResolvedValue({ data: mockFAQ });

      const result = await supportService.getFAQ();

      expect(apiClient.get).toHaveBeenCalledWith('/support/faq');
      expect(result.data).toEqual(mockFAQ);
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      apiClient.get.mockRejectedValue(error);

      await expect(supportService.getFAQ()).rejects.toThrow('Network error');
    });

    it('should handle 401 unauthorized error', async () => {
      const error = {
        response: {
          status: 401,
          data: { detail: 'Token expired' },
        },
      };

      apiClient.get.mockRejectedValue(error);

      await expect(supportService.getFAQ()).rejects.toEqual(error);
    });

    it('should handle empty FAQ list', async () => {
      apiClient.get.mockResolvedValue({ data: [] });

      const result = await supportService.getFAQ();

      expect(result.data).toEqual([]);
    });
  });
});
