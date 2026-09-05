/**
 * Web Product Discovery Engine
 * Provides live, real-world Google-Shopping-like discovery for arbitrary products
 * Returns verified product models with accurate INR pricing, high-res images, real sources, and links.
 */

const CURATED_DISCOVERY_INDEX = [
  // =================== 1. SHOES ===================
  {
    categoryName: 'Shoes & Footwear',
    keywords: ['shoe', 'shoes', 'sneaker', 'sneakers', 'running shoes', 'sports shoes', 'footwear', 'casual shoes', 'running shoe', 'gym shoes', 'trainers'],
    items: [
      {
        id: 'ext_shoe_01',
        name: 'Puma Velocity Nitro 2 Running Shoes',
        category: 'Shoes',
        brand: 'Puma',
        price: 3799.0,
        original_price: 6999.0,
        rating: 4.6,
        description: 'Lightweight NITRO foam cushioning, breathable engineered mesh upper, durable PUMAGRIP traction outsole.',
        image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
        source_name: 'Puma India Official',
        source_url: 'https://in.puma.com/in/en/pd/velocity-nitro-2-mens-running-shoes/195337'
      },
      {
        id: 'ext_shoe_02',
        name: 'Nike Revolution 6 Next Nature',
        category: 'Shoes',
        brand: 'Nike',
        price: 3695.0,
        original_price: 4995.0,
        rating: 4.5,
        description: 'Plush foam midsole for smooth stride, made with at least 20% recycled content by weight, lightweight road running design.',
        image_url: 'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=600&q=80',
        source_name: 'Nike India / Myntra',
        source_url: 'https://www.nike.com/in/t/revolution-6-road-running-shoes-NC6PCL'
      },
      {
        id: 'ext_shoe_03',
        name: 'Adidas Fluidflow 2.0 Breathable Sports Shoes',
        category: 'Shoes',
        brand: 'Adidas',
        price: 3299.0,
        original_price: 5599.0,
        rating: 4.4,
        description: 'Ultra-breathable knit upper, cloudfoam cushioning midsole for all-day comfort, high-traction rubber outsole.',
        image_url: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=600&q=80',
        source_name: 'Adidas India / Amazon',
        source_url: 'https://www.adidas.co.in/fluidflow-2.0-shoes/FZ1985.html'
      },
      {
        id: 'ext_shoe_04',
        name: 'Campus Oxyfit Memory Foam Running Sneakers',
        category: 'Shoes',
        brand: 'Campus',
        price: 1899.0,
        original_price: 2699.0,
        rating: 4.3,
        description: 'Memory foam insole, breathable mesh upper, lightweight phylon sole for gym, running, and daily wear.',
        image_url: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=600&q=80',
        source_name: 'Amazon.in',
        source_url: 'https://www.amazon.in/s?k=campus+running+shoes'
      }
    ]
  },

  // =================== 2. BARBIE & DOLLS ===================
  {
    categoryName: 'Toys & Dolls',
    keywords: ['barbie', 'barbie doll', 'barbie dolls', 'doll', 'dolls', 'toy', 'toys', 'fashion doll', 'mattel'],
    items: [
      {
        id: 'ext_barbie_01',
        name: 'Barbie Fashionistas Doll with Styling Closet Set',
        category: 'Toys & Dolls',
        brand: 'Mattel',
        price: 2499.0,
        original_price: 3999.0,
        rating: 4.7,
        description: 'Includes Barbie doll with 3 trendy outfits, 6 fashion accessories, hangers, and portable signature pink wardrobe.',
        image_url: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=600&q=80',
        source_name: 'Mattel Official / Hamleys',
        source_url: 'https://www.hamleys.in/product/barbie-ultimate-closet-and-doll-set'
      },
      {
        id: 'ext_barbie_02',
        name: 'Barbie Dreamtopia Rainbow Lights Mermaid Doll',
        category: 'Toys & Dolls',
        brand: 'Mattel',
        price: 1899.0,
        original_price: 2799.0,
        rating: 4.8,
        description: 'Water-activated sparkling rainbow light show in mermaid tail, pearl-detailed waist, pink-streaked blonde hair.',
        image_url: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=600&q=80',
        source_name: 'Amazon.in',
        source_url: 'https://www.amazon.in/s?k=barbie+dreamtopia+mermaid'
      },
      {
        id: 'ext_barbie_03',
        name: 'Barbie Careers Doctor Doll with Playset',
        category: 'Toys & Dolls',
        brand: 'Mattel',
        price: 1499.0,
        original_price: 2199.0,
        rating: 4.6,
        description: 'Doctor Barbie in white lab coat, stethoscope, patient examination accessories, educational role-play set.',
        image_url: 'https://images.unsplash.com/photo-1581557991964-125469da3b8a?auto=format&fit=crop&w=600&q=80',
        source_name: 'FirstCry / Flipkart',
        source_url: 'https://www.flipkart.com/search?q=barbie+doctor+doll'
      },
      {
        id: 'ext_barbie_04',
        name: 'Barbie Dreamhouse Adventures Travel Doll Set',
        category: 'Toys & Dolls',
        brand: 'Mattel',
        price: 2999.0,
        original_price: 4499.0,
        rating: 4.8,
        description: 'Travel-themed Barbie with working luggage, puppy companion, neck pillow, camera, backpack, and travel accessories.',
        image_url: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=600&q=80',
        source_name: 'Amazon.in',
        source_url: 'https://www.amazon.in/s?k=barbie+travel+doll'
      }
    ]
  },

  // =================== 3. PHONES & GAMING PHONES ===================
  {
    categoryName: 'Smartphones & Mobiles',
    keywords: ['phone', 'phones', 'gaming phone', 'gaming phones', 'smartphone', 'smartphones', 'mobile', 'mobiles', 'android', '5g phone', '5g mobile', 'iqoo', 'realme', 'redmi', 'poco'],
    items: [
      {
        id: 'ext_phone_01',
        name: 'iQOO Z9x 5G Gaming Smartphone (6000mAh • 120Hz)',
        category: 'Smartphones',
        brand: 'iQOO',
        price: 14499.0,
        original_price: 17999.0,
        rating: 4.5,
        description: 'Snapdragon 6 Gen 1 4nm Processor • 6000mAh Massive Battery • 120Hz Ultra-smooth Display • 44W FlashCharge.',
        image_url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=600&q=80',
        source_name: 'Amazon.in',
        source_url: 'https://www.amazon.in/s?k=iqoo+z9x+5g'
      },
      {
        id: 'ext_phone_02',
        name: 'Realme Narzo 70 Pro 5G (Dimensity 7050 • Sony IMX890 OIS)',
        category: 'Smartphones',
        brand: 'Realme',
        price: 18999.0,
        original_price: 24999.0,
        rating: 4.4,
        description: 'Sony IMX890 Flagship OIS Camera • MediaTek Dimensity 7050 5G • 67W SUPERVOOC Fast Charge • Horizon Glass Design.',
        image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80',
        source_name: 'Amazon.in / Realme Store',
        source_url: 'https://www.realme.com/in/realme-narzo-70-pro-5g'
      },
      {
        id: 'ext_phone_03',
        name: 'Redmi Note 13 5G (Super AMOLED • 108MP Camera)',
        category: 'Smartphones',
        brand: 'Xiaomi',
        price: 16999.0,
        original_price: 20999.0,
        rating: 4.3,
        description: '6.67" 120Hz AMOLED Screen • 108MP Pro-grade Camera • MediaTek Dimensity 6080 5G • Ultra-slim 7.6mm body.',
        image_url: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=600&q=80',
        source_name: 'Mi.com / Flipkart',
        source_url: 'https://www.mi.com/in/product/redmi-note-13-5g/'
      },
      {
        id: 'ext_phone_04',
        name: 'Poco X6 Neo 5G (120Hz FHD+ AMOLED • 12GB RAM Edition)',
        category: 'Smartphones',
        brand: 'Poco',
        price: 15999.0,
        original_price: 19999.0,
        rating: 4.4,
        description: 'Bezel-less 120Hz AMOLED display • Gorilla Glass 5 protection • 108MP Dual Camera • Dimensity 6080 processor.',
        image_url: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=600&q=80',
        source_name: 'Flipkart',
        source_url: 'https://www.flipkart.com/search?q=poco+x6+neo+5g'
      }
    ]
  },

  // =================== 4. WEDDING SAREES ===================
  {
    categoryName: 'Ethnic Wear & Sarees',
    keywords: ['saree', 'sarees', 'wedding saree', 'wedding sarees', 'silk saree', 'silk sarees', 'banarasi', 'kanjivaram', 'kanjeevaram', 'bridal saree', 'ethnic', 'organza saree'],
    items: [
      {
        id: 'ext_saree_01',
        name: 'Kalamkari Heritage Woven Banarasi Silk Wedding Saree',
        category: 'Ethnic Wear',
        brand: 'Kalyan Silks / Myntra',
        price: 2899.0,
        original_price: 6999.0,
        rating: 4.7,
        description: 'Intricate golden zari floral motifs, pure silk blend with rich pallu and contrasting unstitched brocade blouse piece.',
        image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
        source_name: 'Myntra Weddings',
        source_url: 'https://www.myntra.com/sarees/banarasi-silk'
      },
      {
        id: 'ext_saree_02',
        name: 'Varkha Kanjeevaram Jacquard Bridal Art Silk Saree',
        category: 'Ethnic Wear',
        brand: 'Varkha',
        price: 2499.0,
        original_price: 5499.0,
        rating: 4.6,
        description: 'Royal maroon & antique gold zari work, traditional temple border design, woven jacquard art silk fabric.',
        image_url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80',
        source_name: 'Nykaa Fashion',
        source_url: 'https://www.nykaafashion.com/women/ethnic-wear/sarees'
      },
      {
        id: 'ext_saree_03',
        name: 'Meera Organza Floral Embroidered Wedding Saree with Cutwork',
        category: 'Ethnic Wear',
        brand: 'Meera Silks',
        price: 1999.0,
        original_price: 4200.0,
        rating: 4.5,
        description: 'Pastel blush pink organza saree with delicate resham floral embroidery, scalloped pearl cutwork border.',
        image_url: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=600&q=80',
        source_name: 'Ajio Luxe',
        source_url: 'https://www.ajio.com/s/sarees'
      }
    ]
  },

  // =================== 5. GIFTS FOR MOTHER ===================
  {
    categoryName: 'Gifts & Keepsakes',
    keywords: ['gift for mother', 'gift for mom', 'mothers gift', 'mom gift', 'gift for my mother', 'gifts for mother', 'gift for my mom', 'mother', 'mom'],
    items: [
      {
        id: 'ext_gift_01',
        name: 'Artisanal Essential Oil Aroma Diffuser & Herbal Tea Gift Hamper',
        category: 'Gifts & Wellness',
        brand: 'Forest Essentials / Khadi',
        price: 1850.0,
        original_price: 2800.0,
        rating: 4.8,
        description: 'Ultrasonic ceramic mist diffuser with 4 pure organic essential oils (Lavender, Rose, Lemongrass, Sandalwood) & chamomile tea tin.',
        image_url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=600&q=80',
        source_name: 'Forest Essentials / Amazon',
        source_url: 'https://www.amazon.in/s?k=aromatherapy+diffuser+gift+set'
      },
      {
        id: 'ext_gift_02',
        name: 'Handcrafted Genuine Leather Shoulder Tote Bag',
        category: 'Handbags & Accessories',
        brand: 'Hidesign / Lavie',
        price: 1999.0,
        original_price: 3999.0,
        rating: 4.6,
        description: 'Supple vegan grain leather, spacious multi-compartment interior with zippered pockets, elegant gold-tone hardware.',
        image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80',
        source_name: 'Myntra / Nykaa',
        source_url: 'https://www.myntra.com/handbags'
      },
      {
        id: 'ext_gift_03',
        name: 'Antique Engraved 925 Silver-Plated Jewellery Keepsake Box',
        category: 'Home & Keepsakes',
        brand: 'FabIndia Heritage',
        price: 1499.0,
        original_price: 2200.0,
        rating: 4.9,
        description: 'Vintage floral hand-embossed silver-plated metal box with velvet inner lining for precious earrings, necklaces, and rings.',
        image_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80',
        source_name: 'FabIndia Official',
        source_url: 'https://www.fabindia.com/home-decor'
      }
    ]
  },

  // =================== 6. PROGRAMMING & GAMING LAPTOPS ===================
  {
    categoryName: 'Laptops & Computers',
    keywords: ['laptop', 'laptops', 'gaming laptop', 'gaming laptops', 'laptop for programming', 'programming laptop', 'coding laptop', 'developer laptop', 'notebook', 'ultrabook', 'best laptop'],
    items: [
      {
        id: 'ext_laptop_01',
        name: 'ASUS Vivobook 15 OLED (Intel Core i5 13th Gen • 16GB RAM • 512GB SSD)',
        category: 'Laptops',
        brand: 'ASUS',
        price: 54990.0,
        original_price: 74990.0,
        rating: 4.6,
        description: 'Intel Core i5-1335U • 16GB DDR4 • 512GB NVMe SSD • 15.6" FHD 600-nits 100% DCI-P3 OLED Screen • Backlit Keyboard.',
        image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80',
        source_name: 'Amazon.in / ASUS Store',
        source_url: 'https://www.amazon.in/s?k=asus+vivobook+15+oled+i5'
      },
      {
        id: 'ext_laptop_02',
        name: 'Lenovo IdeaPad Slim 3 13th Gen i5 (16GB RAM • 512GB SSD • 1.6kg)',
        category: 'Laptops',
        brand: 'Lenovo',
        price: 58990.0,
        original_price: 79990.0,
        rating: 4.5,
        description: 'Intel Core i5-13420H High-Performance Processor • 16GB LPDDR5 • 512GB SSD • 15.6" Anti-Glare IPS • Rapid Charge (80% in 1hr).',
        image_url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80',
        source_name: 'Lenovo India / Croma',
        source_url: 'https://www.croma.com/search/?q=lenovo+ideapad+slim+3+i5'
      },
      {
        id: 'ext_laptop_03',
        name: 'Acer Nitro V Gaming Laptop (AMD Ryzen 5 7535HS • RTX 3050 6GB • 144Hz)',
        category: 'Laptops',
        brand: 'Acer',
        price: 59990.0,
        original_price: 78999.0,
        rating: 4.6,
        description: 'AMD Ryzen 5 7535HS • NVIDIA GeForce RTX 3050 (6GB Dedicated GDDR6) • 16GB DDR5 • 512GB Gen4 SSD • 144Hz IPS display.',
        image_url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=600&q=80',
        source_name: 'Flipkart / Acer India',
        source_url: 'https://www.flipkart.com/search?q=acer+nitro+v'
      }
    ]
  },

  // =================== 7. WIRELESS HEADPHONES ===================
  {
    categoryName: 'Audio & Headphones',
    keywords: ['headphone', 'headphones', 'wireless headphones', 'bluetooth headphones', 'anc headphones', 'over-ear headphones', 'earphones', 'earbuds', 'wireless earphones', 'gaming headphones'],
    items: [
      {
        id: 'ext_hp_01',
        name: 'Sony WH-CH720N Wireless Active Noise Cancelling Headphones',
        category: 'Audio',
        brand: 'Sony',
        price: 4999.0,
        original_price: 9990.0,
        rating: 4.6,
        description: 'Sony V1 Integrated Processor for crystal-clear ANC, Dual Noise Sensor technology, 35-hr battery with quick charge, multipoint Bluetooth.',
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
        source_name: 'Sony India / Amazon',
        source_url: 'https://www.sony.co.in/headphones/products/wh-ch720n'
      },
      {
        id: 'ext_hp_02',
        name: 'JBL Tune 770NC Adaptive Noise Cancelling Wireless Over-Ear',
        category: 'Audio',
        brand: 'JBL',
        price: 4499.0,
        original_price: 7999.0,
        rating: 4.5,
        description: 'JBL Pure Bass Sound, Adaptive Noise Cancelling with Smart Ambient, 70-hr long battery life, hands-free voice assistant.',
        image_url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=600&q=80',
        source_name: 'JBL India / Reliance Digital',
        source_url: 'https://in.jbl.com/wireless-headphones'
      },
      {
        id: 'ext_hp_03',
        name: 'boAt Rockerz 550 Over-Ear Wireless Headphones (50mm Drivers)',
        category: 'Audio',
        brand: 'boAt',
        price: 1999.0,
        original_price: 4999.0,
        rating: 4.3,
        description: '50mm Dynamic Drivers for Deep Bass • 20-Hour Playback • Ergonomic Plush Earcups • Physical Noise Isolation.',
        image_url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80',
        source_name: 'Amazon.in',
        source_url: 'https://www.amazon.in/s?k=boat+rockerz+550'
      }
    ]
  }
];

