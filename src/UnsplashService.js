import axios from 'axios';

const API_URL = 'https://api.unsplash.com';
const ACCESS_KEY = '8L5-qZmHJ26GfX1nINIk24JEWQTW8HE6MfOTpCkXwO8';

export const searchImages = async (query, page = 1) => {
    try {
        const response = await axios.get(`${API_URL}/search/photos`, {
            params: {
                query: query,
                page: page,
                per_page: 20, // Fetch 20 images per page
                client_id: ACCESS_KEY,
            },
        });
        console.log(response.data); // Log the entire response
        return response.data.results; // Return only the results array
    } catch (error) {
        console.error("Error fetching images: ", error);
        return [];
    }
};