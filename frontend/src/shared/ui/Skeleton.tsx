import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  circle?: boolean;
}

export function Skeleton({
  width,
  height,
  borderRadius,
  className = '',
  circle = false,
}: SkeletonProps) {
  const style: React.CSSProperties = {
    width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined,
    borderRadius: circle
      ? '50%'
      : borderRadius !== undefined
      ? (typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius)
      : 'var(--radius-sm)',
  };

  return <span className={`${styles.skeleton} ${className}`} style={style} />;
}
