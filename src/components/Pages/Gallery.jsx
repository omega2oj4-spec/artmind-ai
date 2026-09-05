import { useState, useRef, useMemo } from 'react';
import './Gallery.css';

function performNLSearch(query, artworks) {
  if (!query || !query.trim()) return artworks;
  const lowerQuery = query.toLowerCase();
  const stopWords = ['show', 'find', 'me', 'with', 'the', 'a', 'an', 'in', 'of', 'on', 'some', 'all', 'pictures', 'images', 'art', 'artworks', 'paintings', 'painting', 'theme', 'themes', 'like'];
  const words = lowerQuery.replace(/[.,!?]/g, '').split(/\s+/);
  const keywords = words.filter(word => !stopWords.includes(word) && word.length > 2);
  if (keywords.length === 0) return artworks;
  
  const scoredArtworks = artworks.map(art => {
    let score = 0;
    const searchString = `${art.title} ${art.artist} ${(art.tags || []).join(' ')}`.toLowerCase();
    keywords.forEach(keyword => {
      if (searchString.includes(keyword)) {
        score += 1;
        if (art.title.toLowerCase().includes(keyword) || art.artist.toLowerCase().includes(keyword)) {
          score += 2;
        }
      }
    });
    return { art, score };
  });
  
  const filtered = scoredArtworks.filter(item => item.score > 0).sort((a, b) => b.score - a.score);
  return filtered.map(item => item.art);
}

