// SEWA XAI — frontend/src/components/ui/Skeleton.tsx
import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ width, height, borderRadius = 8, className, style }: SkeletonProps) {
  return (
    <div
      className={`skeleton-base ${className || ''}`}
      style={{
        width: width || '100%',
        height: height || '1rem',
        borderRadius,
        backgroundColor: '#162821', // C.bg4 from the dashboards
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div className="skeleton-shimmer" />
      <style>{`
        .skeleton-base {
          display: inline-block;
        }
        .skeleton-shimmer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(64, 141, 123, 0.05) 50%,
            transparent 100%
          );
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div style={{ padding: 20, background: '#0C1D17', borderRadius: 14, border: '1px solid #1B3028' }}>
      <Skeleton width="40%" height={12} style={{ marginBottom: 12 }} />
      <Skeleton width="70%" height={28} />
      <Skeleton width="30%" height={10} style={{ marginTop: 8 }} />
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div style={{ display: 'flex', gap: 12, padding: 12, borderTop: '1px solid #1B3028' }}>
      <Skeleton width="20%" height={16} />
      <Skeleton width="15%" height={16} />
      <Skeleton width="10%" height={16} />
      <Skeleton width="15%" height={16} />
      <Skeleton width="10%" height={16} />
      <Skeleton width="20%" height={16} />
    </div>
  );
}
