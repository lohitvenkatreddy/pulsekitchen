import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import settingsService from '../services/settingsService';

export default function SettingsScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const validatePassword = useCallback((password) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const isLongEnough = password.length >= 8;

    return hasUpperCase && hasLowerCase && hasNumber && isLongEnough;
  }, []);

  const validatePasswordForm = useCallback(() => {
    const errors = {};

    if (!passwordFormData.current_password.trim()) {
      errors.current_password = 'Current password is required';
    }

    if (!passwordFormData.new_password.trim()) {
      errors.new_password = 'New password is required';
    } else if (!validatePassword(passwordFormData.new_password)) {
      errors.new_password =
        'Password must be at least 8 characters with uppercase, lowercase, and numbers';
    }

    if (!passwordFormData.confirm_password.trim()) {
      errors.confirm_password = 'Confirm password is required';
    } else if (passwordFormData.new_password !== passwordFormData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  }, [passwordFormData, validatePassword]);

  const handleChangePassword = useCallback(async () => {
    if (!validatePasswordForm()) return;

    try {
      setIsSubmittingPassword(true);
      await settingsService.changePassword(user.id, {
        current_password: passwordFormData.current_password,
        new_password: passwordFormData.new_password,
      });

      Alert.alert('Success', 'Password changed successfully');
      setPasswordFormData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setShowPasswordForm(false);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to change password');
    } finally {
      setIsSubmittingPassword(false);
    }
  }, [passwordFormData, user?.id, validatePasswordForm]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await settingsService.deleteAccount(user.id);
              dispatch(logout());
              Alert.alert('Account Deleted', 'Your account has been successfully deleted');
            } catch (err) {
              Alert.alert('Error', err.response?.data?.detail || 'Failed to delete account');
            }
          },
        },
      ]
    );
  }, [dispatch, user?.id]);

  const handleViewPrivacyPolicy = useCallback(() => {
    navigation.navigate('PrivacyPolicy');
  }, [navigation]);

  const renderPasswordForm = () => (
    <Modal
      visible={showPasswordForm}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {
        setShowPasswordForm(false);
        setPasswordFormData({
          current_password: '',
          new_password: '',
          confirm_password: '',
        });
        setPasswordErrors({});
      }}
    >
      <View style={styles.formContainer}>
        <View style={styles.formHeader}>
          <TouchableOpacity
            style={styles.closeButtonTouchable}
            hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}
            onPress={() => {
              setShowPasswordForm(false);
              setPasswordFormData({
                current_password: '',
                new_password: '',
                confirm_password: '',
              });
              setPasswordErrors({});
            }}
          >
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.formTitle}>Change Password</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView style={styles.formContent}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Current Password *</Text>
            <TextInput
              style={[styles.input, passwordErrors.current_password && styles.inputError]}
              placeholder="Enter your current password"
              value={passwordFormData.current_password}
              onChangeText={(text) => {
                setPasswordFormData((prev) => ({ ...prev, current_password: text }));
                if (passwordErrors.current_password)
                  setPasswordErrors((prev) => ({ ...prev, current_password: '' }));
              }}
              secureTextEntry
            />
            {passwordErrors.current_password && (
              <Text style={styles.errorText}>{passwordErrors.current_password}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>New Password *</Text>
            <TextInput
              style={[styles.input, passwordErrors.new_password && styles.inputError]}
              placeholder="Enter your new password"
              value={passwordFormData.new_password}
              onChangeText={(text) => {
                setPasswordFormData((prev) => ({ ...prev, new_password: text }));
                if (passwordErrors.new_password)
                  setPasswordErrors((prev) => ({ ...prev, new_password: '' }));
              }}
              secureTextEntry
            />
            {passwordErrors.new_password && (
              <Text style={styles.errorText}>{passwordErrors.new_password}</Text>
            )}
            <Text style={styles.passwordHint}>
              At least 8 characters with uppercase, lowercase, and numbers
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput
              style={[styles.input, passwordErrors.confirm_password && styles.inputError]}
              placeholder="Confirm your new password"
              value={passwordFormData.confirm_password}
              onChangeText={(text) => {
                setPasswordFormData((prev) => ({ ...prev, confirm_password: text }));
                if (passwordErrors.confirm_password)
                  setPasswordErrors((prev) => ({ ...prev, confirm_password: '' }));
              }}
              secureTextEntry
            />
            {passwordErrors.confirm_password && (
              <Text style={styles.errorText}>{passwordErrors.confirm_password}</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleChangePassword}
            disabled={isSubmittingPassword}
          >
            {isSubmittingPassword ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Change Password</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowPasswordForm(true)}
        >
          <Text style={styles.actionButtonLabel}>Change Password</Text>
          <Text style={styles.actionButtonArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleViewPrivacyPolicy}
        >
          <Text style={styles.actionButtonLabel}>View Privacy Policy</Text>
          <Text style={styles.actionButtonArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDeleteAccount}
        >
          <Text style={[styles.actionButtonLabel, styles.deleteButtonText]}>Delete Account</Text>
          <Text style={[styles.actionButtonArrow, styles.deleteButtonArrow]}>›</Text>
        </TouchableOpacity>
      </View>

      {renderPasswordForm()}
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
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actionButtonArrow: {
    fontSize: 20,
    color: '#ccc',
  },
  deleteButton: {
    borderBottomWidth: 0,
  },
  deleteButtonText: {
    color: '#f44336',
  },
  deleteButtonArrow: {
    color: '#f44336',
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
  closeButtonTouchable: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
  },
  passwordHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
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
