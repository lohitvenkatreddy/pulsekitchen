import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButtonTouchable}
          hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Close privacy policy"
        >
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={styles.updated}>Last updated: May 20, 2026</Text>
        <Text style={styles.intro}>
          PulseKitchen uses only the information needed to create your account,
          place orders, deliver food, process payments, and keep you updated about
          your order.
        </Text>

        <PolicySection
          title="Information We Collect"
          body="We collect your name, email address, phone number, saved delivery addresses, selected map coordinates, order details, payment references, support requests, and app activity needed to run the service."
        />
        <PolicySection
          title="How We Use It"
          body="We use your information to authenticate your account, verify signup by email OTP, route orders to restaurants, calculate delivery estimates, assign delivery partners, send order confirmations, and provide support."
        />
        <PolicySection
          title="Location Data"
          body="Delivery coordinates are used to calculate distance and estimated travel time from the restaurant to your delivery location. We do not use delivery coordinates for unrelated advertising."
        />
        <PolicySection
          title="Email and Notifications"
          body="We send transactional messages such as signup OTPs and order confirmations. Marketing messages should only be sent where you have opted in or where the law allows it."
        />
        <PolicySection
          title="Data Sharing"
          body="We share order information with the restaurant preparing your order and delivery details with the assigned delivery partner. Payment processing and email delivery may use trusted service providers."
        />
        <PolicySection
          title="Account Deletion"
          body="You can request account deletion from Settings. Deletion removes your account access and personal profile where possible, while records needed for safety, dispute handling, accounting, or legal obligations may be retained."
        />
        <PolicySection
          title="Security"
          body="Passwords are stored as hashes, signup OTPs are short-lived, and sensitive actions require authentication. No system is perfect, but the app is designed to limit unnecessary exposure."
        />
        <PolicySection
          title="Contact"
          body="For privacy questions, contact lohilohith047@gmail.com."
        />
      </ScrollView>
    </View>
  );
}

function PolicySection({ title, body }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 52,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButtonTouchable: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    fontSize: 24,
    color: '#333',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
    paddingBottom: 32,
  },
  updated: {
    fontSize: 12,
    color: '#777',
    marginBottom: 12,
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    marginBottom: 18,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 21,
    color: '#555',
  },
});
