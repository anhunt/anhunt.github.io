// ============================================
// DATA LOADING - Students modify this
// ============================================
/**
 * Load data from API - Students replace with their chosen endpoint
 */
async function loadData() {
  try {
    // TODO: Replace with student's chosen API
    const response = await fetch ('https://api.artic.edu/api/v1/artworks?limit=20&fields=id,title,artist_title,date_start,department_title,artwork_type_title,place_of_origin')
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to load data:", error);
    throw new Error("Could not load data from API");
  }
}

export default loadData