import type {ReactNode} from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

export default function FirstSection(): ReactNode {
  return (
    <section className={styles.heroSection}>
      <div className="container">
        <div className={styles.row}>
          {/* Left Column - Content */}
          <div className={styles.leftColumn}>
            <div className={styles.content}>
              <h1 className={styles.tagline}>
                Build beautiful documentation sites with ease
              </h1>
              <div className={styles.buttons}>
                <button className={clsx(styles.button, styles.buttonSecondary)}>
                  Learn More
                </button>
                <button className={clsx(styles.button, styles.buttonPrimary)}>
                  Get Started
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Animation */}
          <div className={styles.rightColumn}>
            <div className={styles.animationContainer}>
              <img 
                src="/img/1stSection-animation.gif" 
                alt="Documentation animation"
                className={styles.animation}
              />
            </div>
          </div>

          {/* Mobile Overlay Content */}
          <div className={styles.mobileOverlay}>
            <div className={styles.overlayContent}>
              <h1 className={styles.taglineMobile}>
                Build beautiful documentation sites with ease
              </h1>
              <div className={styles.buttonsMobile}>
                <button className={clsx(styles.button, styles.buttonSecondary)}>
                  Learn More
                </button>
                <button className={clsx(styles.button, styles.buttonPrimary)}>
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}