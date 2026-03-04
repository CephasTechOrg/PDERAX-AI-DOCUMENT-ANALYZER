'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import styles from './StatCard.module.css';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color?: string;
}

export function StatCard({ icon: Icon, label, value, color = '#0084E8' }: StatCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.iconWrap} style={{ backgroundColor: `${color}14`, color }}>
        <Icon size={20} />
      </div>
      <div className={styles.content}>
        <span className={styles.value}>{value}</span>
        <span className={styles.label}>{label}</span>
      </div>
    </div>
  );
}
