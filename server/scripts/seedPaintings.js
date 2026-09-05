import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Painting from '../models/Painting.js';

dotenv.config();

const CATEGORIES = ['Abstract', 'Landscape', 'Flower', 'Nature', 'Figurative', 'Religious'];

function assignCategory(title = '', style = '', medium = '', desc = '') {
  const combined = `${title} ${style} ${medium} ${desc}`.toLowerCase();
  if (combined.includes('flower') || combined.includes('floral') || combined.includes('rose') || combined.includes('lily') || combined.includes('bloom') || combined.includes('sunflower')) {
    return 'Flower';
  }
  if (combined.includes('landscape') || combined.includes('mountain') || combined.includes('sea') || combined.includes('river') || combined.includes('sky') || combined.includes('valley') || combined.includes('view') || combined.includes('sunset') || combined.includes('forest')) {
    return 'Landscape';
  }
  if (combined.includes('nature') || combined.includes('tree') || combined.includes('garden') || combined.includes('water') || combined.includes('field') || combined.includes('leaf') || combined.includes('animal') || combined.includes('bird')) {
    return 'Nature';
  }
  if (combined.includes('saint') || combined.includes('christ') || combined.includes('virgin') || combined.includes('madonna') || combined.includes('angel') || combined.includes('church') || combined.includes('cross') || combined.includes('bible') || combined.includes('holy')) {
    return 'Religious';
  }
  if (combined.includes('portrait') || combined.includes('man') || combined.includes('woman') || combined.includes('figure') || combined.includes('girl') || combined.includes('boy') || combined.includes('lady') || combined.includes('self-portrait') || combined.includes('child')) {
    return 'Figurative';
  }
  return 'Abstract';
}

function deriveStyle(title = '', styleTitle = '', medium = '') {
  if (styleTitle) return styleTitle;
  const t = title.toLowerCase();
  if (t.includes('starry') || t.includes('sunflower') || t.includes('gogh')) return 'Post-Impressionism';
  if (t.includes('impression') || t.includes('monet')) return 'Impressionism';
  if (t.includes('memory') || t.includes('dali')) return 'Surrealism';
  if (t.includes('scream') || t.includes('munch')) return 'Expressionism';
  if (t.includes('portrait') || t.includes('girl')) return 'Baroque';
  return 'Modern Art';
}

function deriveSurface(medium = '') {
  const m = medium.toLowerCase();
  if (m.includes('paper') || m.includes('watercolor')) return 'Paper';
  if (m.includes('wood') || m.includes('panel')) return 'Wood Panel';
  if (m.includes('board')) return 'Board';
  return 'Canvas';
}

function deriveColorMedium(medium = '') {
  const m = medium.toLowerCase();
  if (m.includes('watercolor')) return 'Watercolor';
  if (m.includes('acrylic')) return 'Acrylic';
  if (m.includes('pastel')) return 'Pastel';
  if (m.includes('ink')) return 'Ink';
  return 'Oil';
}

function deriveColorTheme(category = '', index = 0) {
  const themes = ['Warm & Vibrant', 'Cool Blue & Emerald', 'Golden Autumn', 'Rich Dark Tones', 'Pastel Harmony', 'Monochromatic & Earth'];
  return themes[index % themes.length];
}

async function fetchFromAIC() {
  console.log('[Seed] Querying Art Institute of Chicago API...');
  const url = 'https://api.artic.edu/api/v1/artworks/search?q=painting&limit=100&fields=id,title,artist_display,date_display,medium_display,description,image_id,style_title,place_of_origin';
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`AIC API returned HTTP ${res.status}`);
    const data = await res.json();
    const items = data.data || [];
    console.log(`[Seed] Fetched ${items.length} raw records from AIC.`);

    const paintings = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.image_id || !item.title) continue;

      const category = assignCategory(item.title, item.style_title || '', item.medium_display || '', item.description || '');
      const style = deriveStyle(item.title, item.style_title, item.medium_display);
      const surface = deriveSurface(item.medium_display || '');
      const colorMedium = deriveColorMedium(item.medium_display || '');
      const colorTheme = deriveColorTheme(category, i);

      paintings.push({
        articId: item.id,
        title: item.title,
        artist: (item.artist_display || 'Unknown Artist').split('\n')[0].trim(),
        dateDisplay: item.date_display || 'Circa 19th Century',
        medium: item.medium_display || 'Oil on Canvas',
        description: item.description ? item.description.replace(/<[^>]*>?/gm, '').trim().slice(0, 400) : `A remarkable artwork titled "${item.title}" created in ${item.date_display || 'the 19th century'}.`,
        imageUrl: `https://www.artic.edu/iiif/2/${item.image_id}/full/843,/0/default.jpg`,
        category: category,
        style: style,
        colorMedium: colorMedium,
        surface: surface,
        popularity: Math.floor(Math.random() * 80) + 20,
        viewsCount: Math.floor(Math.random() * 150) + 10,
        colorTheme: colorTheme,
        tags: [category.toLowerCase(), style.toLowerCase(), colorMedium.toLowerCase(), surface.toLowerCase()]
      });
    }

    return paintings;
  } catch (err) {
    console.warn('[Seed] AIC API fetch warning:', err.message);
    return [];
  }
}

