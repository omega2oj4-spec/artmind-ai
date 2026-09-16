import React, {
  useState,
  useEffect,
  useRef
} from 'react';

import { useLocation, useSearchParams } from 'react-router-dom';

import PaintingCard from '../PaintingCard.jsx';

import {
  FaFilter,
  FaLayerGroup,
  FaSearch,
  FaPalette,
  FaCompass
} from 'react-icons/fa';

import API_BASE from '../../utils/api.js';
import './Gallery.css';

const CATEGORIES = [
  'All',
  'Abstract',
  'Landscape',
  'Flower',
  'Nature',
  'Figurative',
  'Religious'
];

export default function Gallery() {
  const [searchParams, setSearchParams] =
    useSearchParams();
  const location = useLocation();

  const [paintings, setPaintings] =
    useState([]);

  const [filterOptions, setFilterOptions] = useState({
    categories: CATEGORIES.slice(1), styles: [], surfaces: [], colorMediums: []
  });

  const [loading, setLoading] =
    useState(true);

  const [activeCategory, setActiveCategory] =
    useState(
      searchParams.get('category') || 'All'
    );

  const [searchQuery, setSearchQuery] =
    useState(
      searchParams.get('search') || ''
    );

  const [showFilters, setShowFilters] =
    useState(false);

  const [selectedStyle, setSelectedStyle] =
    useState(
      searchParams.get('style') ||
        'All Styles'
    );

  const [selectedSurface, setSelectedSurface] =
    useState(
      searchParams.get('surface') ||
        'All Surfaces'
    );

  const [
    selectedColorMedium,
    setSelectedColorMedium
  ] = useState(
    searchParams.get('colorMedium') ||
      'All Mediums'
  );

  const [
    selectedPaintingType,
    setSelectedPaintingType
  ] = useState('All Types');

  const [
    selectedPopularity,
    setSelectedPopularity
  ] = useState('Any Popularity');

  const [
    scrollToCategoryResults,
    setScrollToCategoryResults
  ] = useState(false);

  const resultsRef = useRef(null);
  const galleryGridRef = useRef(null);

  // Values come from the backend's synced source catalogue, not a hard-coded
  // frontend list, so filters grow with the collection.
  useEffect(() => {
    fetch(`${API_BASE}/api/paintings/filters`)
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Filter request failed')))
      .then((data) => setFilterOptions({
        categories: data.categories?.length ? data.categories : CATEGORIES.slice(1),
        styles: data.styles || [], surfaces: data.surfaces || [], colorMediums: data.colorMediums || []
      }))
      .catch((err) => console.error('Error loading gallery filters:', err));
  }, []);

  // Detail pages explicitly request a clean gallery return.  Reset the document
  // scroll position after this route mounts and ensure no stale inline overflow
  // setting can prevent upward scrolling.
  useEffect(() => {
    document.documentElement.style.overflowY = 'auto';
    document.body.style.overflowY = 'auto';

    if (location.state?.resetScroll) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      });
    }
  }, [location.key, location.state]);

  // A return from Painting Details targets the embedded dashboard gallery.
  // Scroll there once on route entry only; never tie this to artwork loading,
  // otherwise it would override the visitor's own upward scroll.
  useEffect(() => {
    if (location.hash !== '#gallery') return;

    requestAnimationFrame(() => {
      document.getElementById('gallery')?.scrollIntoView({
        behavior: 'auto',
        block: 'start'
      });
    });
  }, [location.key, location.hash]);

  /*
   * Keep filters synced with URL.
   */
  useEffect(() => {
    const cat =
      searchParams.get('category');

    const search =
      searchParams.get('search');

    const style =
      searchParams.get('style');

    const surface =
      searchParams.get('surface');

    const colorMedium =
      searchParams.get('colorMedium');

    if (
      cat &&
      cat !== activeCategory
    ) {
      setActiveCategory(cat);
    }

    if (
      search !== null &&
      search !== searchQuery
    ) {
      setSearchQuery(search);
    }

    if (
      style &&
      style !== selectedStyle
    ) {
      setSelectedStyle(style);
    }

    if (
      surface &&
      surface !== selectedSurface
    ) {
      setSelectedSurface(surface);
    }

    if (
      colorMedium &&
      colorMedium !== selectedColorMedium
    ) {
      setSelectedColorMedium(
        colorMedium
      );
    }
  }, [searchParams]);

  /*
   * Load paintings whenever
   * filters change.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPaintings();
    }, 300); // Debounce filter changes

    return () => clearTimeout(timer);
  }, [
    activeCategory,
    selectedStyle,
    selectedSurface,
    selectedColorMedium,
    selectedPaintingType,
    selectedPopularity,
    searchQuery
  ]);

  /*
   * Scroll to painting from URL hash.
   */
  useEffect(() => {
    const paintingId =
      window.location.hash.slice(1);

    if (
      !paintingId ||
      !paintingId.startsWith('painting-') ||
      !document.getElementById(
        paintingId
      )
    ) {
      return;
    }

    requestAnimationFrame(() => {
      document
        .getElementById(paintingId)
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
    });
  }, [paintings]);

  /*
   * Scroll to category results.
   */
  useEffect(() => {
    if (
      !scrollToCategoryResults ||
      loading
    ) {
      return;
    }

    // Use setTimeout to ensure the DOM has updated with new paintings
    setTimeout(() => {
      // Scroll to the gallery grid (beginning of paintings)
      galleryGridRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      
      // Fallback: scroll to results info if grid ref doesn't work
      if (!galleryGridRef.current) {
        resultsRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
      
      setScrollToCategoryResults(false);
    }, 100);
  }, [
    loading,
    paintings,
    scrollToCategoryResults
  ]);

  /*
   * Save user's search to MongoDB.
   *
   * Dashboard uses this information
   * to personalize recommendations.
   */
  const saveSearchHistory = async (
    query
  ) => {
    const cleanQuery =
      query?.trim();

    if (!cleanQuery) {
      return;
    }

    try {
      const headers = {
        'Content-Type':
          'application/json'
      };

      const res = await fetch(
        `${API_BASE}/api/dashboard/search-history`,
        {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({
            query: cleanQuery
          })
        }
      );

      if (!res.ok) {
        console.error(
          'Could not save search history'
        );

        return;
      }

      /*
       * Tell Dashboard.jsx that
       * user activity changed.
       */
      window.dispatchEvent(
        new CustomEvent(
          'artmind:activity-updated'
        )
      );

    } catch (err) {
      console.error(
        'Error saving search history:',
        err
      );
    }
  };

  /*
   * Fetch gallery paintings.
   */
  const fetchPaintings = async () => {
    setLoading(true);

    try {
      let url =
        `${API_BASE}/api/paintings?`;

      const selectedCategory =
        selectedPaintingType !== 'All Types'
          ? selectedPaintingType
          : activeCategory;

      if (selectedCategory !== 'All') {
        url +=
          `category=${encodeURIComponent(
            selectedCategory
          )}&`;
      }

      if (
        selectedStyle !==
        'All Styles'
      ) {
        url +=
          `style=${encodeURIComponent(
            selectedStyle
          )}&`;
      }

      if (
        selectedSurface !==
        'All Surfaces'
      ) {
        url +=
          `surface=${encodeURIComponent(
            selectedSurface
          )}&`;
      }

      if (
        selectedColorMedium !==
        'All Mediums'
      ) {
        url +=
          `colorMedium=${encodeURIComponent(
            selectedColorMedium
          )}&`;
      }

      if (
        searchQuery.trim()
      ) {
        url +=
          `search=${encodeURIComponent(
            searchQuery.trim()
          )}&`;
      }

      if (
        selectedPaintingType !==
        'All Types'
      ) {
        url +=
          `paintingType=${encodeURIComponent(
            selectedPaintingType
          )}&`;
      }

      if (
        selectedPopularity !==
        'Any Popularity'
      ) {
        url +=
          `minPopularity=${encodeURIComponent(
            selectedPopularity
          )}&`;
      }

      const res =
        await fetch(url);

      if (!res.ok) {
        throw new Error(
          'Failed to load gallery paintings'
        );
      }

      const data =
        await res.json();

      setPaintings(Array.isArray(data) ? data : []);

    } catch (err) {
      console.error(
        'Error loading gallery:',
        err
      );

      setPaintings([]);

    } finally {
      setLoading(false);
    }
  };

  /*
   * Category button.
   */
  const handleCategoryChange =
    (cat) => {
      setActiveCategory(cat);

      const newParams =
        new URLSearchParams(
          searchParams
        );

      if (cat === 'All') {
        newParams.delete(
          'category'
        );
      } else {
        newParams.set(
          'category',
          cat
        );
      }

      setSearchParams(
        newParams
      );
    };

  /*
   * Search button.
   */
  const handleSearchSubmit =
    async (e) => {
      if (e) {
        e.preventDefault();
      }

      const query =
        searchQuery.trim();

      /*
       * Empty search.
       */
      if (!query) {
        const newParams =
          new URLSearchParams(
            searchParams
          );

        newParams.delete(
          'search'
        );

        setSearchParams(
          newParams
        );

        return;
      }

      /*
       * Save search for
       * personalization.
       */
      await saveSearchHistory(
        query
      );

      /*
       * Update URL.
       */
      const newParams =
        new URLSearchParams(
          searchParams
        );

      newParams.set(
        'search',
        query
      );

      setSearchParams(
        newParams
      );
    };

  /*
   * Category selection.
   */
  const handleCategorySelect =
    (category) => {
      setActiveCategory(
        category
      );

      setSelectedPaintingType(
        'All Types'
      );

      const newParams =
        new URLSearchParams(
          searchParams
        );

      if (category === 'All') {
        setSearchQuery('');

        setSelectedSurface(
          'All Surfaces'
        );

        setSelectedColorMedium(
          'All Mediums'
        );

        setSelectedStyle(
          'All Styles'
        );

        setSelectedPopularity(
          'Any Popularity'
        );

        newParams.delete(
          'category'
        );

        newParams.delete(
          'search'
        );

        newParams.delete(
          'style'
        );

        newParams.delete(
          'surface'
        );

        newParams.delete(
          'colorMedium'
        );

      } else {
        newParams.set(
          'category',
          category
        );
      }

      setSearchParams(
        newParams
      );

      setScrollToCategoryResults(
        true
      );
    };

  return (
    <main
      className="gallery-container"
      id="gallery"
    >

      {/* HEADER */}
      <div className="gallery-header">

        <h1 className="gallery-title">
          Smart Art Gallery
        </h1>

        <p className="gallery-subtitle">
          Discover public domain fine art
          curated from the Art Institute of
          Chicago, filtered by categories,
          artistic styles, surface, and
          color medium.
        </p>

      </div>

      {/* SEARCH */}
      <div className="gallery-search-section">

        <form
          className="search-container"
          onSubmit={
            handleSearchSubmit
          }
        >

          <div className="search-input-wrapper">

            <FaSearch className="search-icon" />

            <input
              type="text"
              className="nl-search-input"
              placeholder="Search artworks by title, artist, or description..."
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(
                  e.target.value
                )
              }
            />

          </div>

          <button
            type="submit"
            className="nl-search-btn"
            aria-label="Search"
          >
            Search
          </button>

        </form>

        {/* CONTROLS */}
        <div className="gallery-controls">

          <div className="gallery-categories">

            {['All', ...filterOptions.categories].map(
              (cat) => (
                <button
                  key={cat}
                  className={`category-btn ${
                    activeCategory === cat
                      ? 'active'
                      : ''
                  }`}
                  onClick={() =>
                    handleCategorySelect(
                      cat
                    )
                  }
                >

                  {cat === 'All' && (
                    <FaLayerGroup
                      style={{
                        marginRight:
                          '6px'
                      }}
                    />
                  )}

                  {cat}

                </button>
              )
            )}

          </div>

          <button
            className={`toggle-filter-btn ${
              showFilters
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setShowFilters(
                !showFilters
              )
            }
          >

            <FaFilter
              style={{
                marginRight: '6px'
              }}
            />

            Filters

          </button>

        </div>

        {/* FILTERS */}
        {showFilters && (
          <div className="gallery-filters-container">

            <div className="gallery-filters">

              {/* PAINTING TYPE */}
              <div className="filter-item">

                <label>
                  <FaLayerGroup
                    style={{
                      marginRight:
                        '6px'
                    }}
                  />

                  Painting Type
                </label>

                <select
                  value={
                    selectedPaintingType
                  }
                  onChange={(e) =>
                    setSelectedPaintingType(
                      e.target.value
                    )
                  }
                >

                  <option>
                    All Types
                  </option>

                  {filterOptions.categories.map(
                    (type) => (
                      <option
                        key={type}
                      >
                        {type}
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* SURFACE */}
              <div className="filter-item">

                <label>
                  <FaCompass
                    style={{
                      marginRight:
                        '6px'
                    }}
                  />

                  Surface
                </label>

                <select
                  value={
                    selectedSurface
                  }
                  onChange={(e) =>
                    setSelectedSurface(
                      e.target.value
                    )
                  }
                >

                  <option>
                    All Surfaces
                  </option>

                  {filterOptions.surfaces.map((surface) => <option key={surface}>{surface}</option>)}

                </select>

              </div>

              {/* COLOR MEDIUM */}
              <div className="filter-item">

                <label>
                  <FaPalette
                    style={{
                      marginRight:
                        '6px'
                    }}
                  />

                  Color Medium
                </label>

                <select
                  value={
                    selectedColorMedium
                  }
                  onChange={(e) =>
                    setSelectedColorMedium(
                      e.target.value
                    )
                  }
                >

                  <option>
                    All Mediums
                  </option>

                  {filterOptions.colorMediums.map((medium) => <option key={medium}>{medium}</option>)}

                </select>

              </div>

              {/* STYLE */}
              <div className="filter-item">

                <label>
                  <FaPalette
                    style={{
                      marginRight:
                        '6px'
                    }}
                  />

                  Artistic Style
                </label>

                <select
                  value={
                    selectedStyle
                  }
                  onChange={(e) =>
                    setSelectedStyle(
                      e.target.value
                    )
                  }
                >

                  <option>
                    All Styles
                  </option>

                  {filterOptions.styles.map((style) => <option key={style}>{style}</option>)}

                </select>

              </div>

              {/* POPULARITY */}
              <div className="filter-item">

                <label>
                  Popularity
                </label>

                <select
                  value={
                    selectedPopularity
                  }
                  onChange={(e) =>
                    setSelectedPopularity(
                      e.target.value
                    )
                  }
                >

                  <option value="Any Popularity">
                    Any Popularity
                  </option>

                  <option value="60">
                    Popular (60+)
                  </option>

                  <option value="85">
                    Most Popular (85+)
                  </option>

                </select>

              </div>

            </div>

          </div>
        )}

      </div>

      {/* RESULTS INFO */}
      <div
        className="gallery-results-info"
        ref={resultsRef}
      >

        <p>
          Showing{' '}
          <strong>
            {paintings.length}
          </strong>{' '}
          masterworks in{' '}
          <strong>
            {activeCategory}
          </strong>
        </p>

      </div>

      {/* RESULTS */}
      {loading ? (
        <div className="gallery-loading-skeleton">

          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>

        </div>

      ) : paintings.length > 0 ? (

        <div className="gallery-grid" ref={galleryGridRef}>

          {paintings.map(
            (painting) => (
              <PaintingCard
                key={
                  painting._id ||
                  painting.id ||
                  painting.catalogId ||
                  (painting.src || painting.imageUrl || '').split('?')[0]
                }
                painting={painting}
              />
            )
          )}

        </div>

      ) : (

        <div className="empty-search-state">

          <FaPalette className="empty-icon" />

          <p>
            No artworks match your
            selected filters. Try choosing
            a different category or
            clearing filters!
          </p>

        </div>

      )}

    </main>
  );
}