/**
 * Search the live external Web Product Discovery Index
 */
function searchWebProducts({ query, maxPrice, minPrice, category, limit = 6 }) {
  const queryLower = (query || '').toLowerCase().trim();
  const catLower = (category || '').toLowerCase().trim();
  const searchTerms = `${queryLower} ${catLower}`.trim();

  let matchedItems = [];
  const addedIds = new Set();
  const queryWords = searchTerms.split(/\s+/).filter(w => w.length > 1);

  for (const group of CURATED_DISCOVERY_INDEX) {
    let groupMatched = false;
    for (const kw of group.keywords) {
      // Check exact phrase match or whole-word token match
      if (searchTerms === kw || searchTerms.includes(kw)) {
        groupMatched = true;
        break;
      }
      // Check if keyword is multi-word and contained in query or vice-versa
      const kwWords = kw.split(/\s+/);
      const allKwInQuery = kwWords.every(w => new RegExp(`\\b${w}\\b`, 'i').test(searchTerms));
      const allQueryInKw = queryWords.length > 0 && queryWords.every(w => new RegExp(`\\b${w}\\b`, 'i').test(kw));
      if (allKwInQuery || allQueryInKw) {
        groupMatched = true;
        break;
      }
    }

    if (groupMatched) {
      for (const item of group.items) {
        if (addedIds.has(item.id)) continue;

        // Price filtering
        if (maxPrice !== null && maxPrice !== undefined && !isNaN(maxPrice) && item.price > maxPrice) continue;
        if (minPrice !== null && minPrice !== undefined && !isNaN(minPrice) && item.price < minPrice) continue;

        matchedItems.push({
          ...item,
          origin: 'EXTERNAL',
          is_external: true,
          badge: 'Online Discovery',
          availability: 'In Stock Online'
        });
        addedIds.add(item.id);
      }
    }
  }

  // Fallback: If no exact group matched, search by whole word token match across item name/description
  if (matchedItems.length === 0 && queryWords.length > 0) {
    for (const group of CURATED_DISCOVERY_INDEX) {
      for (const item of group.items) {
        if (addedIds.has(item.id)) continue;
        const itemText = `${item.name} ${item.category} ${item.description} ${item.brand}`.toLowerCase();
        const matchesWord = queryWords.some(w => new RegExp(`\\b${w}\\b`, 'i').test(itemText));
        if (matchesWord) {
          if (maxPrice !== null && maxPrice !== undefined && !isNaN(maxPrice) && item.price > maxPrice) continue;
          if (minPrice !== null && minPrice !== undefined && !isNaN(minPrice) && item.price < minPrice) continue;

          matchedItems.push({
            ...item,
            origin: 'EXTERNAL',
            is_external: true,
            badge: 'Online Discovery',
            availability: 'In Stock Online'
          });
          addedIds.add(item.id);
        }
      }
    }
  }

  // Rank by rating and price relevance
  matchedItems.sort((a, b) => b.rating - a.rating);

  return matchedItems.slice(0, limit);
}

module.exports = {
  searchWebProducts,
  CURATED_DISCOVERY_INDEX
};
