import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  const leftEyeRef = useRef<HTMLDivElement>(null);
  const rightEyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const updateEye = (eyeRef: React.RefObject<HTMLDivElement | null>) => {
        if (!eyeRef.current) return;
        const eye = eyeRef.current;
        const pupil = eye.querySelector(`.${styles.pupil}`) as HTMLElement;
        if (!pupil) return;

        const rect = eye.getBoundingClientRect();
        const eyeX = rect.left + rect.width / 2;
        const eyeY = rect.top + rect.height / 2;

        const mouseX = event.clientX;
        const mouseY = event.clientY;

        const angle = Math.atan2(mouseY - eyeY, mouseX - eyeX);
        
        // Limit pupil movement radius inside the eye
        const maxDistance = rect.width / 4; 
        const distanceX = Math.cos(angle) * maxDistance;
        const distanceY = Math.sin(angle) * maxDistance;

        pupil.style.transform = `translate(${distanceX}px, ${distanceY}px)`;
      };

      updateEye(leftEyeRef);
      updateEye(rightEyeRef);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.eyesContainer}>
          <div ref={leftEyeRef} className={styles.eye} aria-hidden="true">
            <div className={styles.pupil} />
          </div>
          <div ref={rightEyeRef} className={styles.eye} aria-hidden="true">
            <div className={styles.pupil} />
          </div>
        </div>

        <div className={styles.headingArea}>
          <h1 className={styles.title}>Looks Like You're Lost</h1>
          <p className={styles.subtitle}>404 error</p>
        </div>

        <Link to="/dashboard" className={styles.homeBtn} aria-label="Go back to dashboard home">
          Back To Home
        </Link>
      </div>
    </div>
  );
}
