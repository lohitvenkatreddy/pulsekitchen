import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { register, requestSignupOtp } from '../store/slices/authSlice';

export default function RegisterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone_number: '',
    email_otp: '',
  });
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const dispatch = useDispatch();

  const validateBaseFields = () => {
    const { full_name, email, password, confirm_password, phone_number } = formData;

    if (!full_name || !email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return null;
    }

    if (password !== confirm_password) {
      Alert.alert('Error', 'Passwords do not match');
      return null;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return null;
    }

    return { full_name, email, password, phone_number };
  };

  const handleSendOtp = async () => {
    const validData = validateBaseFields();
    if (!validData) {
      return;
    }

    setLoading(true);
    try {
      const response = await dispatch(requestSignupOtp({
        full_name: validData.full_name,
        email: validData.email,
      })).unwrap();
      setOtpSent(true);
      Alert.alert('OTP Sent', response.message || 'Check your email for the signup code.');
    } catch (err) {
      Alert.alert('OTP Failed', String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const validData = validateBaseFields();
    if (!validData) {
      return;
    }

    if (!formData.email_otp || formData.email_otp.length !== 6) {
      Alert.alert('Error', 'Enter the 6-digit OTP sent to your email');
      return;
    }

    setLoading(true);
    try {
      await dispatch(register({
        full_name: validData.full_name,
        email: validData.email,
        password: validData.password,
        phone_number: validData.phone_number,
        role: 'customer',
        email_otp: formData.email_otp,
      })).unwrap();
      Alert.alert('Success', 'Account created! Please sign in.');
      navigation.navigate('Login');
    } catch (err) {
      Alert.alert('Registration Failed', String(err));
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    if (field === 'email') {
      setOtpSent(false);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join PulseKitchen for your next meal</Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name *"
        value={formData.full_name}
        onChangeText={(v) => updateField('full_name', v)}
      />

      <TextInput
        style={styles.input}
        placeholder="Email *"
        value={formData.email}
        onChangeText={(v) => updateField('email', v)}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        value={formData.phone_number}
        onChangeText={(v) => updateField('phone_number', v)}
        keyboardType="phone-pad"
      />

      <TextInput
        style={styles.input}
        placeholder="Password *"
        value={formData.password}
        onChangeText={(v) => updateField('password', v)}
        secureTextEntry
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm Password *"
        value={formData.confirm_password}
        onChangeText={(v) => updateField('confirm_password', v)}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.secondaryButton, loading && styles.buttonDisabled]}
        onPress={handleSendOtp}
        disabled={loading}
      >
        <Text style={styles.secondaryButtonText}>
          {otpSent ? 'Resend Email OTP' : 'Send Email OTP'}
        </Text>
      </TouchableOpacity>

      {otpSent && (
        <>
          <Text style={styles.otpHint}>Enter the 6-digit code sent to {formData.email}</Text>
          <TextInput
            style={styles.input}
            placeholder="Email OTP *"
            value={formData.email_otp}
            onChangeText={(v) => updateField('email_otp', v.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
          />
        </>
      )}

      <TouchableOpacity
        style={[styles.button, (!otpSent || loading) && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={!otpSent || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Create Customer Account</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>
          Already have an account? <Text style={styles.linkBold}>Sign In</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 15,
  },
  secondaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  otpHint: {
    color: '#666',
    fontSize: 13,
    marginBottom: 8,
  },
  link: {
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 40,
    color: '#666',
  },
  linkBold: {
    fontWeight: 'bold',
    color: '#000',
  },
});
