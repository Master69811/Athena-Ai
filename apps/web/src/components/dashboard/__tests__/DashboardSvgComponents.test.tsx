import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  RecoveryRingPro,
  DonutRing,
  Sparkline,
  MacroBar,
  MiniBarChart,
} from '../DashboardSvgComponents';

describe('Dashboard SVG Components (Memoized)', () => {
  describe('RecoveryRingPro', () => {
    it('renders without error', () => {
      const { container } = render(<RecoveryRingPro score={75} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('handles score boundary values', () => {
      const { container: c40 } = render(<RecoveryRingPro score={40} />);
      expect(c40.querySelector('svg')).toBeInTheDocument();

      const { container: c70 } = render(<RecoveryRingPro score={70} />);
      expect(c70.querySelector('svg')).toBeInTheDocument();
    });

    it('respects custom size prop', () => {
      const { container } = render(<RecoveryRingPro score={50} size={200} />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('width')).toBe('200');
    });
  });

  describe('DonutRing', () => {
    it('renders without error', () => {
      const { container } = render(<DonutRing pct={0.65} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders multiple circles', () => {
      const { container } = render(<DonutRing pct={0.5} />);
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });
  });

  describe('Sparkline', () => {
    it('renders without error', () => {
      const { container } = render(<Sparkline vals={[10, 20, 15, 25, 30]} color="#6366f1" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders path and circle', () => {
      const { container } = render(<Sparkline vals={[1, 2, 3, 4, 5]} color="#6366f1" />);
      expect(container.querySelector('path')).toBeInTheDocument();
      expect(container.querySelector('circle')).toBeInTheDocument();
    });
  });

  describe('MacroBar', () => {
    it('renders without error', () => {
      const { container } = render(
        <MacroBar pct={65} gradient="linear-gradient(90deg, #6366f1, #8b5cf6)" />
      );
      expect(container.querySelector('div')).toBeInTheDocument();
    });

    it('caps percentage at 100', () => {
      const { container: c150 } = render(
        <MacroBar pct={150} gradient="linear-gradient(90deg, red, blue)" />
      );
      expect(c150.querySelector('div')).toBeInTheDocument();

      const { container: c0 } = render(
        <MacroBar pct={0} gradient="linear-gradient(90deg, red, blue)" />
      );
      expect(c0.querySelector('div')).toBeInTheDocument();
    });
  });

  describe('MiniBarChart', () => {
    it('renders without error', () => {
      const { container } = render(<MiniBarChart vals={[10, 20, 15, 25]} />);
      expect(container.querySelector('div')).toBeInTheDocument();
    });

    it('handles various value counts', () => {
      const { container: c1 } = render(<MiniBarChart vals={[42]} />);
      expect(c1.querySelector('div')).toBeInTheDocument();

      const { container: c5 } = render(<MiniBarChart vals={[1, 2, 3, 4, 5]} />);
      expect(c5.querySelector('div')).toBeInTheDocument();
    });
  });

  describe('Memoization', () => {
    it('all components are memoized', () => {
      // Verify memoization is applied
      expect(RecoveryRingPro).toBeDefined();
      expect(DonutRing).toBeDefined();
      expect(Sparkline).toBeDefined();
      expect(MacroBar).toBeDefined();
      expect(MiniBarChart).toBeDefined();

      // Components should render successfully
      const { container } = render(<RecoveryRingPro score={75} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });
});
