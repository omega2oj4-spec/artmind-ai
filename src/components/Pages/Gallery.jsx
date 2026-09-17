import React, {
  useState,
  useEffect,
  useRef,
  useMemo
} from 'react';

import {
  useLocation,
  useSearchParams
} from 'react-router-dom';

import PaintingCard from '../PaintingCard.jsx';

import {
  FaFilter,
  FaLayerGroup,
  FaSearch,
  FaPalette,
  FaCompass
} from 'react-icons/fa';

import API_BASE from '../../utils/api.js';

import {
  homeArtworks
} from '../../data/homeArtworks.js';

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

  /*
   * LOCAL-FIRST GALLERY
   *
   * The Gallery starts with homeArtworks immediately.
   * It does not wait for MongoDB, Art Institute,
   * Met Museum, or any external catalog.
   */
  const [paintings] =
    useState(homeArtworks);

  const [filterOptions, setFilterOptions] =
    useState({
      categories: CATEGORIES.slice(1),
      styles: [],
      surfaces: [],
      colorMediums: []
    });

  const [loading, setLoading] =
    useState(false);

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

  const galleryGridRef =
    useRef(null);

  /*
   * Build filter options from local artwork data.
   *
   * This means the Gallery does not need the
   * backend just to populate its filters.
   */
  useEffect(() => {
    const categories = [
      ...new Set(
        homeArtworks
          .map(
            (painting) =>
              painting.category
          )
          .filter(Boolean)
      )
    ];

    const styles = [
      ...new Set(
        homeArtworks
          .map(
            (painting) =>
              painting.style
          )
          .filter(Boolean)
      )
    ].sort();

    const colorMediums = [
      ...new Set(
        homeArtworks
          .map(
            (painting) =>
              painting.colorMedium
          )
          .filter(Boolean)
      )
    ].sort();

    /*
     * Your current homeArtworks data does not
     * consistently contain "surface".
     *
     * Keep a useful default list so the filter
     * remains available when database artworks
     * are added later.
     */
    const surfaces = [
      ...new Set(
        homeArtworks
          .map(
            (painting) =>
              painting.surface
          )
          .filter(Boolean)
      )
    ].sort();

    setFilterOptions({
      categories:
        categories.length
          ? categories
          : CATEGORIES.slice(1),

      styles,

      surfaces,

      colorMediums
    });
  }, []);

  /*
   * Reset document scrolling when returning
   * from a painting details page.
   */
  useEffect(() => {
    document.documentElement.style.overflowY =
      'auto';

    document.body.style.overflowY =
      'auto';

    if (location.state?.resetScroll) {
      requestAnimationFrame(() => {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'auto'
        });

        document.documentElement.scrollTop =
          0;

        document.body.scrollTop =
          0;
      });
    }
  }, [
    location.key,
    location.state
  ]);

  /*
   * Return to the embedded dashboard gallery.
   */
  useEffect(() => {
    if (location.hash !== '#gallery') {
      return;
    }

    requestAnimationFrame(() => {
      document
        .getElementById('gallery')
        ?.scrollIntoView({
          behavior: 'auto',
          block: 'start'
        });
    });
  }, [
    location.key,
    location.hash
  ]);

  /*
   * Keep URL filters synchronized.
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
      !cat &&
      activeCategory !== 'All'
    ) {
      setActiveCategory('All');
    }

    if (
      search !== null &&
      search !== searchQuery
    ) {
      setSearchQuery(search);
    }

    if (
      search === null &&
      searchQuery !== ''
    ) {
      setSearchQuery('');
    }

    if (
      style &&
      style !== selectedStyle
    ) {
      setSelectedStyle(style);
    }

    if (
      !style &&
      selectedStyle !== 'All Styles'
    ) {
      setSelectedStyle('All Styles');
    }

    if (
      surface &&
      surface !== selectedSurface
    ) {
      setSelectedSurface(surface);
    }

    if (
      !surface &&
      selectedSurface !== 'All Surfaces'
    ) {
      setSelectedSurface('All Surfaces');
    }

    if (
      colorMedium &&
      colorMedium !== selectedColorMedium
    ) {
      setSelectedColorMedium(
        colorMedium
      );
    }

    if (
      !colorMedium &&
      selectedColorMedium !== 'All Mediums'
    ) {
      setSelectedColorMedium(
        'All Mediums'
      );
    }
  }, [searchParams]);

  /*
   * LOCAL FILTERING
   *
   * This is the important part.
   *
   * We filter homeArtworks in the browser
   * instead of requesting the external catalog
   * every time a filter changes.
   */
  const filteredPaintings = useMemo(() => {
    const query =
      searchQuery
        .trim()
        .toLowerCase();

    return homeArtworks.filter(
      (painting) => {
        /*
         * CATEGORY
         */
        if (
          activeCategory !== 'All'
        ) {
          if (
            painting.category?.toLowerCase() !==
            activeCategory.toLowerCase()
          ) {
            return false;
          }
        }

        /*
         * PAINTING TYPE
         */
        if (
          selectedPaintingType !==
          'All Types'
        ) {
          if (
            painting.category?.toLowerCase() !==
            selectedPaintingType.toLowerCase()
          ) {
            return false;
          }
        }

        /*
         * STYLE
         */
        if (
          selectedStyle !==
          'All Styles'
        ) {
          if (
            painting.style?.toLowerCase() !==
            selectedStyle.toLowerCase()
          ) {
            return false;
          }
        }

        /*
         * SURFACE
         */
        if (
          selectedSurface !==
          'All Surfaces'
        ) {
          if (
            painting.surface?.toLowerCase() !==
            selectedSurface.toLowerCase()
          ) {
            return false;
          }
        }

        /*
         * COLOR MEDIUM
         */
        if (
          selectedColorMedium !==
          'All Mediums'
        ) {
          if (
            painting.colorMedium?.toLowerCase() !==
            selectedColorMedium.toLowerCase()
          ) {
            return false;
          }
        }

        /*
         * POPULARITY
         *
         * Local artwork does not always have
         * popularity, so only apply this when
         * the artwork has a popularity value.
         */
        if (
          selectedPopularity !==
          'Any Popularity'
        ) {
          const popularity =
            Number(
              painting.popularity || 0
            );

          if (
            popularity <
            Number(
              selectedPopularity
            )
          ) {
            return false;
          }
        }

        /*
         * SEARCH
         */
        if (query) {
          const searchableText = [
            painting.title,
            painting.artist,
            painting.description,
            painting.category,
            painting.style,
            painting.colorMedium,
            painting.surface,
            ...(painting.tags || [])
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          if (
            !searchableText.includes(
              query
            )
          ) {
            return false;
          }
        }

        return true;
      }
    );
  }, [
    activeCategory,
    searchQuery,
    selectedStyle,
    selectedSurface,
    selectedColorMedium,
    selectedPaintingType,
    selectedPopularity
  ]);

  /*
   * Scroll to painting from URL hash.
   */
  useEffect(() => {
    const paintingId =
      window.location.hash.slice(1);

    if (
      !paintingId ||
      !paintingId.startsWith(
        'painting-'
      )
    ) {
      return;
    }

    const element =
      document.getElementById(
        paintingId
      );

    if (!element) {
      return;
    }

    requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    });
  }, [
    filteredPaintings
  ]);

  /*
   * Scroll to category results.
   */
  useEffect(() => {
    if (
      !scrollToCategoryResults
    ) {
      return;
    }

    setTimeout(() => {
      galleryGridRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      if (
        !galleryGridRef.current
      ) {
        resultsRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }

      setScrollToCategoryResults(
        false
      );
    }, 100);
  }, [
    filteredPaintings,
    scrollToCategoryResults
  ]);

  /*
   * Save user's search to MongoDB.
   *
   * This does NOT control the Gallery results.
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

      window.dispatchEvent(
        new CustomEvent(
          'artmind:activity-updated'
        )
      );
    } catch (err) {
      /*
       * Search history failing should never
       * break the Gallery.
       */
      console.error(
        'Error saving search history:',
        err
      );
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
       * Save search history,
       * but do not make it necessary
       * for search results.
       */
      await saveSearchHistory(
        query
      );

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

  /*
   * Reset all filters.
   */
  const clearFilters = () => {
    setActiveCategory('All');
    setSearchQuery('');
    setSelectedStyle('All Styles');
    setSelectedSurface('All Surfaces');
    setSelectedColorMedium('All Mediums');
    setSelectedPaintingType('All Types');
    setSelectedPopularity('Any Popularity');

    setSearchParams({});

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
          Discover fine art from the
          ArtMind collection, filtered by
          categories, artistic styles,
          surface, and color medium.
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

            {[
              'All',
              ...filterOptions.categories.filter(
                (category) =>
                  category !== 'All'
              )
            ].map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
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
            type="button"
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
                marginRight:
                  '6px'
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

                  {filterOptions.surfaces.map(
                    (surface) => (
                      <option
                        key={surface}
                      >
                        {surface}
                      </option>
                    )
                  )}

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

                  {filterOptions.colorMediums.map(
                    (medium) => (
                      <option
                        key={medium}
                      >
                        {medium}
                      </option>
                    )
                  )}

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

                  {filterOptions.styles.map(
                    (style) => (
                      <option
                        key={style}
                      >
                        {style}
                      </option>
                    )
                  )}

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

              {/* CLEAR */}
              <div className="filter-item">

                <label>
                  Reset
                </label>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="nl-search-btn"
                >
                  Clear Filters
                </button>

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
            {filteredPaintings.length}
          </strong>{' '}
          masterworks in{' '}
          <strong>
            {activeCategory}
          </strong>
        </p>

      </div>

      {/* RESULTS */}

      {loading &&
      filteredPaintings.length === 0 ? (

        <div className="gallery-loading-skeleton">

          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>

        </div>

      ) : filteredPaintings.length > 0 ? (

        <div
          className="gallery-grid"
          ref={galleryGridRef}
        >

          {filteredPaintings.map(
            (painting) => (
              <PaintingCard
                key={
                  painting._id ||
                  painting.id ||
                  painting.catalogId ||
                  (
                    painting.src ||
                    painting.imageUrl ||
                    ''
                  ).split('?')[0]
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
