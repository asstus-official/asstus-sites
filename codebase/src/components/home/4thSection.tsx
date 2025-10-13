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
  const [displayedBrands, setDisplayedBrands] = useState<{ segmentName: string; brand: BrandItem }[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
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
    const allBrands: { segmentName: string; brand: BrandItem }[] = [];
    
    for (const segmentFolder of SEGMENT_FOLDERS) {
      const segmentData = await loadSegmentData(segmentFolder);
      
      if (segmentData && segmentData.brands) {
        segmentData.brands.forEach(brand => {
          allBrands.push({
            segmentName: segmentFolder,
            brand: brand
          });
        });
      }
    }
    
    return allBrands;
  };

  // Random selection function
  const selectRandomBrands = (allBrands: { segmentName: string; brand: BrandItem }[]) => {
    const brandsBySegment: Record<string, typeof allBrands> = {};
    allBrands.forEach(item => {
      if (!brandsBySegment[item.segmentName]) {
        brandsBySegment[item.segmentName] = [];
      }
      brandsBySegment[item.segmentName].push(item);
    });

    const selected: typeof allBrands = [];
    
    Object.entries(brandsBySegment).forEach(([segment, brands]) => {
      const count = Math.floor(Math.random() * 3) + 1;
      const shuffled = [...brands].sort(() => Math.random() - 0.5);
      const picked = shuffled.slice(0, Math.min(count, brands.length));
      selected.push(...picked);
    });
    
    return selected.sort(() => Math.random() - 0.5);
  };

  useEffect(() => {
    const initBrands = async () => {
      const allBrands = await loadAllBrands();
      if (allBrands.length > 0) {
        const randomBrands = selectRandomBrands(allBrands);
        setDisplayedBrands(randomBrands);
      }
    };
    
    initBrands();
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 996);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const brandsPerPage = isMobile ? 9 : 15;
  const totalPages = Math.ceil(displayedBrands.length / brandsPerPage);
  const startIndex = currentPage * brandsPerPage;
  const endIndex = startIndex + brandsPerPage;
  const currentBrands = displayedBrands.slice(startIndex, endIndex);

  const getTestimonial = (brandItem: typeof displayedBrands[0]): Testimonial | undefined => {
    return brandItem.brand.testimonial;
  };

  const getLogoUrl = (brandItem: typeof displayedBrands[0]): string => {
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

  const handleMouseEnter = (brandItem: typeof displayedBrands[0], event: React.MouseEvent) => {
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
    ? displayedBrands.find(b => b.brand.brandName === hoveredBrand)
    : null;

  if (displayedBrands.length === 0) {
    return (
      <section className={styles.brandsSection}>
        <div className="container">
          <p>Loading brands...</p>
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