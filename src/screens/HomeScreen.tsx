import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { jellyfinApi } from '../services/jellyfinApi';
import { MediaItem, Library } from '../types/jellyfin';
import { FlashList } from '@shopify/flash-list';

type ViewMode = 'dashboard' | 'library';

const COLLECTION_COLORS: Record<string, string> = {
  movies: '#e74c3c',
  tvshows: '#9b59b6',
  music: '#2ecc71',
  books: '#f39c12',
  homevideos: '#1abc9c',
  boxsets: '#3498db',
  photos: '#1abc9c',
  playlists: '#e67e22',
};

const COLLECTION_LABELS: Record<string, string> = {
  movies: 'Movies',
  tvshows: 'TV Shows',
  music: 'Music',
  books: 'Books',
  homevideos: 'Home Videos',
  boxsets: 'Collections',
  photos: 'Photos',
  playlists: 'Playlists',
};

function getCollectionColor(collectionType?: string): string {
  if (collectionType && COLLECTION_COLORS[collectionType]) {
    return COLLECTION_COLORS[collectionType];
  }
  return '#555';
}

function getCollectionLabel(collectionType?: string): string {
  if (collectionType && COLLECTION_LABELS[collectionType]) {
    return COLLECTION_LABELS[collectionType];
  }
  return 'Media';
}

export default function HomeScreen() {
  const [continueWatching, setContinueWatching] = useState<MediaItem[]>([]);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  const [libraryItems, setLibraryItems] = useState<MediaItem[]>([]);
  const [loadingLibItems, setLoadingLibItems] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const loadData = useCallback(async () => {
    try {
      const [continueData, libs] = await Promise.all([
        jellyfinApi.getContinueWatching(),
        jellyfinApi.getLibraries(),
      ]);
      setContinueWatching(continueData);
      setLibraries(libs);
    } catch (error) {
      console.error('Error loading home data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    if (selectedLibrary) {
      await loadLibraryItems(selectedLibrary);
    }
    setRefreshing(false);
  }, [loadData, selectedLibrary]);

  const loadLibraryItems = async (library: Library) => {
    setLoadingLibItems(true);
    try {
      const items = await jellyfinApi.getMediaItems(library.Id);
      setLibraryItems(items);
    } catch (error) {
      console.error('Error loading library items:', error);
      setLibraryItems([]);
    } finally {
      setLoadingLibItems(false);
    }
  };

  const handleLibraryPress = async (library: Library) => {
    setSelectedLibrary(library);
    setViewMode('library');
    await loadLibraryItems(library);
  };

  const handleBackToDashboard = () => {
    setViewMode('dashboard');
    setSelectedLibrary(null);
    setLibraryItems([]);
  };

  const handleLogout = () => {
    logout();
  };

  const renderMediaCard = ({ item }: { item: MediaItem }) => (
    <TouchableOpacity style={styles.mediaCard} activeOpacity={0.7}>
      <Image
        source={{ uri: jellyfinApi.getImageUrl(item.Id, 'Primary') }}
        style={styles.mediaImage}
      />
      <View style={styles.mediaInfo}>
        <Text style={styles.mediaTitle} numberOfLines={1}>
          {item.Name}
        </Text>
        {item.ProductionYear ? (
          <Text style={styles.mediaYear}>{item.ProductionYear}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const renderLibraryCard = (library: Library) => {
    const color = getCollectionColor(library.CollectionType);
    const label = getCollectionLabel(library.CollectionType);
    return (
      <TouchableOpacity
        key={library.Id}
        style={[
          styles.libraryCard,
          selectedLibrary?.Id === library.Id && styles.libraryCardSelected,
          { borderColor: color },
        ]}
        onPress={() => handleLibraryPress(library)}
        activeOpacity={0.7}
      >
        <View style={[styles.libraryIconCircle, { backgroundColor: color }]}>
          <Text style={styles.libraryIconText}>{label[0]}</Text>
        </View>
        <Text style={styles.libraryName} numberOfLines={1}>{library.Name}</Text>
        <Text style={styles.libraryType}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderSection = (title: string, data: MediaItem[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {data.length > 0 ? (
        <FlashList
          data={data}
          renderItem={renderMediaCard}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          estimatedItemSize={200}
        />
      ) : (
        <Text style={styles.emptyText}>Nothing here yet</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {viewMode === 'library' ? (
            <TouchableOpacity onPress={handleBackToDashboard}>
              <Text style={styles.backText}>{'< Dashboard'}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.Name || 'Guest'}</Text>
            </>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/settings')} style={styles.iconButton}>
            <Text style={styles.settingsIcon}>[=]</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'dashboard' ? (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00acc1"
            />
          }
        >
          {continueWatching.length > 0 && renderSection('Continue Watching', continueWatching)}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Libraries</Text>
            {libraries.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
              >
                {libraries.map(renderLibraryCard)}
              </ScrollView>
            ) : (
              <Text style={styles.emptyText}>No libraries found</Text>
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.content}>
          <View style={styles.libraryHeader}>
            <Text style={styles.sectionTitle}>{selectedLibrary?.Name}</Text>
          </View>
          {loadingLibItems ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00acc1" />
            </View>
          ) : libraryItems.length > 0 ? (
            <FlashList
              data={libraryItems}
              renderItem={renderMediaCard}
              numColumns={3}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.gridContainer}
              estimatedItemSize={200}
            />
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={styles.emptyText}>This library is empty</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1a1a1a',
  },
  headerLeft: {
    flex: 1,
  },
  welcomeText: {
    color: '#999',
    fontSize: 14,
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  backText: {
    color: '#00acc1',
    fontSize: 16,
    marginTop: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  settingsIcon: {
    color: '#00acc1',
    fontSize: 20,
  },
  logoutText: {
    color: '#00acc1',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
    marginBottom: 12,
  },
  listContainer: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  gridContainer: {
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  mediaCard: {
    width: 120,
    marginRight: 12,
  },
  mediaImage: {
    width: 120,
    height: 180,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  mediaInfo: {
    marginTop: 8,
  },
  mediaTitle: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  mediaYear: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  libraryCard: {
    width: 130,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  libraryCardSelected: {
    borderColor: '#00acc1',
    backgroundColor: '#1a2a2e',
  },
  libraryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  libraryIconText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  libraryName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  libraryType: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
  },
  libraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
    marginTop: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 14,
  },
});
