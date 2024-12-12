import { createEnhancedAxios } from "./api/EnhancedAxios";
import { StorageType } from "./storage/TokenStorage";
import { API_ENDPOINTS } from "./config/endpoints";

// Initialize EnhancedAxios with default configuration
const enhancedAxios = createEnhancedAxios({
  baseURL: process.env.API_BASE_URL || "https://api.example.com",
  timeout: 30000,
  tokenStorageType: StorageType.LOCAL_STORAGE, // Change as per requirement
  cache: true, // Enable caching
  retryCount: 3, // Set retry count for failed requests
});

// Example of setting a token (this can be done after login)
async function initializeAuthToken() {
  const token = "your-auth-token"; // Replace with dynamic token retrieval logic
  await enhancedAxios.saveToken(token);
}

// Example of making an API request
async function fetchUserData() {
  try {
    const userData = await enhancedAxios.get(API_ENDPOINTS.USER_PROFILE);
    console.log("User Data:", userData);
  } catch (error) {
    console.error("Error fetching user data:", error);
  }
}

// Example of handling logout (clearing the token)
async function handleLogout() {
  try {
    await enhancedAxios.removeToken();
    console.log("User logged out successfully.");
  } catch (error) {
    console.error("Error during logout:", error);
  }
}

// Main function to bootstrap your application
async function main() {
  console.log("Starting application...");

  try {
    // Initialize authentication token if necessary
    await initializeAuthToken();

    // Make an example API request
    await fetchUserData();
  } catch (error) {
    console.error("Application initialization error:", error);
  }

  // Optionally, handle logout (for demonstration)
  await handleLogout();
}

// Start the application
main().catch((error) => {
  console.error("Critical error:", error);
});
