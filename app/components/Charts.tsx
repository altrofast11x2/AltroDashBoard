'use client';
// Chart.js 래퍼 — 라인 / 막대 / 원형(도넛). 테마 CSS 변수에 맞춰 색상 적용.
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, ArcElement,
  Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { fmt } from '@/lib/dates';

ChartJS.register(
  CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, ArcElement,
  Tooltip, Legend, Filler,
);

function cssVar(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function hexToRgba(hex: string, a: number) {
  const h = (hex || '#c0392b').replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

function baseOptions(unit?: string): any {
  const tick = cssVar('--muted', '#7a6e58');
  const grid = cssVar('--border', '#d4c9a8');
  const ink = cssVar('--ink', '#1a1208');
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: ink,
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (ctx: any) => `${fmt(ctx.parsed.y)}${unit ? ' ' + unit : ''}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: grid },
        ticks: { color: tick, font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
      },
      y: {
        grid: { color: grid },
        border: { display: false },
        ticks: { color: tick, font: { size: 11 }, maxTicksLimit: 5 },
      },
    },
  };
}

export function LineChart({ labels, values, color, unit }:
  { labels: string[]; values: (number | null)[]; color?: string; unit?: string }) {
  const c = color || cssVar('--accent', '#c0392b');
  const data = {
    labels,
    datasets: [{
      data: values,
      borderColor: c,
      backgroundColor: hexToRgba(c, 0.13),
      borderWidth: 2.5,
      pointRadius: 2.4,
      pointHoverRadius: 5,
      pointBackgroundColor: c,
      tension: 0.32,
      fill: true,
      spanGaps: true,
    }],
  };
  return <Line data={data} options={baseOptions(unit)} />;
}

export function BarChart({ labels, values, color, unit }:
  { labels: string[]; values: (number | null)[]; color?: string; unit?: string }) {
  const c = color || cssVar('--accent', '#c0392b');
  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: hexToRgba(c, 0.82),
      hoverBackgroundColor: c,
      borderRadius: 5,
      maxBarThickness: 38,
    }],
  };
  return <Bar data={data} options={baseOptions(unit)} />;
}

export function DoughnutChart({ items }:
  { items: { name: string; total: number; color: string }[] }) {
  const tick = cssVar('--text-soft', '#4a3f2c');
  const ink = cssVar('--ink', '#1a1208');
  const surface = cssVar('--surface', '#fdfaf4');
  const data = {
    labels: items.map(i => i.name),
    datasets: [{
      data: items.map(i => i.total),
      backgroundColor: items.map(i => i.color),
      borderColor: surface,
      borderWidth: 2,
      hoverOffset: 6,
    }],
  };
  const opts: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    animation: { duration: 500 },
    plugins: {
      legend: {
        position: 'right',
        labels: { color: tick, font: { size: 12 }, boxWidth: 12, boxHeight: 12, padding: 12, usePointStyle: true },
      },
      tooltip: {
        backgroundColor: ink,
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => {
            const total = ctx.dataset.data.reduce((s: number, v: number) => s + v, 0) || 1;
            const pct = Math.round((ctx.parsed / total) * 100);
            return ` ${ctx.label}: ${fmt(ctx.parsed)} (${pct}%)`;
          },
        },
      },
    },
  };
  return <Doughnut data={data} options={opts} />;
}
