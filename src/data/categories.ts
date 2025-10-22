//export const categories = [
    //{ id: 'percherones', name: 'Percherones', image: '/assets/burros.jpg' },
    //{ id: 'kesadillas', name: 'Kesadillas', image: '/assets/quesadilles-de-pollastre-ametlle.webp' },
    //{ id: 'tacos', name: 'Tacos', image: '/assets/Tacos-Adobada.webp' },
    //{ id: 'boneless', name: 'Boneless', image: '/assets/Boneless.jpg' },
    //{ id: 'entradas', name: 'Entradas', image: '/assets/Cono_papa.png' },
    //{ id: 'bebidas', name: 'Bebidas', image: '/assets/te-arizona.webp' }
  //];

  export interface Categories {
    productCategoryId: number;
    name: string;
    image: string;
  }

  export async function fetchCategories(): Promise<Categories[]> {
    try {
      const response = await fetch('https://smartloansbackend.azurewebsites.net/by_company_products_category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_categories: [
            {
              companyId: "1"
            }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error(`Error al obtener categorías: ${response.status}`);
      }

      const data = await response.json();
      const fetchedCategories: Categories[] = data.product_categories || [];
      return fetchedCategories;
    } catch (error) {
      console.error('Error fetching products categories:', error);
      return [];  // Return empty array if the fetch fails
    }
  }
  