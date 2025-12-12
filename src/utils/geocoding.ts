/**
 * Reverse geocoding utility to convert coordinates to address
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    // Using OpenStreetMap Nominatim API (free, no key required)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'TraccarApp/1.0',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data && data.address) {
      const addr = data.address;
      // Build a readable address
      const parts: string[] = [];
      
      if (addr.road) parts.push(addr.road);
      if (addr.house_number) parts[0] = `${addr.house_number} ${parts[0] || ''}`.trim();
      if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood);
      if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
      if (addr.state) parts.push(addr.state);
      if (addr.country) parts.push(addr.country);
      
      return parts.length > 0 ? parts.join(', ') : data.display_name || null;
    }
    
    return data.display_name || null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

