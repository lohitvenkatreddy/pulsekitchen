import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import supportService from '../services/supportService';

const FAQ_DATA = [
  {
    category: 'Account',
    items: [
      {
        question: 'How do I create an account?',
        answer: 'You can create an account by clicking the Register button on the login screen and providing your email, password, and phone number.',
      },
      {
        question: 'How do I reset my password?',
        answer: 'Open Settings and use Change Password while signed in.',
      },
    ],
  },
  {
    category: 'Orders',
    items: [
      {
        question: 'How do I track my order?',
        answer: 'Go to Order History and tap on any order to see real-time tracking information.',
      },
      {
        question: 'Can I cancel my order?',
        answer: 'You can cancel orders that are still pending. Once the restaurant starts preparing, cancellation is not available.',
      },
    ],
  },
  {
    category: 'Delivery',
    items: [
      {
        question: 'How long does delivery take?',
        answer: 'Delivery times vary by restaurant and location, typically between 30-60 minutes.',
      },
      {
        question: 'Do you deliver to my area?',
        answer: 'Enter your address during checkout to see if we deliver to your location.',
      },
    ],
  },
  {
    category: 'Payments',
    items: [
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards, debit cards, and digital wallets.',
      },
      {
        question: 'Is my payment information secure?',
        answer: 'Yes, all payments are encrypted and processed securely. We never store full card details.',
      },
    ],
  },
  {
    category: 'Technical',
    items: [
      {
        question: 'The app is crashing. What should I do?',
        answer: 'Try uninstalling and reinstalling the app. If the problem persists, contact support.',
      },
      {
        question: 'I\'m having trouble logging in.',
        answer: 'Make sure you\'re using the correct email and password. Try resetting your password if you forgot it.',
      },
    ],
  },
];

export default function HelpSupportScreen() {
  const [faqData, setFaqData] = useState(FAQ_DATA);
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('Account');

  const categories = faqData.map((item) => item.category);
  const currentFAQ = faqData.find((item) => item.category === selectedCategory);

  useEffect(() => {
    let isMounted = true;
    supportService
      .getFAQ()
      .then((response) => {
        if (isMounted && Array.isArray(response.data) && response.data.length > 0) {
          setFaqData(response.data);
        }
      })
      .catch(() => null);
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (categories.length > 0 && !categories.includes(selectedCategory)) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  const handleCallSupport = useCallback(() => {
    Linking.openURL('tel:+919866629420');
  }, []);

  const handleEmailSupport = useCallback(() => {
    Linking.openURL('mailto:lohilohith047@gmail.com?subject=Support Request');
  }, []);

  const renderFAQItem = (item, index) => (
    <TouchableOpacity
      key={index}
      style={styles.faqItem}
      onPress={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
    >
      <View style={styles.faqQuestion}>
        <Text style={styles.faqQuestionText}>{item.question}</Text>
        <Text style={styles.faqToggle}>{expandedFAQ === index ? '−' : '+'}</Text>
      </View>
      {expandedFAQ === index && (
        <Text style={styles.faqAnswer}>{item.answer}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* FAQ Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

        <View style={styles.categoryTabs}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryTab,
                selectedCategory === category && styles.categoryTabActive,
              ]}
              onPress={() => {
                setSelectedCategory(category);
                setExpandedFAQ(null);
              }}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  selectedCategory === category && styles.categoryTabTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.faqContainer}>
          {currentFAQ?.items.map((item, index) => renderFAQItem(item, index))}
        </View>
      </View>

      {/* Contact Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Support</Text>
        <TouchableOpacity style={styles.actionButton} onPress={handleCallSupport}>
          <Text style={styles.actionButtonIcon}>☎️</Text>
          <View style={styles.actionButtonContent}>
            <Text style={styles.actionButtonTitle}>Call Support</Text>
            <Text style={styles.actionButtonSubtitle}>+91 9866629420</Text>
          </View>
          <Text style={styles.actionButtonArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleEmailSupport}>
          <Text style={styles.actionButtonIcon}>✉️</Text>
          <View style={styles.actionButtonContent}>
            <Text style={styles.actionButtonTitle}>Email Support</Text>
            <Text style={styles.actionButtonSubtitle}>lohilohith047@gmail.com</Text>
          </View>
          <Text style={styles.actionButtonArrow}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 15,
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  categoryTabs: {
    flexDirection: 'row',
    marginBottom: 15,
    marginHorizontal: -15,
    paddingHorizontal: 15,
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  categoryTabActive: {
    backgroundColor: '#000',
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  categoryTabTextActive: {
    color: '#fff',
  },
  faqContainer: {
    marginTop: 10,
  },
  faqItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  faqQuestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  faqToggle: {
    fontSize: 20,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  faqAnswer: {
    fontSize: 13,
    color: '#666',
    paddingHorizontal: 12,
    paddingBottom: 12,
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actionButtonSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  actionButtonArrow: {
    fontSize: 20,
    color: '#ccc',
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    fontSize: 24,
    color: '#333',
    fontWeight: 'bold',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  formContent: {
    flex: 1,
    padding: 15,
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  inputError: {
    borderColor: '#f44336',
  },
  textArea: {
    minHeight: 120,
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
  },
  issueTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  issueTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  issueTypeButtonActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  issueTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  issueTypeTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
