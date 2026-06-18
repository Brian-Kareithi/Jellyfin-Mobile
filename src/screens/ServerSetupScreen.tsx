import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { jellyfinApi } from '../services/jellyfinApi';

export default function ServerSetupScreen() {
  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { setServerUrl: saveServerUrl } = useAuthStore();
  const router = useRouter();

  const normalizeUrl = (input: string): string => {
    let url = input.trim();
    if (url.length === 0) return url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url;
    }
    return url;
  };

  const handleConnect = async () => {
    const url = normalizeUrl(serverUrl);
    if (!url) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }

    setLoading(true);
    try {
      const info = await jellyfinApi.testConnection(url);
      saveServerUrl(url);
      Alert.alert(
        'Connected',
        `Connected to ${info.ServerName} (v${info.Version})`,
        [{ text: 'Continue', onPress: () => router.replace('/login') }]
      );
    } catch (e: any) {
      let parts = [`Failed to connect to ${url}\n`];
      if (e.status) {
        parts.push(`HTTP ${e.status} ${e.statusText}`);
        if (e.body) parts.push(`\nResponse: ${e.body}`);
      } else if (e.type === 'network') {
        parts.push('Cannot reach the server.\n');
        parts.push('Check:\n1. Server is running\n2. Correct hostname/IP\n3. Correct port\n4. Connected to network/VPN');
        parts.push(`\nDetail: ${e.message}`);
      } else if (e.message?.includes('timed out')) {
        parts.push('Request timed out after 10 seconds.\nServer is not responding.');
      } else {
        parts.push(`${e.message || 'Unknown error'}`);
      }
      Alert.alert('Connection Failed', parts.join('\n'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Connect to Jellyfin</Text>
        <Text style={styles.subtitle}>Enter your Jellyfin server URL</Text>

        <TextInput
          style={styles.input}
          placeholder="servername:8096 or 192.168.1.100:8096"
          placeholderTextColor="#666"
          value={serverUrl}
          onChangeText={setServerUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={handleConnect}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleConnect}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Connect</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#00acc1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
