import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { jellyfinApi } from '../services/jellyfinApi';
import { SystemInfo, UserDto } from '../types/jellyfin';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, serverUrl, logout } = useAuthStore();
  const [serverInfo, setServerInfo] = useState<SystemInfo | null>(null);
  const [userInfo, setUserInfo] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInfo();
  }, []);

  const loadInfo = async () => {
    setLoading(true);
    try {
      const [si, ui] = await Promise.all([
        jellyfinApi.getServerInfo(),
        jellyfinApi.getCurrentUser(),
      ]);
      setServerInfo(si);
      setUserInfo(ui);
    } catch {
      // silently fail - show what we have from store
    } finally {
      setLoading(false);
    }
  };

  const handleChangeServer = () => {
    Alert.alert(
      'Change Server',
      'This will disconnect you from the current server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/server-setup');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/server-setup');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#00acc1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Server Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Server</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: '#00acc1' }]} />
            <View style={styles.col}>
              <Text style={styles.cardTitle}>
                {serverInfo?.ServerName || 'Jellyfin Server'}
              </Text>
              <Text style={styles.cardSub}>
                v{serverInfo?.Version || '...'}
              </Text>
              <Text style={styles.cardSub} numberOfLines={1}>
                {serverUrl}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* User Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>User</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            {user?.PrimaryImageTag ? (
              <Image
                source={{
                  uri: jellyfinApi.getImageUrl(user.Id, 'Primary'),
                }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarLetter}>
                  {(user?.Name || '?')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.col}>
              <Text style={styles.cardTitle}>{user?.Name || 'Unknown'}</Text>
              {userInfo?.Policy?.IsAdministrator && (
                <Text style={styles.badge}>Administrator</Text>
              )}
              {userInfo?.LastActivityDate && (
                <Text style={styles.cardSub}>
                  Last active: {new Date(userInfo.LastActivityDate).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>App Version</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Framework</Text>
            <Text style={styles.settingValue}>React Native (Expo)</Text>
          </View>
          {serverInfo?.OperatingSystem && (
            <>
              <View style={styles.divider} />
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Server OS</Text>
                <Text style={styles.settingValue} numberOfLines={1}>
                  {serverInfo.OperatingSystem}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Actions */}
      <TouchableOpacity style={styles.actionButton} onPress={handleChangeServer}>
        <Text style={styles.actionButtonText}>Change Server</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, styles.logoutButton]}
        onPress={handleLogout}
      >
        <Text style={[styles.actionButtonText, styles.logoutText]}>
          Logout
        </Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        JellyfinMobile is not affiliated with the Jellyfin project.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1a1a1a',
  },
  backText: {
    color: '#00acc1',
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  col: {
    flex: 1,
    marginLeft: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cardSub: {
    color: '#999',
    fontSize: 13,
    marginTop: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: '#00acc1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  badge: {
    color: '#00acc1',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 14,
  },
  settingValue: {
    color: '#999',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a2a',
  },
  actionButton: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  logoutText: {
    color: '#e74c3c',
  },
  footer: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 32,
  },
});
