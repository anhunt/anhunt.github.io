
/**
 * CARD VIEW - PROVIDED AS EXAMPLE
 * Display data as browsable cards - good for comparing individual items
 */
function showCards(data) {
  const cardHTML = data
    .map(
       /*html*/ 
      (restaurant) => `
                <div class="restaurant-card">
                    <h3>${restaurant.name}</h3>
                    <p><strong>Cuisine:</strong> ${restaurant.cuisine}</p>
                    <p><strong>Rating:</strong> ${
                      restaurant.rating
                    }⭐ | <strong>Price:</strong> ${restaurant.priceRange}</p>
                    <p><strong>Location:</strong> ${restaurant.neighborhood}</p>
                    <p><strong>Phone:</strong> ${restaurant.phoneNumber}</p>
                    <p><strong>Specialties:</strong> ${restaurant.specialties.join(
                      ", "
                    )}</p>
                </div>
            `
    )
    .join("");
     /*html*/ 
  return `
                <h2 class="view-title">🃏 Card View</h2>
                <p class="view-description">Browse restaurants as individual cards - perfect for comparing options</p>
                <div class="card-grid">
                    ${cardHTML}
                </div>
            `;
}

export default showCards;