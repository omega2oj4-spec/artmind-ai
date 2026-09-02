import { useState, useEffect, useRef } from 'react';
import './Home.css';

const TypewriterText = ({ text, delay = 0 }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let i = 0;
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
  return (
    <div className="carousel-item">
      <img src={art.src} alt={art.title} loading="lazy" />
      
      <div className="artwork-info-always-visible">
        <h3 className="artwork-title">
          <TypewriterText text={art.title} />
        </h3>
        <p className="artwork-artist">
          <TypewriterText text={art.artist} delay={art.title.length * 40} />
        </p>
      </div>
    </div>
  );
};

export default function Home() {
  const artworks = [
    {
      src: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=600&auto=format&fit=crop",
      title: "Sunflowers",
      artist: "Vincent van Gogh"
    },
    {
      src: "https://cdn.dribbble.com/userupload/48815862/file/c1a2afe1b81a13a91c1ab0a19b92764a.jpg?crop=0x487-4961x4207&format=webp&resize=640x480&vertical=center",
      title: "The Persistence of Memory",
      artist: "Salvador Dalí"
    },
    {
      src: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=600&auto=format&fit=crop",
      title: "The Scream",
      artist: "Edvard Munch"
    },
    {
      src: "https://cdn.dribbble.com/userupload/46119240/file/09f542f4f374a36c7cee4f668d183ad6.jpg?format=webp&resize=640x480&vertical=center",
      title: "Wanderer above the Sea of Fog",
      artist: "Caspar David Friedrich"
    },
    {
      src: "https://images.unsplash.com/photo-1578301978018-3005759f48f7?q=80&w=600&auto=format&fit=crop",
      title: "The Starry Night",
      artist: "Vincent van Gogh"
    },
    {
      src: "https://cdn.dribbble.com/userupload/48847961/file/30ea1d838eb96c908387382c8d122cd9.jpg?format=webp&resize=640x480&vertical=center",
      title: "Girl with a Pearl Earring",
      artist: "Johannes Vermeer"
    }
  ];

  // Tripled array for seamless infinite looping
  const carouselImages = [...artworks, ...artworks, ...artworks]; 
  const scrollRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);

  // Keep a ref of isPaused up to date for the requestAnimationFrame loop
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    let animationFrameId;

    const scroll = () => {
      if (scrollRef.current && !isPausedRef.current) {
        scrollRef.current.scrollLeft += 1; // Speed of continuous scroll
        
        // Reset scroll position to create infinite loop
        const maxScroll = scrollRef.current.scrollWidth / 3;
        if (scrollRef.current.scrollLeft >= maxScroll) {
          scrollRef.current.scrollLeft -= maxScroll;
        }
      }
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <main className="home-container">
      <div className="hero-content">
        <h1 className="hero-title">Explore a world where ideas move<br/>beyond the screen</h1>
        <p className="hero-subtitle">Spatial thinking used to test clarity and intent before design decisions are locked.</p>
      </div>

      <div className="carousel-wrapper manual-carousel">
        <div 
          className="carousel-viewport smooth-scroller" 
          ref={scrollRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="carousel-track-continuous">
            {carouselImages.map((art, index) => (
              <CarouselItem art={art} key={index} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
