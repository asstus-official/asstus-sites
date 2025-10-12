import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';

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
const DEFAULT_AVATAR = '/img/brands/default-avatar.png';
const DEFAULT_LOGO = '/img/brands/default-logo.svg';

export default function FourthSection() {
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [currentPage, setCurrentPage] = useState(0);
  const [displayedBrands, setDisplayedBrands] = useState<{ segmentName: string; brand: BrandItem }[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Scan brands directory to find all segment folders
  const scanBrandsDirectory = async (): Promise<string[]> => {
    try {
      // Try to fetch index.json that lists all segment folders
      const response = await fetch('/img/brands/index.json');
      if (response.ok) {
        const data = await response.json();
        return data.segments || [];
      }
    } catch (error) {
      console.warn('Could not load brands directory index');
    }
    return [];
  };

  // Load segment data from segment's JSON file
  const loadSegmentData = async (segmentFolder: string): Promise<SegmentData | null> => {
    try {
      const response = await fetch(`/img/brands/${segmentFolder}/${segmentFolder}.json`);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.warn(`Could not load segment data for ${segmentFolder}`);
    }
    return null;
  };

  // Load all brands from all segments
  const loadAllBrands = async () => {
    const allBrands: { segmentName: string; brand: BrandItem }[] = [];
    
    // Get list of segment folders
    const segmentFolders = await scanBrandsDirectory();
    
    // Load each segment's data
    for (const segmentFolder of segmentFolders) {
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
    // Group brands by segment
    const brandsBySegment: Record<string, typeof allBrands> = {};
    allBrands.forEach(item => {
      if (!brandsBySegment[item.segmentName]) {
        brandsBySegment[item.segmentName] = [];
      }
      brandsBySegment[item.segmentName].push(item);
    });

    const selected: typeof allBrands = [];
    
    // Pick 1-3 random brands from each segment
    Object.entries(brandsBySegment).forEach(([segment, brands]) => {
      const count = Math.floor(Math.random() * 3) + 1;
      const shuffled = [...brands].sort(() => Math.random() - 0.5);
      const picked = shuffled.slice(0, Math.min(count, brands.length));
      selected.push(...picked);
    });
    
    // Shuffle the final selection
    return selected.sort(() => Math.random() - 0.5);
  };

  // Initialize brands on mount
  useEffect(() => {
    const initBrands = async () => {
      const allBrands = await loadAllBrands();
      const randomBrands = selectRandomBrands(allBrands);
      setDisplayedBrands(randomBrands);
    };
    
    initBrands();
    
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 996);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate pagination
  const brandsPerPage = isMobile ? 3 : 6;
  const totalPages = Math.ceil(displayedBrands.length / brandsPerPage);
  const startIndex = currentPage * brandsPerPage;
  const endIndex = startIndex + brandsPerPage;
  const currentBrands = displayedBrands.slice(startIndex, endIndex);

  // Get testimonial for a brand
  const getTestimonial = (brandItem: typeof displayedBrands[0]): Testimonial | undefined => {
    return brandItem.brand.testimonial;
  };

  // Get logo URL with fallback
  const getLogoUrl = (brandItem: typeof displayedBrands[0]): string => {
    const errorKey = `logo-${brandItem.segmentName}-${brandItem.brand.brandName}`;
    
    if (imageErrors[errorKey]) {
      return DEFAULT_LOGO;
    }
    
    // Priority: 1. JSON logoUrl, 2. Local file path, 3. Fallback
    if (brandItem.brand.logoUrl) {
      return brandItem.brand.logoUrl;
    }
    
    // Default path: /img/brands/{segment}/{brandname}-brand-logo.svg
    return `/img/brands/${brandItem.segmentName}/${brandItem.brand.brandName}-brand-logo.svg`;
  };

  // Get avatar URL with fallback
  const getAvatarUrl = (testimonial: Testimonial, segmentName: string): string => {
    const errorKey = `avatar-${segmentName}-${testimonial.brandName}`;
    
    if (imageErrors[errorKey]) {
      return DEFAULT_AVATAR;
    }
    
    // If avatar is a URL or starts with /, use it directly
    if (testimonial.avatar && (testimonial.avatar.startsWith('http') || testimonial.avatar.startsWith('/'))) {
      return testimonial.avatar;
    }
    
    // Otherwise, construct path: /img/brands/{segment}/{brandname}-avatar.svg
    return `/img/brands/${segmentName}/${testimonial.brandName}-avatar.svg`;
  };

  // Handle image load error
  const handleImageError = (errorKey: string) => {
    setImageErrors(prev => ({ ...prev, [errorKey]: true }));
  };

  // Handle mouse enter on brand logo
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

  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoveredBrand(null);
  };

  // Navigation handlers
  const goToNextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  const goToPrevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  // Touch handlers for mobile swipe
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

  // Find the hovered brand data for tooltip
  const hoveredBrandData = hoveredBrand 
    ? displayedBrands.find(b => b.brand.brandName === hoveredBrand)
    : null;

  return (
    <section className="brands-section" style={{
      padding: '4rem 0',
      backgroundColor: 'var(--ifm-background-color)',
      position: 'relative'
    }}>
      <style>{`
        .brands-section .brands-header {
          text-align: center;
          margin-bottom: 3rem;
        }
        
        .brands-section .brands-title {
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: var(--ifm-heading-color);
          margin: 0;
        }
        
        .brands-section .brands-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 0;
          min-height: 300px;
        }
        
        .brands-section .brands-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 3rem;
          max-width: 900px;
          width: 100%;
          justify-items: center;
          align-items: center;
          padding: 0 4rem;
        }
        
        .brands-section .brand-container {
          position: relative;
          cursor: pointer;
          transition: transform 0.3s ease;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .brands-section .brand-container:hover {
          transform: scale(1.08);
        }
        
        .brands-section .brand-logo-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        
        .brands-section .brand-logo {
          height: 70px;
          width: auto;
          max-width: 160px;
          object-fit: contain;
          filter: grayscale(100%);
          opacity: 0.7;
          transition: all 0.3s ease;
        }
        
        .brands-section .brand-container:hover .brand-logo {
          filter: grayscale(0%);
          opacity: 1;
        }
        
        .brands-section .brand-label {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          background-color: #4A90E2;
          color: white;
          padding: 0.3rem 0.8rem;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3);
          z-index: 5;
        }
        
        .brands-section .nav-button {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: white;
          border: 2px solid var(--ifm-color-emphasis-300);
          border-radius: 50%;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          color: var(--ifm-color-emphasis-700);
          cursor: pointer;
          transition: all 0.3s ease;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .brands-section .nav-button:hover {
          background: var(--ifm-color-primary);
          color: white;
          border-color: var(--ifm-color-primary);
          transform: translateY(-50%) scale(1.1);
        }
        
        .brands-section .nav-button:active {
          transform: translateY(-50%) scale(0.95);
        }
        
        .brands-section .nav-button-left {
          left: 0;
        }
        
        .brands-section .nav-button-right {
          right: 0;
        }
        
        .brands-section .brands-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.75rem;
          margin-top: 2rem;
        }
        
        .brands-section .pagination-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid var(--ifm-color-emphasis-400);
          background: transparent;
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 0;
        }
        
        .brands-section .pagination-dot:hover {
          border-color: var(--ifm-color-primary);
          transform: scale(1.2);
        }
        
        .brands-section .pagination-dot-active {
          background: var(--ifm-color-primary);
          border-color: var(--ifm-color-primary);
          width: 12px;
          height: 12px;
        }
        
        .brands-section .testimonial-tooltip {
          position: fixed;
          transform: translate(-50%, calc(-100% - 20px));
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          min-width: 340px;
          max-width: 400px;
          pointer-events: none;
          animation: fadeInTooltip 0.2s ease;
        }
        
        @keyframes fadeInTooltip {
          from {
            opacity: 0;
            transform: translate(-50%, calc(-100% - 10px));
          }
          to {
            opacity: 1;
            transform: translate(-50%, calc(-100% - 20px));
          }
        }
        
        .brands-section .testimonial-tooltip::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-top: 10px solid white;
        }
        
        .brands-section .tooltip-header {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          align-items: flex-start;
        }
        
        .brands-section .tooltip-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
          border: 3px solid var(--ifm-color-primary-lighter);
        }
        
        .brands-section .tooltip-info {
          flex: 1;
        }
        
        .brands-section .tooltip-representative {
          font-size: 0.75rem;
          color: var(--ifm-color-primary);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
        }
        
        .brands-section .tooltip-fullname {
          font-size: 1rem;
          font-weight: 700;
          color: var(--ifm-heading-color);
          margin-bottom: 0.25rem;
        }
        
        .brands-section .tooltip-jobtitle {
          font-size: 0.85rem;
          color: var(--ifm-color-emphasis-600);
          font-weight: 500;
        }
        
        .brands-section .tooltip-quote {
          font-size: 0.95rem;
          line-height: 1.6;
          color: var(--ifm-font-color-base);
          font-style: italic;
          padding-top: 0.75rem;
          border-top: 1px solid var(--ifm-color-emphasis-200);
        }
        
        [data-theme='dark'] .brands-section .nav-button {
          background: #2a2a2a;
          border-color: var(--ifm-color-emphasis-500);
          color: var(--ifm-color-emphasis-700);
        }
        
        [data-theme='dark'] .brands-section .nav-button:hover {
          background: var(--ifm-color-primary);
          color: white;
          border-color: var(--ifm-color-primary);
        }
        
        [data-theme='dark'] .brands-section .testimonial-tooltip {
          background: #2a2a2a;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        }
        
        [data-theme='dark'] .brands-section .testimonial-tooltip::after {
          border-top-color: #2a2a2a;
        }
        
        [data-theme='dark'] .brands-section .tooltip-quote {
          border-top-color: var(--ifm-color-emphasis-300);
        }
        
        @media (max-width: 996px) {
          .brands-section {
            padding: 3rem 0;
          }
          
          .brands-section .brands-title {
            font-size: 1.1rem;
            padding: 0 1rem;
            line-height: 1.4;
          }
          
          .brands-section .brands-container {
            min-height: 400px;
            padding: 1rem 0;
          }
          
          .brands-section .brands-grid {
            grid-template-columns: 1fr;
            gap: 3rem;
            padding: 0 2rem;
            max-width: 100%;
          }
          
          .brands-section .brand-container {
            padding: 1rem 0;
          }
          
          .brands-section .brand-logo {
            height: 80px;
            max-width: 200px;
          }
          
          .brands-section .brand-label {
            font-size: 0.75rem;
            padding: 0.35rem 0.9rem;
          }
          
          .brands-section .nav-button {
            display: none;
          }
          
          .brands-section .brands-pagination {
            margin-top: 2.5rem;
            gap: 1rem;
          }
          
          .brands-section .pagination-dot {
            width: 12px;
            height: 12px;
          }
          
          .brands-section .pagination-dot-active {
            width: 14px;
            height: 14px;
          }
          
          .brands-section .testimonial-tooltip {
            min-width: 300px;
            max-width: calc(100vw - 2rem);
            padding: 1.25rem;
          }
          
          .brands-section .tooltip-avatar {
            width: 55px;
            height: 55px;
          }
          
          .brands-section .tooltip-fullname {
            font-size: 0.95rem;
          }
          
          .brands-section .tooltip-jobtitle {
            font-size: 0.8rem;
          }
          
          .brands-section .tooltip-quote {
            font-size: 0.9rem;
          }
        }
        
        @media (max-width: 768px) {
          .brands-section .brands-title {
            font-size: 1rem;
          }
          
          .brands-section .brands-container {
            min-height: 350px;
          }
          
          .brands-section .brands-grid {
            gap: 2.5rem;
            padding: 0 1.5rem;
          }
          
          .brands-section .brand-logo {
            height: 70px;
            max-width: 180px;
          }
          
          .brands-section .brand-label {
            font-size: 0.7rem;
            padding: 0.3rem 0.8rem;
          }
          
          .brands-section .testimonial-tooltip {
            min-width: 280px;
          }
        }
        
        @media (max-width: 480px) {
          .brands-section {
            padding: 2rem 0;
          }
          
          .brands-section .brands-title {
            font-size: 0.9rem;
            padding: 0 0.5rem;
          }
          
          .brands-section .brands-container {
            min-height: 300px;
          }
          
          .brands-section .brands-grid {
            gap: 2rem;
            padding: 0 1rem;
          }
          
          .brands-section .brand-logo {
            height: 60px;
            max-width: 160px;
          }
          
          .brands-section .brands-pagination {
            gap: 0.8rem;
            margin-top: 2rem;
          }
          
          .brands-section .pagination-dot {
            width: 10px;
            height: 10px;
          }
          
          .brands-section .pagination-dot-active {
            width: 12px;
            height: 12px;
          }
        }
      `}</style>
      <div className="container">
        <div className="brands-header">
          <h2 className="brands-title">CHOSEN BY 200+ BRANDS AND SUPPLIERS</h2>
        </div>

        {/* Brand Display Area */}
        <div 
          className="brands-container"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Navigation Arrow - Left (Desktop) */}
          {!isMobile && totalPages > 1 && (
            <button
              className="nav-button nav-button-left"
              onClick={goToPrevPage}
              aria-label="Previous brands"
            >
              ‹
            </button>
          )}

          {/* Brands Grid */}
          <div className="brands-grid">
            {currentBrands.map((brandItem, index) => {
              const testimonial = getTestimonial(brandItem);
              const hasLabel = !!testimonial;

              return (
                <div
                  key={`${brandItem.segmentName}-${brandItem.brand.brandName}-${index}`}
                  className="brand-container"
                  onMouseEnter={(e) => handleMouseEnter(brandItem, e)}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="brand-logo-wrapper">
                    <img
                      src={getLogoUrl(brandItem)}
                      alt={brandItem.brand.brandName}
                      className="brand-logo"
                      onError={() => handleImageError(`logo-${brandItem.segmentName}-${brandItem.brand.brandName}`)}
                    />
                    {hasLabel && testimonial && (
                      <div className="brand-label">
                        {testimonial.labelName}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Arrow - Right (Desktop) */}
          {!isMobile && totalPages > 1 && (
            <button
              className="nav-button nav-button-right"
              onClick={goToNextPage}
              aria-label="Next brands"
            >
              ›
            </button>
          )}
        </div>

        {/* Pagination Dots */}
        {totalPages > 1 && (
          <div className="brands-pagination">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                className={clsx('pagination-dot', index === currentPage && 'pagination-dot-active')}
                onClick={() => goToPage(index)}
                aria-label={`Go to page ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Testimonial Tooltip */}
        {hoveredBrand && hoveredBrandData && (() => {
          const testimonial = getTestimonial(hoveredBrandData);
          if (!testimonial) return null;

          return (
            <div
              className="testimonial-tooltip"
              style={{
                left: `${tooltipPosition.x}px`,
                top: `${tooltipPosition.y}px`
              }}
            >
              <div className="tooltip-header">
                <img
                  src={getAvatarUrl(testimonial, hoveredBrandData.segmentName)}
                  alt={testimonial.fullName}
                  className="tooltip-avatar"
                  onError={() => handleImageError(`avatar-${hoveredBrandData.segmentName}-${testimonial.brandName}`)}
                />
                <div className="tooltip-info">
                  <div className="tooltip-representative">
                    {testimonial.representative}
                  </div>
                  <div className="tooltip-fullname">{testimonial.fullName}</div>
                  <div className="tooltip-jobtitle">{testimonial.jobTitle}</div>
                </div>
              </div>
              <div className="tooltip-quote">"{testimonial.quote}"</div>
            </div>
          );
        })()}
      </div>
    </section>
  );
}