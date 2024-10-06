import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, FlatList, Image, StyleSheet, ActivityIndicator, Modal, TouchableOpacity, Text, Share, Alert, PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs'; // Import RNFS to handle file download
import { searchImages } from '../UnsplashService';

const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const [images, setImages] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isEndReached, setIsEndReached] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // For preview modal
  const [likedImages, setLikedImages] = useState({}); // Track liked images

  // Function to fetch images based on the page number
  const fetchImages = async (pageToFetch) => {
    if (loading) return; // Prevent multiple fetches at the same time
    setLoading(true);
    try {
      const results = await searchImages(query, pageToFetch);
      if (results.length === 0) {
        setIsEndReached(true); // Stop loading if no more images are returned
      } else {
        setImages((prevImages) => [...prevImages, ...results]); // Append new results
      }
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setLoading(false); // Stop loading
    }
  };

  // Function to handle the search button
  const handleSearch = () => {
    setPage(1); // Reset page number to 1
    setImages([]); // Clear previous images
    setIsEndReached(false); // Reset the end reached flag
    fetchImages(1); // Fetch the first page
  };

  // Handle when the user scrolls to the end of the list
  const handleEndReached = () => {
    if (!isEndReached && !loading) {
      setPage((prevPage) => prevPage + 1); // Increase the page number
    }
  };

  // Fetch more images when the page number changes
  useEffect(() => {
    if (page > 1) {
      fetchImages(page);
    }
  }, [page]);

  // Function to close the image preview modal
  const closePreview = () => {
    setSelectedImage(null); // Clear the selected image
  };

  // Function to share the image
  const handleShare = async (imageUrl) => {
    try {
      const result = await Share.share({
        message: `Check out this awesome image: ${imageUrl}`,
        url: imageUrl,
      });
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log('Shared with activity type:', result.activityType);
        } else {
          console.log('Shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        console.log('Share dismissed');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Function to download the image
  const handleDownload = async (imageUrl) => {
    const fileName = imageUrl.split('/').pop(); // Get the image file name

    let downloadDest;

    // For Android, save it to the Downloads directory
    if (Platform.OS === 'android') {
      downloadDest = `${RNFS.ExternalStorageDirectoryPath}/Download/${fileName}`;
    } else {
      // For iOS, save it to the Document directory
      downloadDest = `${RNFS.DocumentDirectoryPath}/${fileName}`;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: "Storage Permission",
          message: "This app needs access to your storage to download images",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        const downloadResult = await RNFS.downloadFile({
          fromUrl: imageUrl,
          toFile: downloadDest,
        }).promise;

        if (downloadResult.statusCode === 200) {
          Alert.alert('Download Success', `Image downloaded successfully to: ${downloadDest}`);
        } else {
          Alert.alert('Download Failed', 'Failed to download the image.');
        }
      } else {
        Alert.alert('Permission Denied', 'Cannot download without permission.');
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      Alert.alert('Download Error', 'An error occurred while downloading the image.');
    }
  };

  // Toggle the "like" state for an image
  const handleLike = (imageId) => {
    setLikedImages((prevLikedImages) => ({
      ...prevLikedImages,
      [imageId]: !prevLikedImages[imageId], // Toggle like status
    }));
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Search images"
          placeholderTextColor="gray"
          value={query}
          onChangeText={(text) => setQuery(text)}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Image List */}
      <FlatList
        data={images}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.imageContainer}>
            <TouchableOpacity onPress={() => setSelectedImage(item.urls.regular)}>
              <Image source={{ uri: item.urls.small }} style={styles.image} />
            </TouchableOpacity>
            
            {/* Like Emoji overlay */}
            <TouchableOpacity onPress={() => handleLike(item.id)} style={styles.likeButton}>
              <Text style={styles.likeText}>
                {likedImages[item.id] ? '❤️' : '🤍'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5} // Trigger pagination when halfway to the end
        ListFooterComponent={loading && <ActivityIndicator size="large" color="#0000ff" />} // Show spinner
      />

      {/* Image Preview Modal */}
      {selectedImage && (
        <Modal
          visible={!!selectedImage}
          transparent={true}
          animationType="fade"
          onRequestClose={closePreview}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Image source={{ uri: selectedImage }} style={styles.fullImage} />
              <View style={styles.buttonContainer}>
                <TouchableOpacity onPress={closePreview} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleShare(selectedImage)} style={styles.shareButton}>
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDownload(selectedImage)} style={styles.downloadButton}>
                  <Text style={styles.downloadButtonText}>Download</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0', padding: 10 },
  searchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
    backgroundColor: '#fff',
  },
  searchButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  imageContainer: {
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    backgroundColor: '#fff',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  likeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Semi-transparent background for emoji
    borderRadius: 20,
    padding: 5,
  },
  likeText: {
    fontSize: 24, // Emoji size
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
  },
  fullImage: {
    width: '100%',
    height: '90%',
    resizeMode: 'contain',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
  },
  closeButton: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  shareButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  downloadButton: {
    backgroundColor: '#28A745',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default SearchScreen;