export default function Gallery() {
  const artworks = [
    {
      src: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=600&auto=format&fit=crop",
      title: "Sweet Flowers",
      artist: "Vincent van Gogh",
      tags: ["oil", "nature", "flowers", "yellow", "post-impressionism", "floral"],
      category: "Flower",
      style: "Impressionism",
      medium: "Oil on Canvas",
      surface: "Canvas",
      colorTheme: "Yellow & Gold"
    },
    {
      src: "https://cdn.dribbble.com/userupload/48815862/file/c1a2afe1b81a13a91c1ab0a19b92764a.jpg?crop=0x487-4961x4207&format=webp&resize=640x480&vertical=center",
      title: "The Persistence of Memory",
      artist: "Salvador Dalí",
      tags: ["oil", "surrealism", "clocks", "landscape", "dream", "time"],
      category: "Figurative",
      style: "Surrealism",
      medium: "Oil on Canvas",
      surface: "Canvas",
      colorTheme: "Warm"
    },
    {
      src: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=600&auto=format&fit=crop",
      title: "The Scream",
      artist: "Edvard Munch",
      tags: ["oil", "expressionism", "portrait", "sunset", "anxiety", "bridge"],
      category: "Abstract",
      style: "Expressionism",
      medium: "Pastel",
      surface: "Board",
      colorTheme: "Red & Orange"
    },
    {
      src: "https://cdn.dribbble.com/userupload/46119240/file/09f542f4f374a36c7cee4f668d183ad6.jpg?format=webp&resize=640x480&vertical=center",
      title: "Wanderer above the Sea of Fog",
      artist: "Caspar David Friedrich",
      tags: ["oil", "romanticism", "landscape", "nature", "mountains", "fog", "man"],
      category: "Landscape",
      style: "Romanticism",
      medium: "Oil on Canvas",
      surface: "Canvas",
      colorTheme: "Cool"
    },
    {
      src: "https://images.unsplash.com/photo-1578301978018-3005759f48f7?q=80&w=600&auto=format&fit=crop",
      title: "The Starry Night",
      artist: "Vincent van Gogh",
      tags: ["oil", "landscape", "night", "stars", "nature", "post-impressionism", "village"],
      category: "Landscape",
      style: "Post-impressionism",
      medium: "Oil on Canvas",
      surface: "Canvas",
      colorTheme: "Blue & Green"
    },
    {
      src: "https://cdn.dribbble.com/userupload/48847961/file/30ea1d838eb96c908387382c8d122cd9.jpg?format=webp&resize=640x480&vertical=center",
      title: "Girl with a Pearl Earring",
      artist: "Johannes Vermeer",
      tags: ["oil", "portrait", "baroque", "girl", "earring", "blue"],
      category: "Figurative",
      style: "Baroque",
      medium: "Oil on Canvas",
      surface: "Canvas",
      colorTheme: "Dark"
    },
    {
      src: "https://images.unsplash.com/photo-1543857778-c4a1a3e0b2eb?q=80&w=600&auto=format&fit=crop",
      title: "Misty Mountains",
      artist: "Unknown",
      tags: ["watercolor", "landscape", "mountains", "nature", "mist", "forest"],
      category: "Abstract",
      style: "Contemporary",
      medium: "Watercolor",
      surface: "Paper",
      colorTheme: "Cool"
    }
  ];

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  
  const [filterStyle, setFilterStyle] = useState('All Styles');
  const [filterMedium, setFilterMedium] = useState('All Mediums');
  const [filterSurface, setFilterSurface] = useState('All Surfaces');
  const [filterColor, setFilterColor] = useState('All Colors');
  
  const searchSuggestions = [
    "Oil paintings",
    "Watercolor landscapes",
    "Post-impressionism art",
    "Surrealism and dreams",
    "Nature themes",
    "Famous portraits"
  ];
  
  const filteredArtworks = useMemo(() => {
    let results = performNLSearch(searchQuery, artworks);
    
    if (activeCategory !== 'All') {
      results = results.filter(art => art.category === activeCategory);
    }
    
    if (filterStyle !== 'All Styles') {
      results = results.filter(art => art.style === filterStyle);
    }
    
    if (filterMedium !== 'All Mediums') {
      results = results.filter(art => art.medium === filterMedium);
    }
    
    if (filterSurface !== 'All Surfaces') {
      results = results.filter(art => art.surface === filterSurface);
    }
    
    if (filterColor !== 'All Colors') {
      results = results.filter(art => art.colorTheme === filterColor);
    }
    
    return results;
  }, [searchQuery, activeCategory, filterStyle, filterMedium, filterSurface, filterColor]);
  const resultsRef = useRef(null);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <main className="gallery-container" id="gallery">
      <div className="gallery-header">
        <h1 className="gallery-title">Gallery Collection</h1>
        <p className="gallery-subtitle">
          Explore fine art filtered by natural language intent, curated categories, color mediums, surface materials, and artistic styles.
        </p>
      </div>

      <div className="gallery-search-section">
        <form className="search-container" onSubmit={handleSearch}>
          <div className="search-input-wrapper">
            <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
              <path fill="currentColor" d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/>
            </svg>
            <input 
              type="text" 
              className="nl-search-input" 
              placeholder="Inquire in natural language (e.g. 'Show me modern oil paintings with nature themes in blue tones')..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchFocused(true);
              }}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
            {isSearchFocused && (
              <div className="search-suggestions">
                <p className="suggestions-title">Try searching for:</p>
                <ul>
                  {searchSuggestions.map((suggestion, idx) => (
                    <li 
                      key={idx} 
                      onMouseDown={(e) => {
                        e.preventDefault(); 
                        setSearchQuery(suggestion);
                        setIsSearchFocused(false);
                        handleSearch();
                      }}
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <button type="submit" className="nl-search-btn" aria-label="Search">
            Search
          </button>
        </form>

        <div className="gallery-controls">
          <div className="gallery-categories">
            {['All', 'Abstract', 'Landscape', 'Flower', 'Nature', 'Figurative', 'Religious'].map(cat => (
              <button 
                key={cat}
                className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat === 'All' && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="14" height="14" style={{ marginRight: '4px' }}><path fill="currentColor" d="M256 32l-256 128 256 128 256-128-256-128zM0 256l256 128 256-128v54.7L256 438.7 0 310.7V256zM0 352l256 128 256-128v54.7L256 534.7 0 406.7V352z"/></svg>}
                {cat}
              </button>
            ))}
          </div>
          <button 
            className={`toggle-filter-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="14" height="14"><path fill="currentColor" d="M3.9 54.9C10.5 40.9 24.5 32 40 32H472c15.5 0 29.5 8.9 36.1 22.9s4.6 30.5-5.2 42.5L320 320.9V448c0 12.1-6.8 23.2-17.7 28.6s-23.8 4.3-33.5-3l-64-48c-8.1-6-12.8-15.5-12.8-25.6V320.9L9.1 97.3C-.7 85.4-2.8 68.8 3.9 54.9z"/></svg>
            Filters
            <svg className={`chevron-icon ${showFilters ? 'open' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="12" height="12"><path fill="currentColor" d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"/></svg>
          </button>
        </div>

        {showFilters && (
          <div className="gallery-filters-container">
            <div className="gallery-filters">
              <div className="filter-item">
                <label>Style</label>
                <select>
                  <option>All Styles</option>
                  <option>Realism</option>
                  <option>Impressionism</option>
                  <option>Surrealism</option>
                  <option>Abstract Expressionism</option>
                  <option>Expressionism</option>
                  <option>Romanticism</option>
                  <option>Baroque</option>
                  <option>Renaissance</option>
                  <option>Cubism</option>
                  <option>Minimalism</option>
                  <option>Contemporary</option>
                  <option>Modern Art</option>
                  <option>Classical</option>
                </select>
              </div>
              <div className="filter-item">
                <label>Medium</label>
                <select>
                  <option>All Mediums</option>
                  <option>Oil on Canvas</option>
                  <option>Acrylic on Canvas</option>
                  <option>Watercolor</option>
                  <option>Oil on Wood</option>
                  <option>Acrylic on Paper</option>
                  <option>Gouache</option>
                  <option>Charcoal</option>
                  <option>Pencil</option>
                  <option>Pastel</option>
                  <option>Ink</option>
                  <option>Mixed Media</option>
                  <option>Digital</option>
                </select>
              </div>
              <div className="filter-item">
                <label>Surface</label>
                <select>
                  <option>All Surfaces</option>
                  <option>Canvas</option>
                  <option>Paper</option>
                  <option>Wood</option>
                  <option>Panel</option>
                  <option>Board</option>
                  <option>Fabric</option>
                  <option>Wall</option>
                  <option>Metal</option>
                  <option>Glass</option>
                  <option>Digital</option>
                </select>
              </div>
              <div className="filter-item">
                <label>Color Theme</label>
                <select>
                  <option>All Colors</option>
                  <option>Warm</option>
                  <option>Cool</option>
                  <option>Neutral</option>
                  <option>Monochromatic</option>
                  <option>Black & White</option>
                  <option>Earth Tones</option>
                  <option>Pastel</option>
                  <option>Vibrant</option>
                  <option>Dark</option>
                  <option>Bright</option>
                  <option>Red & Orange</option>
                  <option>Blue & Green</option>
                  <option>Yellow & Gold</option>
                  <option>Purple & Pink</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="gallery-results-info" ref={resultsRef}>
        <p>Showing <strong>{filteredArtworks.length}</strong> artworks</p>
      </div>

      <div className="gallery-grid">
        {filteredArtworks.length > 0 ? (
          filteredArtworks.map((art, idx) => (
            <div className="gallery-card" key={idx}>
              <img src={art.src} alt={art.title} loading="lazy" />
              <div className="gallery-card-info">
                <h3>{art.title}</h3>
                <p>{art.artist}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-search-state">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="60" height="60" className="empty-icon"><path fill="#aaa" d="M512 256c0 .9 0 1.8 0 2.7c-.4 36.5-33.6 61.3-70.1 61.3H344c-26.5 0-48 21.5-48 48c0 3.4 .4 6.7 1 9.9c2.1 10.2 6.5 20 10.8 29.9c6.1 13.8 12.1 27.5 12.1 42c0 31.8-21.6 60.7-53.4 62c-3.5 .1-7 .2-10.6 .2C114.6 512 0 397.4 0 256S114.6 0 256 0S512 114.6 512 256zM128 288a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm0-96a32 32 0 1 0 0-64 32 32 0 1 0 0 64zM288 96a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm96 96a32 32 0 1 0 0-64 32 32 0 1 0 0 64z"/></svg>
            <p>No artworks found matching your vision. Try rephrasing!</p>
          </div>
        )}
      </div>
    </main>
  );
}
