import { useState, useEffect, useRef, useMemo, useContext } from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext.jsx';
import { homeArtworks } from '../../data/homeArtworks.js';
import './Home.css';

const TypewriterText = ({ text, delay = 0 }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let timer;
    setDisplayedText('');
    
    const timeout = setTimeout(() => {
      timer = setInterval(() => {
        setDisplayedText((prev) => {
          if (prev.length < text.length) {
            return text.slice(0, prev.length + 1);
          } else {
            clearInterval(timer);
            return prev;
          }
        });
      }, 40);
    }, delay);

    return () => {
      clearTimeout(timeout);
      clearInterval(timer);
    };
  }, [text, delay]);

  return <span>{displayedText}</span>;
};

const CarouselItem = ({ art }) => {
  const { favorites, toggleFavorite } = useContext(AuthContext);
  const artId = art.id || art._id;
  const isFav = favorites?.some(favId => String(favId) === String(artId));

  const handleFavoriteClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!artId) return;

    const res = await toggleFavorite(artId);
    if (res && res.requireAuth) {
      alert('Please sign in to save your favorite artworks.');
    }
  };

  return (
    <a className="carousel-item" href={`#painting-${art.id}`} aria-label={`View ${art.title} in the gallery`}>
      <img src={art.src} alt={art.title} loading="lazy" referrerPolicy="no-referrer" />
      <button
        type="button"
        className={`painting-fav-btn ${isFav ? 'active' : ''}`}
        onClick={handleFavoriteClick}
        aria-label={isFav ? `Remove ${art.title || 'artwork'} from favorites` : `Add ${art.title || 'artwork'} to favorites`}
        title={isFav ? "Remove from favorites" : "Add to favorites"}
      >
        {isFav ? <FaHeart color="#ff477e" /> : <FaRegHeart />}
      </button>
      
      <div className="artwork-info-always-visible">
        <h3 className="artwork-title">
          <TypewriterText text={art.title} />
        </h3>
        {art.artist && (
          <p className="artwork-artist">
            <TypewriterText text={art.artist} delay={art.title.length * 40} />
          </p>
        )}
      </div>
    </a>
  );
};

// Helper function for natural language search simulation
function performNLSearch(query, artworks) {
  if (!query || !query.trim()) return artworks;
  
  const lowerQuery = query.toLowerCase();
  
  // Basic NLP tokenization - remove common stop words and punctuation
  const stopWords = ['show', 'find', 'me', 'with', 'the', 'a', 'an', 'in', 'of', 'on', 'some', 'all', 'pictures', 'images', 'art', 'artworks', 'paintings', 'painting', 'theme', 'themes', 'like'];
  const words = lowerQuery.replace(/[.,!?]/g, '').split(/\s+/);
  
  const keywords = words.filter(word => !stopWords.includes(word) && word.length > 2);
  
  // If only stop words were entered, just return everything
  if (keywords.length === 0) return artworks;
  
  // Score artworks based on keyword matches
  const scoredArtworks = artworks.map(art => {
    let score = 0;
    const searchString = `${art.title} ${art.artist} ${(art.tags || []).join(' ')}`.toLowerCase();
    
    keywords.forEach(keyword => {
      if (searchString.includes(keyword)) {
        score += 1; // Basic match
        // Give higher weight to title/artist matches
        if (art.title.toLowerCase().includes(keyword) || art.artist.toLowerCase().includes(keyword)) {
          score += 2;
        }
      }
    });
    return { art, score };
  });
  
  // Filter out zero scores and sort by score descending
  const filtered = scoredArtworks.filter(item => item.score > 0).sort((a, b) => b.score - a.score);
  
  return filtered.map(item => item.art);
}