// Supplemental fallback catalogue ensuring at least 60 artworks across all 6 categories
const FALLBACK_ARTWORKS = [
  {
    title: "The Starry Night",
    artist: "Vincent van Gogh",
    dateDisplay: "1889",
    medium: "Oil on Canvas",
    description: "The Starry Night is an oil-on-canvas painting by Dutch Post-Impressionist painter Vincent van Gogh. Depicting the view from his asylum room window at Saint-Rémy-de-Provence.",
    imageUrl: "https://images.unsplash.com/photo-1578301978018-3005759f48f7?q=80&w=800&auto=format&fit=crop",
    category: "Landscape",
    style: "Post-Impressionism",
    colorMedium: "Oil",
    surface: "Canvas",
    popularity: 98,
    colorTheme: "Cool Blue & Emerald",
    tags: ["landscape", "post-impressionism", "oil", "canvas", "night", "stars"]
  },
  {
    title: "Water Lilies and Japanese Bridge",
    artist: "Claude Monet",
    dateDisplay: "1899",
    medium: "Oil on Canvas",
    description: "Monet's water garden at Giverny inspired over 250 paintings. This work depicts the arched wooden footbridge bridging his pond surrounded by lush lilies.",
    imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=800&auto=format&fit=crop",
    category: "Flower",
    style: "Impressionism",
    colorMedium: "Oil",
    surface: "Canvas",
    popularity: 92,
    colorTheme: "Golden Autumn",
    tags: ["flower", "impressionism", "oil", "canvas", "water", "garden"]
  },
  {
    title: "The Persistence of Memory",
    artist: "Salvador Dalí",
    dateDisplay: "1931",
    medium: "Oil on Canvas",
    description: "Dalí's iconic Surrealist landscape featuring melting pocket watches draped across a desolate coastal dreamscape.",
    imageUrl: "https://cdn.dribbble.com/userupload/48815862/file/c1a2afe1b81a13a91c1ab0a19b92764a.jpg?crop=0x487-4961x4207&format=webp&resize=640x480&vertical=center",
    category: "Abstract",
    style: "Surrealism",
    colorMedium: "Oil",
    surface: "Canvas",
    popularity: 95,
    colorTheme: "Warm & Vibrant",
    tags: ["abstract", "surrealism", "oil", "canvas", "clocks", "dream"]
  },
  {
    title: "Wanderer above the Sea of Fog",
    artist: "Caspar David Friedrich",
    dateDisplay: "1818",
    medium: "Oil on Canvas",
    description: "A prominent figure stands upon a rocky precipice contemplating a vast sea of mist covering mountain peaks.",
    imageUrl: "https://cdn.dribbble.com/userupload/46119240/file/09f542f4f374a36c7cee4f668d183ad6.jpg?format=webp&resize=640x480&vertical=center",
    category: "Landscape",
    style: "Romanticism",
    colorMedium: "Oil",
    surface: "Canvas",
    popularity: 88,
    colorTheme: "Monochromatic & Earth",
    tags: ["landscape", "romanticism", "oil", "canvas", "fog", "mountains"]
  },
  {
    title: "Girl with a Pearl Earring",
    artist: "Johannes Vermeer",
    dateDisplay: "1665",
    medium: "Oil on Canvas",
    description: "A tronie of a young woman wearing a turban and an oversized pearl earring, gazing over her shoulder against a dark backdrop.",
    imageUrl: "https://cdn.dribbble.com/userupload/48847961/file/30ea1d838eb96c908387382c8d122cd9.jpg?format=webp&resize=640x480&vertical=center",
    category: "Figurative",
    style: "Baroque",
    colorMedium: "Oil",
    surface: "Canvas",
    popularity: 96,
    colorTheme: "Rich Dark Tones",
    tags: ["figurative", "baroque", "oil", "canvas", "portrait", "pearl"]
  },
  {
    title: "The Scream",
    artist: "Edvard Munch",
    dateDisplay: "1893",
    medium: "Pastel on Board",
    description: "Munch captured an agonizing scream passing through nature under a fiery blood-red sunset sky.",
    imageUrl: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=800&auto=format&fit=crop",
    category: "Abstract",
    style: "Expressionism",
    colorMedium: "Pastel",
    surface: "Board",
    popularity: 97,
    colorTheme: "Warm & Vibrant",
    tags: ["abstract", "expressionism", "pastel", "board", "sunset", "scream"]
  },
  {
    title: "The Annunciation",
    artist: "Fra Angelico",
    dateDisplay: "1438",
    medium: "Tempera on Wood",
    description: "A serene Renaissance depiction of the Archangel Gabriel appearing before the Virgin Mary inside a classical loggia.",
    imageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=800&auto=format&fit=crop",
    category: "Religious",
    style: "Renaissance",
    colorMedium: "Tempera",
    surface: "Wood Panel",
    popularity: 84,
    colorTheme: "Pastel Harmony",
    tags: ["religious", "renaissance", "tempera", "wood panel", "angel", "mary"]
  },
  {
    title: "Sunflowers in Golden Vase",
    artist: "Vincent van Gogh",
    dateDisplay: "1888",
    medium: "Oil on Canvas",
    description: "A glowing symphony of yellows depicting sunflowers in full bloom, capturing radiant light and vital energy.",
    imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=800&auto=format&fit=crop",
    category: "Flower",
    style: "Post-Impressionism",
    colorMedium: "Oil",
    surface: "Canvas",
    popularity: 91,
    colorTheme: "Golden Autumn",
    tags: ["flower", "post-impressionism", "oil", "canvas", "sunflower", "yellow"]
  },
  {
    title: "Forest Solitude",
    artist: "Asher Brown Durand",
    dateDisplay: "1855",
    medium: "Oil on Canvas",
    description: "A Hudson River School masterpiece capturing towering oaks and dappled sunlight filtering onto a quiet forest stream.",
    imageUrl: "https://images.unsplash.com/photo-1543857778-c4a1a3e0b2eb?q=80&w=800&auto=format&fit=crop",
    category: "Nature",
    style: "Realism",
    colorMedium: "Oil",
    surface: "Canvas",
    popularity: 82,
    colorTheme: "Cool Blue & Emerald",
    tags: ["nature", "realism", "oil", "canvas", "forest", "trees"]
  }
];

