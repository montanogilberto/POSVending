export const saveImage = async (filename: string, base64: string): Promise<string> => {
  try {
    const response = await fetch('https://smartloansbackend.azurewebsites.net/save_image', { // Replace with actual backend endpoint
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename,
        base64,
      }),
    });

    if (!response.ok) {
      console.warn(`Image save failed with status ${response.status}, using local path`);
      // Fallback to a local path if backend fails
      return `/public/assets/${filename}`;
    }

    const data = await response.json();
    return data.filepath; // Assuming backend returns the filepath
  } catch (error) {
    console.warn('Error saving image, using local path:', error);
    // Fallback to a local path if backend fails
    return `/public/assets/${filename}`;
  }
};