export default function Home() {
  const artworks = homeArtworks; /* Legacy local list retained below for reference.
    {
      src: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=600&auto=format&fit=crop",
      title: "Sunflowers",
      artist: "Vincent van Gogh",
      tags: ["oil", "nature", "flowers", "yellow", "post-impressionism", "floral"]
    },
    {
      src: "https://cdn.dribbble.com/userupload/48815862/file/c1a2afe1b81a13a91c1ab0a19b92764a.jpg?crop=0x487-4961x4207&format=webp&resize=640x480&vertical=center",
      title: "The Persistence of Memory",
      artist: "Salvador Dalí",
      tags: ["oil", "surrealism", "clocks", "landscape", "dream", "time"]
    },
    {
      src: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=600&auto=format&fit=crop",
      title: "The Scream",
      artist: "Edvard Munch",
      tags: ["oil", "expressionism", "portrait", "sunset", "anxiety", "bridge"]
    },
    {
      src: "https://cdn.dribbble.com/userupload/46119240/file/09f542f4f374a36c7cee4f668d183ad6.jpg?format=webp&resize=640x480&vertical=center",
      title: "Wanderer above the Sea of Fog",
      artist: "Caspar David Friedrich",
      tags: ["oil", "romanticism", "landscape", "nature", "mountains", "fog", "man"]
    },
    {
      src: "https://images.unsplash.com/photo-1578301978018-3005759f48f7?q=80&w=600&auto=format&fit=crop",
      title: "The Starry Night",
      artist: "Vincent van Gogh",
      tags: ["oil", "landscape", "night", "stars", "nature", "post-impressionism", "village"]
    },
    {
      src: "https://cdn.dribbble.com/userupload/48847961/file/30ea1d838eb96c908387382c8d122cd9.jpg?format=webp&resize=640x480&vertical=center",
      title: "Girl with a Pearl Earring",
      artist: "Johannes Vermeer",
      tags: ["oil", "portrait", "baroque", "girl", "earring", "blue"]
    },
    {
      src: "https://images.unsplash.com/photo-1543857778-c4a1a3e0b2eb?q=80&w=600&auto=format&fit=crop",
      title: "Misty Mountains",
      artist: "Unknown",
      tags: ["watercolor", "landscape", "mountains", "nature", "mist", "forest"]
    }
  ]; */

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchSuggestions = [
    "Oil paintings",
    "Watercolor landscapes",
    "Post-impressionism art",
    "Surrealism and dreams",
    "Nature themes",
    "Famous portraits"
  ];
  
  // Memoize search results so it doesn't recalculate on every animation frame
  const filteredArtworks = useMemo(() => performNLSearch(searchQuery, artworks), [searchQuery]);
  const shouldInfiniteScroll = filteredArtworks.length > 2;

  // Tripled array for seamless infinite looping if more than 2 items. Otherwise, show as is.
  const carouselImages = shouldInfiniteScroll 
    ? [...filteredArtworks, ...filteredArtworks, ...filteredArtworks]
    : filteredArtworks;

  const scrollRef = useRef(null);
  const carouselWrapperRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    if (carouselWrapperRef.current) {
      carouselWrapperRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Keep a ref of isPaused up to date for the requestAnimationFrame loop
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    let animationFrameId;

    const scroll = () => {
      // Only auto-scroll if we have more than 2 items
      if (scrollRef.current && !isPausedRef.current && shouldInfiniteScroll) {
        scrollRef.current.scrollLeft += 1; // Speed of continuous scroll
        
        // Reset scroll position to create infinite loop
        const maxScroll = scrollRef.current.scrollWidth / 3;
        if (scrollRef.current.scrollLeft >= maxScroll) {
          scrollRef.current.scrollLeft -= maxScroll;
        }
      }
      animationFrameId = requestAnimationFrame(scroll);
    };

    if (shouldInfiniteScroll) {
      animationFrameId = requestAnimationFrame(scroll);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [shouldInfiniteScroll, carouselImages.length]);

  return (
    <main className="home-container" id="home">
      <div className="hero-content">
        <h1 className="hero-title">
          <TypewriterText text="Explore a world where ideas move" /><br/>
          <TypewriterText text="beyond the screen" delay={1300} />
        </h1>
        <p className="hero-subtitle">
          <TypewriterText text="Spatial thinking used to test clarity and intent before design decisions are locked." delay={2100} />
        </p>
        
        <form className="search-container" onSubmit={handleSearch}>
          <div className="search-input-wrapper">
            <input 
              type="text" 
              className="nl-search-input" 
              placeholder="Try: 'Show oil paintings with nature themes' or 'watercolor landscape'"
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
                        e.preventDefault(); // prevents input from losing focus before click resolves
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
      </div>

      <div className="carousel-wrapper manual-carousel" ref={carouselWrapperRef}>
        {filteredArtworks.length > 0 ? (
          <div 
            className="carousel-viewport smooth-scroller" 
            ref={scrollRef}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className={`carousel-track-continuous ${!shouldInfiniteScroll ? 'centered-track' : ''}`}>
              {carouselImages.map((art, index) => (
                <CarouselItem art={art} key={index} />
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-search-state">
            <p>No artworks found matching your vision. Try rephrasing!</p>
          </div>
        )}
      </div>
    </main>
  );
}