async function seed() {
  await connectDB();
  console.log('[Seed] Clearing existing Painting records...');
  await Painting.deleteMany({});

  let paintings = await fetchFromAIC();

  // If AIC returned fewer than 60 works, pad with curated variations to reach 60+ artworks
  if (paintings.length < 60) {
    console.log(`[Seed] AIC returned ${paintings.length} paintings. Supplementing to ensure 60+ records...`);
    const needed = 65 - paintings.length;
    for (let i = 0; i < needed; i++) {
      const base = FALLBACK_ARTWORKS[i % FALLBACK_ARTWORKS.length];
      const category = CATEGORIES[i % CATEGORIES.length];
      paintings.push({
        ...base,
        title: `${base.title} (Study ${i + 1})`,
        category: category,
        articId: 900000 + i,
        popularity: Math.floor(Math.random() * 50) + 40,
        viewsCount: Math.floor(Math.random() * 100) + 15
      });
    }
  }

  console.log(`[Seed] Inserting ${paintings.length} paintings into MongoDB...`);
  await Painting.insertMany(paintings);
  console.log(`[Seed] Successfully seeded ${paintings.length} paintings!`);

  // Ensure categories count breakdown
  for (const cat of CATEGORIES) {
    const count = await Painting.countDocuments({ category: cat });
    console.log(` - Category "${cat}": ${count} artworks`);
  }

  process.exit(0);
}

seed().catch(err => {
  console.error('[Seed] Fatal seeding error:', err);
  process.exit(1);
});
