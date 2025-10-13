import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import styles from './4thSection.module.css';

// Brand testimonial data structure
interface Testimonial {
  brandName: string;
  labelName: string;
  representative: string;
  avatar: string;
  fullName: string;
  jobTitle: string;
  quote: string;
  resource: string;
}

// Brand item structure
interface BrandItem {
  brandName: string;
  logoUrl?: string;
  testimonial?: Testimonial;
}

// Segment data structure
interface SegmentData {
  segmentName: string;
  brands: BrandItem[];
}

// Default fallback images
const DEFAULT_AVATAR = '/brands/default-avatar.png';
const DEFAULT_LOGO = '/brands/default-logo.svg';

export default function FourthSection() {
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [currentPage, setCurrentPage] = useState(0);
  const [allBrands, setAllBrands] = useState<{ segmentName: string; brand: BrandItem }[]>([]);
  const [displayedPages, setDisplayedPages] = useState<{ segmentName: string; brand: BrandItem }[][]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Hardcoded list of segment folders
  const SEGMENT_FOLDERS = ['entertainment', 'fashion', 'filming', 'music'];

  // Load segment data from segment's JSON file
  const loadSegmentData = async (segmentFolder: string): Promise<SegmentData | null> => {
    try {
      const response = await fetch(`/brands/${segmentFolder}/${segmentFolder}.json`);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.warn(`Could not load segment data for ${segmentFolder}:`, error);
    }
    return null;
  };

  // Load all brands from all segments
  const loadAllBrands = async () => {
    const loadedBrands: { segmentName: string; brand: BrandItem }[] = [];
    
    for (const segmentFolder of SEGMENT_FOLDERS) {
      const segmentData = await loadSegmentData(segmentFolder);
      
      if (segmentData && segmentData.brands) {
        segmentData.brands.forEach(brand => {
          loadedBrands.push({
            segmentName: segmentFolder,
            brand: brand
          });
        });
      }
    }
    
    return loadedBrands;
  };

  // Shuffle array
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Generate pages with random brands
  const generatePages = (brands: { segmentName: string; brand: BrandItem }[], brandsPerPage: number) => {
    if (brands.length === 0) return [];
    
    const shuffled = shuffleArray(brands);
    const pages: typeof brands[] = [];
    
    for (let i = 0; i < shuffled.length; i += brandsPerPage) {
      const page = shuffled.slice(i, i + brandsPerPage);
      // Only add pages that have exactly brandsPerPage items
      if (page.length === brandsPerPage) {
        pages.push(page);
      }
    }
    
    // If no complete pages, create one from the shuffled array
    if (pages.length === 0 && shuffled.length >= brandsPerPage) {
      pages.push(shuffled.slice(0, brandsPerPage));
    }
    
    return pages;
  };

  useEffect(() => {
    const initBrands = async () => {
      setIsLoading(true);
      const loadedBrands = await loadAllBrands();
      setAllBrands(loadedBrands);
      
      const mobile = window.innerWidth <= 996;
      const brandsPerPage = mobile ? 9 : 15;
      const pages = generatePages(loadedBrands, brandsPerPage);
      
      setDisplayedPages(pages);
      setCurrentPage(0);
      setIsLoading(false);
    };
    
    initBrands();
    
    const checkMobile = () => {
      const mobile = window.innerWidth <= 996;
      setIsMobile(mobile);
      
      // Regenerate pages when screen size changes
      if (allBrands.length > 0) {
        const brandsPerPage = mobile ? 9 : 15;
        const pages = generatePages(allBrands, brandsPerPage);
        setDisplayedPages(pages);
        setCurrentPage(0);
      }
    };
    
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Regenerate pages when allBrands changes
  useEffect(() => {
    if (allBrands.length > 0) {
      const brandsPerPage = isMobile ? 9 : 15;
      const pages = generatePages(allBrands, brandsPerPage);
      setDisplayedPages(pages);
    }
  }, [allBrands, isMobile]);

  const totalPages = displayedPages.length;
  const currentBrands = displayedPages[currentPage] || [];

  const getTestimonial = (brandItem: typeof allBrands[0]): Testimonial | undefined => {
    return brandItem.brand.testimonial;
  };

  const getLogoUrl = (brandItem: typeof allBrands[0]): string => {
    const errorKey = `logo-${brandItem.segmentName}-${brandItem.brand.brandName}`;
    
    if (imageErrors[errorKey]) {
      return DEFAULT_LOGO;
    }
    
    if (brandItem.brand.logoUrl) {
      return brandItem.brand.logoUrl;
    }
    
    return `/brands/${brandItem.segmentName}/${brandItem.brand.brandName}-brand-logo.svg`;
  };

  const getAvatarUrl = (testimonial: Testimonial, segmentName: string): string => {
    const errorKey = `avatar-${segmentName}-${testimonial.brandName}`;
    
    if (imageErrors[errorKey]) {
      return DEFAULT_AVATAR;
    }
    
    if (testimonial.avatar && (testimonial.avatar.startsWith('http') || testimonial.avatar.startsWith('/'))) {
      return testimonial.avatar;
    }
    
    return `/brands/${segmentName}/${testimonial.brandName}-avatar.svg`;
  };

  const handleImageError = (errorKey: string) => {
    setImageErrors(prev => ({ ...prev, [errorKey]: true }));
  };

  const handleMouseEnter = (brandItem: typeof allBrands[0], event: React.MouseEvent) => {
    const testimonial = getTestimonial(brandItem);
    if (testimonial) {
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top
      });
      setHoveredBrand(brandItem.brand.brandName);
    }
  };

  const handleMouseLeave = () => {
    setHoveredBrand(null);
  };

  const handleBrandClick = (brandItem: typeof allBrands[0]) => {
    const testimonial = getTestimonial(brandItem);
    if (testimonial && testimonial.resource) {
      window.open(testimonial.resource, '_blank', 'noopener,noreferrer');
    }
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  const goToPrevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (diff > threshold) {
      goToNextPage();
    } else if (diff < -threshold) {
      goToPrevPage();
    }
  };

  const hoveredBrandData = hoveredBrand 
    ? allBrands.find(b => b.brand.brandName === hoveredBrand)
    : null;

  if (isLoading) {
    return (
      <section className={styles.brandsSection}>
        <div className="container">
          <div className={styles.header}>
            <h2 className={styles.title}>CHOSEN BY 200+ BRANDS AND SUPPLIERS</h2>
          </div>
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <p>Loading brands...</p>
          </div>
        </div>
      </section>
    );
  }

  if (displayedPages.length === 0) {
    return (
      <section className={styles.brandsSection}>
        <div className="container">
          <div className={styles.header}>
            <h2 className={styles.title}>CHOSEN BY 200+ BRANDS AND SUPPLIERS</h2>
          </div>
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <p>No brands available</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.brandsSection}>
      <div className="container">
        <div className={styles.header}>
          <h2 className={styles.title}>CHOSEN BY 200+ BRANDS AND SUPPLIERS</h2>
        </div>

        <div 
          className={styles.brandsContainer}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {!isMobile && totalPages > 1 && (
            <button
              className={clsx(styles.navButton, styles.navButtonLeft)}
              onClick={goToPrevPage}
              aria-label="Previous brands"
            >
              ‹
            </button>
          )}

          <div className={styles.brandsGrid}>
            {currentBrands.map((brandItem, index) => {
              const testimonial = getTestimonial(brandItem);

              return (
                <div
                  key={`${brandItem.segmentName}-${brandItem.brand.brandName}-${index}`}
                  className={styles.brandContainer}
                  onMouseEnter={(e) => handleMouseEnter(brandItem, e)}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => handleBrandClick(brandItem)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleBrandClick(brandItem);
                    }
                  }}
                >
                  <div className={styles.brandLogoWrapper}>
                    <img
                      src={getLogoUrl(brandItem)}
                      alt={brandItem.brand.brandName}
                      className={styles.brandLogo}
                      onError={() => handleImageError(`logo-${brandItem.segmentName}-${brandItem.brand.brandName}`)}
                    />
                    {testimonial && (
                      <div className={styles.label}>
                        {testimonial.labelName}
                      </div>
                    )}
                    <div className={styles.segmentLabel}>
                      {brandItem.segmentName}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!isMobile && totalPages > 1 && (
            <button
              className={clsx(styles.navButton, styles.navButtonRight)}
              onClick={goToNextPage}
              aria-label="Next brands"
            >
              ›
            </button>
          )}
        </div>

        {totalPages > 1 && (
          <div className={styles.pagination}>
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                className={clsx(styles.dot, index === currentPage && styles.dotActive)}
                onClick={() => goToPage(index)}
                aria-label={`Go to page ${index + 1}`}
              />
            ))}
          </div>
        )}

        {hoveredBrand && hoveredBrandData && (() => {
          const testimonial = getTestimonial(hoveredBrandData);
          if (!testimonial) return null;

          return (
            <div
              className={styles.testimonialTooltip}
              style={{
                left: `${tooltipPosition.x}px`,
                top: `${tooltipPosition.y}px`
              }}
            >
              <div className={styles.tooltipHeader}>
                <img
                  src={getAvatarUrl(testimonial, hoveredBrandData.segmentName)}
                  alt={testimonial.fullName}
                  className={styles.avatar}
                  onError={() => handleImageError(`avatar-${hoveredBrandData.segmentName}-${testimonial.brandName}`)}
                />
                <div className={styles.tooltipInfo}>
                  <div className={styles.representative}>
                    {testimonial.representative}
                  </div>
                  <div className={styles.fullName}>{testimonial.fullName}</div>
                  <div className={styles.jobTitle}>{testimonial.jobTitle}</div>
                </div>
              </div>
              <div className={styles.quote}>"{testimonial.quote}"</div>
            </div>
          );
        })()}
      </div>
    </section>
  );
}