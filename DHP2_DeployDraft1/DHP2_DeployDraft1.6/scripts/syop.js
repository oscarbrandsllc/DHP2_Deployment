(function () {
  const PAGE_ID = 'research';
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const colors = {
    bg: '#0B0E16',
    panel: 'rgba(18, 21, 38, 0.78)',
    panelBorder: 'rgba(132, 146, 255, 0.16)',
    text: '#F5F7FF',
    subtext: '#A7AFD4',
    muted: '#303854',
    grid: 'rgba(148, 163, 255, 0.16)',
    accentA: '#3BE4E4',
    accentB: '#7C83FF',
    accentC: '#FF75D1',
    qb: '#6311ee',
    rb: '#730fff',
    wr: '#8021ff',
    te: '#922fff'
  };

  const SUNBURST_NODES = [
    { id: 'root', parent: null, label: 'SYOP Averages', subtitle: 'Mean Λ vs Mode M', value: 51.6 },
    { id: 'qb', parent: 'root', label: 'QB', subtitle: 'Quarterbacks', value: 16.46, series: 'QB' },
    { id: 'qb-prime-lambda', parent: 'qb', label: 'Prime Λ', subtitle: '7.2 yrs', value: 6.5, abbr: 'SPΛ', stat: '7.2' },
    { id: 'qb-breakout-lambda', parent: 'qb', label: 'Breakout Λ', subtitle: '2.3 yrs', value: 2.49, abbr: 'BOΛ', stat: '2.3' },
    { id: 'qb-prime-mode', parent: 'qb', label: 'Prime M', subtitle: '6.0 yrs', value: 5.35, abbr: 'SPM', stat: '6.0' },
    { id: 'qb-baseline-mode', parent: 'qb', label: 'Baseline M', subtitle: '1.0 yrs', value: 2.1, abbr: 'BOM', stat: '1.0' },
    { id: 'rb', parent: 'root', label: 'RB', subtitle: 'Running Backs', value: 9.8, series: 'RB' },
    { id: 'rb-prime-lambda', parent: 'rb', label: 'Prime Λ', subtitle: '3.4 yrs', value: 3.31, abbr: 'SPΛ', stat: '3.4' },
    { id: 'rb-breakout-lambda', parent: 'rb', label: 'Breakout Λ', subtitle: '2.2 yrs', value: 2.5, abbr: 'BOΛ', stat: '2.2' },
    { id: 'rb-prime-mode', parent: 'rb', label: 'Prime M', subtitle: '0.7 yrs', value: 1.89, abbr: 'SPM', stat: '0.7' },
    { id: 'rb-baseline-mode', parent: 'rb', label: 'Baseline M', subtitle: '1.7 yrs', value: 2.1, abbr: 'BOM', stat: '1.7' },
    { id: 'wr', parent: 'root', label: 'WR', subtitle: 'Wide Receivers', value: 12.82, series: 'WR' },
    { id: 'wr-prime-lambda', parent: 'wr', label: 'Prime Λ', subtitle: '4.9 yrs', value: 4.92, abbr: 'SPΛ', stat: '4.9' },
    { id: 'wr-breakout-lambda', parent: 'wr', label: 'Breakout Λ', subtitle: '2.9 yrs', value: 2.84, abbr: 'BOΛ', stat: '2.9' },
    { id: 'wr-prime-mode', parent: 'wr', label: 'Prime M', subtitle: '3.0 yrs', value: 3, abbr: 'SPM', stat: '3.0' },
    { id: 'wr-baseline-mode', parent: 'wr', label: 'Baseline M', subtitle: '2.0 yrs', value: 2, abbr: 'BOM', stat: '2.0' },
    { id: 'te', parent: 'root', label: 'TE', subtitle: 'Tight Ends', value: 12.5, series: 'TE' },
    { id: 'te-prime-lambda', parent: 'te', label: 'Prime Λ', subtitle: '4.0 yrs', value: 4.01, abbr: 'SPΛ', stat: '4.0' },
    { id: 'te-breakout-lambda', parent: 'te', label: 'Breakout Λ', subtitle: '3.5 yrs', value: 3.49, abbr: 'BOΛ', stat: '3.5' },
    { id: 'te-prime-mode', parent: 'te', label: 'Prime M', subtitle: '2.0 yrs', value: 2, abbr: 'SPM', stat: '2.0' },
    { id: 'te-baseline-mode', parent: 'te', label: 'Baseline M', subtitle: '3.0 yrs', value: 3, abbr: 'BOM', stat: '3.0' }
  ];

  const SYOP_DATA = [
    { SYOP: '1', 'QB %': 6.67, 'RB %': 27.54, 'WR %': 13.0, 'TE %': 26.92 },
    { SYOP: '2', 'QB %': 11.11, 'RB %': 20.29, 'WR %': 14.1, 'TE %': 26.92 },
    { SYOP: '3', 'QB %': 8.89, 'RB %': 11.59, 'WR %': 14.1, 'TE %': 7.69 },
    { SYOP: '4', 'QB %': 8.89, 'RB %': 11.4, 'WR %': 12.0, 'TE %': 7.69 },
    { SYOP: '5', 'QB %': 4.44, 'RB %': 13.04, 'WR %': 5.4, 'TE %': 0.4 },
    { SYOP: '6', 'QB %': 13.33, 'RB %': 5.8, 'WR %': 7.6, 'TE %': 7.69 },
    { SYOP: '7', 'QB %': 8.89, 'RB %': 1.45, 'WR %': 13.0, 'TE %': 7.69 },
    { SYOP: '8', 'QB %': 4.44, 'RB %': 2.9, 'WR %': 9.8, 'TE %': 0.4 },
    { SYOP: '9', 'QB %': 11.11, 'RB %': 3.3, 'WR %': 2.2, 'TE %': 3.85 },
    { SYOP: '10', 'QB %': 2.22, 'RB %': 1.45, 'WR %': 4.49, 'TE %': 3.51 },
    { SYOP: '11', 'QB %': 0.4, 'RB %': 1.45, 'WR %': 2.2, 'TE %': 3.85 },
    { SYOP: '12+', 'QB %': 20.0, 'RB %': 0.4, 'WR %': 2.2, 'TE %': 3.85 }
  ];

  const POSITION_CONFIG = [
    { key: 'QB', percentKey: 'QB %', label: 'Quarterbacks', color: colors.qb },
    { key: 'RB', percentKey: 'RB %', label: 'Running Backs', color: colors.rb },
    { key: 'WR', percentKey: 'WR %', label: 'Wide Receivers', color: colors.wr },
    { key: 'TE', percentKey: 'TE %', label: 'Tight Ends', color: colors.te }
  ];

  const BAR_GRADIENTS = {
    QB: [
      { offset: '0%', color: '#FFF2F8', opacity: 0.24 },
      { offset: '34%', color: '#FF8AB9', opacity: 0.36 },
      { offset: '70%', color: '#FF3A75', opacity: 0.64 },
      { offset: '100%', color: '#C01B56', opacity: 0.8 }
    ],
    RB: [
      { offset: '0%', color: '#EBFFFB', opacity: 0.22 },
      { offset: '32%', color: '#60F6E2', opacity: 0.34 },
      { offset: '70%', color: '#00EBD3', opacity: 0.62 },
      { offset: '100%', color: '#009E8B', opacity: 0.8 }
    ],
    WR: [
      { offset: '0%', color: '#EFF6FF', opacity: 0.22 },
      { offset: '32%', color: '#92C8FF', opacity: 0.38 },
      { offset: '70%', color: '#58A7FF', opacity: 0.64 },
      { offset: '100%', color: '#236FDD', opacity: 0.82 }
    ],
    TE: [
      { offset: '0%', color: '#F8F0FF', opacity: 0.22 },
      { offset: '32%', color: '#CFA6FF', opacity: 0.4 },
      { offset: '70%', color: '#B469FF', opacity: 0.66 },
      { offset: '100%', color: '#712DCC', opacity: 0.84 }
    ],
    DEFAULT: [
      { offset: '0%', color: '#8F97FF', opacity: 0.2 },
      { offset: '100%', color: '#5C4BFF', opacity: 0.54 }
    ]
  };

  const POSITION_TOTALS = {
    QB: 52,
    RB: 96,
    WR: 107,
    TE: 42
  };

  const GAUGES = [
    { key: 'QB', value: 7.22, color: colors.qb },
    { key: 'RB', value: 3.39, color: colors.wr },
    { key: 'WR', value: 4.9, color: colors.rb },
    { key: 'TE', value: 4.0, color: colors.te }
  ];

  const DRAFT_OVERALL = [
    { rd: '1', hit: 78.4 },
    { rd: '2', hit: 47.7 },
    { rd: '3', hit: 38.5 },
    { rd: '4', hit: 18.0 },
    { rd: '5', hit: 15.0 },
    { rd: '6', hit: 14.1 },
    { rd: '7', hit: 9.4 }
  ];

  const DRAFT_POSITIONAL = [
    { rd: '1', QB: 78, RB: 83, TE: 78, WR: 76 },
    { rd: '2', QB: 42, RB: 50, TE: 40, WR: 51 },
    { rd: '3', QB: 31, RB: 62, TE: 36, WR: 30 },
    { rd: '4', QB: 20, RB: 27, TE: 23, WR: 9 },
    { rd: '5', QB: 7, RB: 27, TE: 9, WR: 13 },
    { rd: '6', QB: 11, RB: 18, TE: 8, WR: 15 },
    { rd: '7', QB: 13, RB: 9, TE: 4, WR: 11 }
  ];

  const DRAFT_SERIES = [
    { key: 'QB', color: '#FF41E1' },
    { key: 'RB', color: '#20F7A7' },
    { key: 'TE', color: '#9E5AF7' },
    { key: 'WR', color: '#46E7FF' }
  ];

  const DRAFT_OVERALL_MAX = Math.max(...DRAFT_OVERALL.map((row) => row.hit));
  const DRAFT_POSITIONAL_MAX = Math.max(
    ...DRAFT_POSITIONAL.flatMap((row) => DRAFT_SERIES.map((series) => Number(row[series.key]) || 0))
  );
  const DRAFT_CHART_NICE_MAX = Math.max(10, Math.ceil(Math.max(DRAFT_OVERALL_MAX, DRAFT_POSITIONAL_MAX) / 10) * 10);

  const SERIES_CONFIG = [
    { key: 'QB %', label: 'QB %', color: colors.qb },
    { key: 'RB %', label: 'RB %', color: colors.rb },
    { key: 'WR %', label: 'WR %', color: colors.wr },
    { key: 'TE %', label: 'TE %', color: colors.te }
  ];

  const syopChartState = {
    activePosition: POSITION_CONFIG[0]?.key || null,
    showTable: false
  };

  const { distributionByPosition: SYOP_DISTRIBUTION, summaryByPosition: SYOP_POSITION_SUMMARY } = buildSyopSummary();

  let resizeTimer = null;

  function buildSyopSummary() {
    const distributionByPosition = {};
    const summaryByPosition = {};

    POSITION_CONFIG.forEach((config) => {
      const totalPlayers = POSITION_TOTALS[config.key] || 0;
      const allocation = allocateBucketCounts(config.percentKey, totalPlayers);
      const valueSamples = [];

      allocation.forEach(({ bucket, count }) => {
        const numericValue = bucketToNumeric(bucket);
        for (let i = 0; i < count; i += 1) {
          valueSamples.push(numericValue);
        }
      });

      valueSamples.sort((a, b) => a - b);
      const { median, q1, q3 } = computeQuantiles(valueSamples);
      const iqr = q3 - q1;
      const lowerFence = q1 - 1.5 * iqr;
      const upperFence = q3 + 1.5 * iqr;
      const shareTwoPlus = valueSamples.filter((value) => value >= 2).length / (valueSamples.length || 1);
      const shareThreePlus = valueSamples.filter((value) => value >= 3).length / (valueSamples.length || 1);
      const outlierCount = valueSamples.filter((value) => value < lowerFence || value > upperFence).length;

      distributionByPosition[config.key] = SYOP_DATA.map((row) => ({
        bucket: row.SYOP,
        percentage: row[config.percentKey] || 0
      }));

      summaryByPosition[config.key] = {
        total: totalPlayers,
        median,
        q1,
        q3,
        iqr,
        shareTwoPlus,
        shareThreePlus,
        min: valueSamples[0] || 0,
        max: valueSamples[valueSamples.length - 1] || 0,
        outliers: outlierCount
      };
    });

    return { distributionByPosition, summaryByPosition };
  }

  function allocateBucketCounts(percentKey, totalPlayers) {
    const rows = SYOP_DATA.map((row) => ({
      bucket: row.SYOP,
      raw: (row[percentKey] || 0) * totalPlayers / 100
    }));

    const rounded = rows.map((entry) => Math.round(entry.raw));
    let diff = totalPlayers - rounded.reduce((sum, value) => sum + value, 0);

    if (diff !== 0) {
      const adjustments = rows
        .map((entry, index) => ({ index, fraction: entry.raw - Math.round(entry.raw) }))
        .sort((a, b) => (diff > 0 ? b.fraction - a.fraction : a.fraction - b.fraction));

      for (let i = 0; i < Math.abs(diff); i += 1) {
        const target = adjustments[i % adjustments.length]?.index ?? 0;
        rounded[target] += diff > 0 ? 1 : -1;
      }
    }

    return rows.map((row, index) => ({
      bucket: row.bucket,
      count: Math.max(0, rounded[index])
    }));
  }

  function bucketToNumeric(bucket) {
    if (typeof bucket !== 'string') return Number(bucket) || 0;
    if (bucket.includes('+')) {
      const base = parseFloat(bucket.replace('+', ''));
      return Number.isNaN(base) ? 0 : base + 0.5;
    }
    const value = parseFloat(bucket);
    return Number.isNaN(value) ? 0 : value;
  }

  function formatSyopValue(value) {
    if (value == null || Number.isNaN(value)) return '—';
    if (value >= 12.25) return '12+';
    const rounded = Math.round(value * 10) / 10;
    if (Math.abs(rounded - Math.round(rounded)) < 1e-6) {
      return String(Math.round(rounded));
    }
    return rounded.toFixed(1);
  }

  function computeQuantiles(values) {
    if (!values.length) {
      return { median: 0, q1: 0, q3: 0 };
    }
    const sorted = values.slice().sort((a, b) => a - b);
    const median = quantile(sorted, 0.5);
    const q1 = quantile(sorted, 0.25);
    const q3 = quantile(sorted, 0.75);
    return { median, q1, q3 };
  }

  function quantile(values, p) {
    if (values.length === 0) return 0;
    const pos = (values.length - 1) * p;
    const lower = Math.floor(pos);
    const upper = Math.ceil(pos);
    if (lower === upper) {
      return values[lower];
    }
    const weight = pos - lower;
    return values[lower] * (1 - weight) + values[upper] * weight;
  }

  function createEl(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([key, value]) => {
        if (key === 'class') {
          el.className = value;
        } else if (key === 'dataset') {
          Object.entries(value).forEach(([dKey, dValue]) => {
            el.dataset[dKey] = dValue;
          });
        } else if (key === 'style' && typeof value === 'object') {
          Object.entries(value).forEach(([styleKey, styleValue]) => {
            if (styleKey.startsWith('--')) {
              el.style.setProperty(styleKey, styleValue);
            } else {
              el.style[styleKey] = styleValue;
            }
          });
        } else if (key in el) {
          try {
            el[key] = value;
          } catch (_) {
            el.setAttribute(key, value);
          }
        } else {
          el.setAttribute(key, value);
        }
      });
    }
    children.forEach((child) => {
      if (child == null) return;
      if (Array.isArray(child)) {
        child.forEach((nested) => nested != null && el.appendChild(typeof nested === 'string' ? document.createTextNode(nested) : nested));
      } else {
        el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
      }
    });
    return el;
  }

  function createSVG(tag, attrs, ...children) {
    const el = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.entries(attrs).forEach(([key, value]) => {
        el.setAttribute(key, value);
      });
    }
    children.forEach((child) => {
      if (child == null) return;
      el.appendChild(child);
    });
    return el;
  }

  const sunburstNodeById = new Map(SUNBURST_NODES.map((node) => [node.id, node]));

  function childrenOf(id) {
    return SUNBURST_NODES.filter((node) => node.parent === id);
  }

  function polar(cx, cy, r, a) {
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }

  function arcPath(cx, cy, rInner, rOuter, a0, a1) {
    const p0 = polar(cx, cy, rOuter, a0);
    const p1 = polar(cx, cy, rOuter, a1);
    const p2 = polar(cx, cy, rInner, a1);
    const p3 = polar(cx, cy, rInner, a0);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return `M ${p0.x} ${p0.y} A ${rOuter} ${rOuter} 0 ${large} 1 ${p1.x} ${p1.y} L ${p2.x} ${p2.y} A ${rInner} ${rInner} 0 ${large} 0 ${p3.x} ${p3.y} Z`;
  }

  function labelAt(cx, cy, r, a) {
    return polar(cx, cy, r, a);
  }

  function seriesColor(series) {
    switch (series) {
      case 'QB':
        return colors.qb;
      case 'RB':
        return colors.rb;
      case 'WR':
        return colors.wr;
      case 'TE':
        return colors.te;
      default:
        return '#6b7280';
    }
  }

  function hexToRgba(hex, alpha) {
    const normalized = hex.replace('#', '');
    const value = parseInt(normalized, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function stripYearSuffix(text) {
    if (typeof text !== 'string') return text;
    return text.replace(/\s*yrs?\.?/gi, '').trim();
  }

  const labelAccent = '#9096C0';

  function renderSunburst() {
    const container = document.getElementById('syop-sunburst');
    if (!container) return;

    const root = sunburstNodeById.get('root');
    const ring1Nodes = childrenOf(root?.id || 'root');
    const ring1Total = ring1Nodes.reduce((sum, node) => sum + node.value, 0) || 1;
    const baseSize = 480;
    const containerWidth = container.clientWidth || baseSize;
    const constrained = Math.max(320, containerWidth);
    const size = Math.min(baseSize, constrained);
    const rawScale = size / baseSize;
    const scale = Math.pow(rawScale, 0.85);
    const pad = 64 * scale;
    const cx = size / 2;
    const cy = size / 2;
    const inner1 = 104 * scale;
    const outer1 = 178 * scale;
    const inner2 = 184 * scale;
    const outer2 = 284 * scale;
    const ring1Opacity = 0.9;
    const ring2Opacity = 0.5;
    const centerRadius = 94 * scale;
    const textStroke = 'rgba(11, 14, 22, 0.68)';
    const fontSize = (value, floor = 12) => Math.max(value * scale, floor);
    const startAngle = -Math.PI / 2;

    const svg = createSVG('svg', {
      viewBox: `${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`,
      width: String(size),
      height: String(size),
      class: 'syop-sunburst-svg',
      role: 'img',
      'aria-labelledby': 'syop-infographic-heading'
    });

    let cursor = startAngle;
    const ring1Segments = ring1Nodes.map((node) => {
      const span = (node.value / ring1Total) * Math.PI * 2;
      const segment = { node, a0: cursor, a1: cursor + span };
      cursor += span;
      return segment;
    });

    const ring2Segments = [];
    ring1Segments.forEach((segment) => {
      const children = childrenOf(segment.node.id);
      const total = children.reduce((sum, child) => sum + child.value, 0) || 1;
      let childCursor = segment.a0;
      children.forEach((child) => {
        const span = (child.value / total) * (segment.a1 - segment.a0);
        ring2Segments.push({ parent: segment, node: child, a0: childCursor, a1: childCursor + span });
        childCursor += span;
      });
    });

    ring1Segments.forEach((segment) => {
      const color = seriesColor(segment.node.series);
      const path = createSVG('path', {
        d: arcPath(cx, cy, inner1, outer1, segment.a0, segment.a1),
        fill: hexToRgba(color, ring1Opacity),
        stroke: colors.bg,
        'stroke-width': (1.2 * scale).toFixed(3)
      });
      svg.appendChild(path);

      const mid = (segment.a0 + segment.a1) / 2;
      const pos = labelAt(cx, cy, (inner1 + outer1) / 2, mid);
      const text = createSVG('text', {
        x: pos.x,
        y: pos.y - 6 * scale,
        fill: colors.text,
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        'font-size': fontSize(22, 16),
        'font-weight': '800',
        'paint-order': 'stroke',
        stroke: textStroke,
        'stroke-width': Math.max(0.45, 0.6 * scale).toFixed(3),
        'font-family': '"Quicksand", "Product Sans", sans-serif'
      });
      text.appendChild(document.createTextNode(segment.node.label));
      const subtitleText = stripYearSuffix(segment.node.subtitle);
      if (subtitleText && !segment.node.series) {
        const subtitle = createSVG('tspan', {
          x: pos.x,
          dy: `${18 * scale}`,
          'font-size': fontSize(15, 13),
          'font-weight': '700',
          fill: colors.text,
          'font-family': '"Quicksand", "Product Sans", sans-serif'
        }, document.createTextNode(subtitleText));
        text.appendChild(subtitle);
      }
      svg.appendChild(text);
    });

    ring2Segments.forEach((segment) => {
      const parentColor = seriesColor(segment.parent.node.series);
      const path = createSVG('path', {
        d: arcPath(cx, cy, inner2, outer2, segment.a0, segment.a1),
        fill: hexToRgba(parentColor, ring2Opacity),
        stroke: colors.bg,
        'stroke-width': (1.1 * scale).toFixed(3)
      });
      svg.appendChild(path);

      const mid = (segment.a0 + segment.a1) / 2;
      const radius = (inner2 + outer2) / 2;
      const center = labelAt(cx, cy, radius, mid);
      const label = createSVG('text', {
        x: center.x,
        y: center.y - 2 * scale,
        fill: labelAccent,
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        'font-size': fontSize(22, 15),
        'font-weight': '800',
        'paint-order': 'stroke',
        stroke: textStroke,
        'stroke-width': Math.max(0.4, 0.6 * scale).toFixed(3),
        'font-family': '"Quicksand", "Product Sans", sans-serif'
      });
      label.appendChild(document.createTextNode(segment.node.abbr || segment.node.label));
      const statRaw = segment.node.stat || (segment.node.subtitle ? segment.node.subtitle.replace(/[^0-9.]+/g, '') : '');
      const stat = stripYearSuffix(statRaw);
      if (stat) {
        label.appendChild(createSVG('tspan', {
          x: center.x,
          dy: `${26 * scale}`,
          'font-size': fontSize(20, 16),
          'font-weight': '800',
          fill: colors.text,
          'paint-order': 'stroke',
          stroke: textStroke,
          'stroke-width': Math.max(0.42, 0.65 * scale).toFixed(3),
          'font-family': '"Quicksand", "Product Sans", sans-serif'
        }, document.createTextNode(stat)));
      }
      svg.appendChild(label);
    });

    const centerCircle = createSVG('circle', {
      cx,
      cy,
      r: centerRadius,
      fill: '#111628',
      stroke: colors.bg,
      'stroke-width': (1.2 * scale).toFixed(3)
    });
    svg.appendChild(centerCircle);

    const titleTop = createSVG('text', {
      x: cx,
      y: cy - 28 * scale,
      fill: colors.text,
      'font-size': fontSize(23, 17),
      'font-weight': '800',
      'text-anchor': 'middle',
      'paint-order': 'stroke',
      stroke: textStroke,
      'stroke-width': Math.max(0.45, 0.64 * scale).toFixed(3),
      'font-family': '"Quicksand", "Product Sans", sans-serif'
    }, document.createTextNode('Mean | Λ'));
    svg.appendChild(titleTop);

    const titleBottom = createSVG('text', {
      x: cx,
      y: cy + 2 * scale,
      fill: colors.text,
      'font-size': fontSize(23, 17),
      'font-weight': '800',
      'text-anchor': 'middle',
      'paint-order': 'stroke',
      stroke: textStroke,
      'stroke-width': Math.max(0.45, 0.64 * scale).toFixed(3),
      'font-family': '"Quicksand", "Product Sans", sans-serif'
    }, document.createTextNode('Mode | M'));
    svg.appendChild(titleBottom);

    if (root?.subtitle) {
      svg.appendChild(createSVG('text', {
        x: cx,
        y: cy + 26 * scale,
        fill: colors.subtext,
        'font-size': fontSize(14, 12),
        'font-weight': '600',
        'text-anchor': 'middle',
        'font-family': '"Quicksand", "Product Sans", sans-serif'
      }, document.createTextNode(root.subtitle)));
    }

    container.innerHTML = '';
    container.appendChild(svg);
  }

  function renderBarChart() {
    const container = document.getElementById('syop-bar-chart');
    if (!container) return;
    container.innerHTML = '';

    const controls = createEl('div', { class: 'syop-bar-controls' });
    controls.appendChild(createEl('span', { class: 'syop-filter-label' }, 'Positions'));

    if (!syopChartState.activePosition && POSITION_CONFIG.length) {
      syopChartState.activePosition = POSITION_CONFIG[0].key;
    }

    const legend = createEl('div', { class: 'syop-position-legend', role: 'group', 'aria-label': 'SYOP position filter' });
    POSITION_CONFIG.forEach((config) => {
      const isActive = syopChartState.activePosition === config.key;
      const chip = createEl('button', {
        type: 'button',
        class: `syop-legend-chip${isActive ? ' active' : ''}`,
        style: { '--chip-accent': config.color },
        'aria-pressed': String(isActive)
      },
      createEl('span', { class: 'chip-label' }, config.key));

      chip.addEventListener('click', () => {
        if (syopChartState.activePosition === config.key) return;
        syopChartState.activePosition = config.key;
        renderBarChart();
      });
      legend.appendChild(chip);
    });
    controls.appendChild(legend);

    const viewToggle = createEl('button', {
      type: 'button',
      class: 'syop-view-toggle',
      'aria-pressed': String(syopChartState.showTable),
      'aria-controls': 'syop-distribution-view'
    }, syopChartState.showTable ? 'View chart' : 'View as table');
    viewToggle.addEventListener('click', () => {
      syopChartState.showTable = !syopChartState.showTable;
      renderBarChart();
    });
    controls.appendChild(viewToggle);

    container.appendChild(controls);

    const viewWrapper = createEl('div', { class: 'syop-bar-wrapper', id: 'syop-distribution-view' });
    container.appendChild(viewWrapper);

    const tooltip = createEl('div', { class: 'syop-bar-tooltip', role: 'tooltip', id: 'syop-bar-tooltip' });
    container.appendChild(tooltip);

    if (syopChartState.showTable) {
      renderSyopTable(viewWrapper);
      tooltip.classList.add('hidden');
      return;
    }

    tooltip.classList.remove('hidden');
    const activeConfig = POSITION_CONFIG.find((config) => config.key === syopChartState.activePosition)
      || POSITION_CONFIG[0];

    if (!activeConfig) {
      viewWrapper.appendChild(createEl('p', { class: 'syop-violin-empty' }, 'No positions available.'));
      return;
    }

    const metrics = SYOP_POSITION_SUMMARY[activeConfig.key];
    const distribution = SYOP_DISTRIBUTION[activeConfig.key] || [];
    const panel = createEl('section', { class: 'syop-violin-panel' });

    const header = createEl('header', { class: 'syop-violin-header' },
      createEl('div', { class: 'syop-violin-title-block' },
        createEl('h4', { class: 'syop-violin-title' }, activeConfig.label),
        createEl('div', { class: 'syop-violin-meta' },
          createEl('span', null, `${metrics?.total ?? 0} players`),
          createEl('span', null, `Median ${formatSyopValue(metrics?.median)} yrs`)
        )
      )
    );

    panel.appendChild(header);

    const plot = createEl('div', { class: 'syop-bar-plot' });
    panel.appendChild(plot);
    viewWrapper.appendChild(panel);

    drawSyopBarChart(plot, activeConfig, distribution, tooltip, container);
  }

  function drawSyopBarChart(plotContainer, config, distribution, tooltip, rootContainer) {
    const containerWidth = plotContainer.clientWidth || plotContainer.parentElement?.clientWidth || 320;
    const isCompact = window.innerWidth < 720 || containerWidth < 360;
    const width = Math.max(280, containerWidth);
    const height = isCompact ? 240 : 300;
    const margin = isCompact
      ? { top: 20, right: 16, bottom: 64, left: 44 }
      : { top: 26, right: 20, bottom: 74, left: 48 };

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const values = distribution.map((entry) => entry.percentage || 0);
    const maxValue = Math.max(...values, 0);
    const yMax = maxValue === 0 ? 5 : Math.ceil(maxValue / 5) * 5;
    const tickStep = yMax > 40 ? 10 : yMax > 20 ? 5 : yMax > 10 ? 2 : 1;

    const scaleY = (value) => {
      if (yMax === 0) return margin.top + chartHeight;
      const clamped = Math.max(0, value);
      return margin.top + chartHeight - (clamped / yMax) * chartHeight;
    };

    plotContainer.innerHTML = '';
    const svg = createSVG('svg', {
      viewBox: `0 0 ${width} ${height}`,
      class: 'syop-bar-svg'
    });

    const gradientStops = BAR_GRADIENTS[config.key] || BAR_GRADIENTS.DEFAULT;
    const gradientId = `syop-bar-gradient-${config.key.toLowerCase()}`;
    const defs = createSVG('defs');
    const gradient = createSVG('linearGradient', {
      id: gradientId,
      gradientUnits: 'userSpaceOnUse',
      x1: margin.left,
      y1: margin.top + chartHeight,
      x2: margin.left,
      y2: margin.top
    });

    gradientStops.forEach((stop) => {
      if (!stop) return;
      const attrs = {
        offset: stop.offset ?? '0%',
        'stop-color': stop.color || '#7C83FF'
      };
      if (typeof stop.opacity === 'number') {
        attrs['stop-opacity'] = String(stop.opacity);
      }
      gradient.appendChild(createSVG('stop', attrs));
    });

    defs.appendChild(gradient);
    svg.appendChild(defs);

    svg.appendChild(createSVG('rect', {
      x: margin.left,
      y: margin.top,
      width: chartWidth,
      height: chartHeight,
      class: 'syop-bar-area'
    }));

    const axisGroup = createSVG('g');

    for (let tick = 0; tick <= yMax; tick += tickStep) {
      const y = scaleY(tick);
      axisGroup.appendChild(createSVG('line', {
        x1: margin.left,
        x2: margin.left + chartWidth,
        y1: y,
        y2: y,
        class: 'syop-bar-grid'
      }));
      axisGroup.appendChild(createSVG('text', {
        x: margin.left - 8,
        y: y + 4,
        class: 'syop-bar-tick-label'
      }, document.createTextNode(`${tick}%`)));
    }

    axisGroup.appendChild(createSVG('line', {
      x1: margin.left,
      x2: margin.left,
      y1: margin.top,
      y2: margin.top + chartHeight,
      class: 'syop-bar-axis'
    }));

    axisGroup.appendChild(createSVG('line', {
      x1: margin.left,
      x2: margin.left + chartWidth,
      y1: margin.top + chartHeight,
      y2: margin.top + chartHeight,
      class: 'syop-bar-axis'
    }));

    const axisTitleY = createSVG('text', {
      x: margin.left - 35,
      y: margin.top + chartHeight / 2,
      class: 'syop-bar-axis-title syop-bar-axis-title-y',
      transform: `rotate(-90 ${margin.left - 35} ${margin.top + chartHeight / 2})`
    }, document.createTextNode('% of position'));

    axisGroup.appendChild(axisTitleY);

    const axisTitleX = createSVG('text', {
      x: margin.left + chartWidth / 2,
      y: margin.top + chartHeight + 30,
      class: 'syop-bar-axis-title syop-bar-axis-title-x'
    }, document.createTextNode('SYOP'));

    axisGroup.appendChild(axisTitleX);

    svg.appendChild(axisGroup);

    const bandWidth = chartWidth / Math.max(distribution.length, 1);
    const barWidth = Math.max(10, bandWidth * 0.64);

    const gradientStroke = (gradientStops[gradientStops.length - 1] || {}).color || config.color;

    distribution.forEach((entry, index) => {
      const value = entry.percentage || 0;
      const barHeight = Math.max(0, margin.top + chartHeight - scaleY(value));
      const x = margin.left + index * bandWidth + (bandWidth - barWidth) / 2;
      const y = scaleY(value);
      const rect = createSVG('rect', {
        x,
        y,
        width: barWidth,
        height: barHeight,
        rx: 6,
        class: 'syop-bar-rect',
        style: `--bar-stroke: ${gradientStroke}; fill: url(#${gradientId});`,
        tabindex: '0',
        role: 'button',
        'aria-label': `${config.key} ${Math.round(value * 10) / 10}%`
      });
      attachBarInteractions(rect, config, value, tooltip, rootContainer, gradientStroke);
      svg.appendChild(rect);

      const labelX = margin.left + index * bandWidth + bandWidth / 2;
      svg.appendChild(createSVG('text', {
        x: labelX,
        y: margin.top + chartHeight + 18,
        class: 'syop-bar-x-label'
      }, document.createTextNode(entry.bucket)));
    });

    plotContainer.appendChild(svg);
  }

  function attachBarInteractions(element, config, percentage, tooltip, rootContainer, accentColor) {
    if (!tooltip) return;
    const color = accentColor || config.color;
    const formattedPercent = `${Math.round(percentage * 10) / 10}%`;

    const hideTooltip = () => {
      element.classList.remove('active');
      tooltip.classList.remove('visible');
    };

    const showTooltip = () => {
      element.classList.add('active');
      tooltip.innerHTML = '';
      tooltip.style.setProperty('--tooltip-accent', color);
      tooltip.appendChild(createEl('div', { class: 'tooltip-name' }, config.key));
      tooltip.appendChild(createEl('div', { class: 'tooltip-meta' }, formattedPercent));

      const rootRect = rootContainer.getBoundingClientRect();
      const barRect = element.getBoundingClientRect();
      const containerWidth = rootRect.width;
      let left = barRect.left - rootRect.left + barRect.width / 2;
      left = Math.max(20, Math.min(containerWidth - 20, left));
      const top = barRect.top - rootRect.top - 8;
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
      tooltip.classList.add('visible');
    };

    element.addEventListener('mouseenter', showTooltip);
    element.addEventListener('focus', showTooltip);
    element.addEventListener('mouseleave', hideTooltip);
    element.addEventListener('blur', hideTooltip);
    element.addEventListener('click', (event) => {
      event.preventDefault();
      showTooltip();
    });
  }
  function renderSyopTable(wrapper) {
    wrapper.innerHTML = '';
    const tableWrapper = createEl('div', { class: 'syop-table-wrapper' });
    const table = createEl('table', { class: 'syop-table' });
    table.appendChild(createEl('caption', null, 'SYOP distribution summary by position'));

    const thead = createEl('thead', null,
      createEl('tr', null,
        createEl('th', null, 'Position'),
        createEl('th', null, 'Players'),
        createEl('th', null, 'Median SYOP'),
        createEl('th', null, 'IQR (25%–75%)'),
        createEl('th', null, '≥2 SYOP'),
        createEl('th', null, '≥3 SYOP'),
        createEl('th', null, 'Max'),
        createEl('th', null, 'Outliers')
      )
    );
    table.appendChild(thead);

    const tbody = createEl('tbody');
    POSITION_CONFIG.forEach((config) => {
      const metrics = SYOP_POSITION_SUMMARY[config.key];
      tbody.appendChild(createEl('tr', null,
        createEl('th', { scope: 'row' }, `${config.key} · ${config.label}`),
        createEl('td', null, metrics ? String(metrics.total) : '0'),
        createEl('td', null, metrics ? formatSyopValue(metrics.median) : '—'),
        createEl('td', null, metrics ? `${formatSyopValue(metrics.q1)} – ${formatSyopValue(metrics.q3)}` : '—'),
        createEl('td', null, metrics ? `${Math.round((metrics.shareTwoPlus || 0) * 100)}%` : '—'),
        createEl('td', null, metrics ? `${Math.round((metrics.shareThreePlus || 0) * 100)}%` : '—'),
        createEl('td', null, metrics ? formatSyopValue(metrics.max) : '—'),
        createEl('td', null, metrics ? String(metrics.outliers || 0) : '0')
      ));
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    wrapper.appendChild(tableWrapper);
  }

  function renderGauges() {
    const container = document.getElementById('syop-gauges');
    if (!container) return;
    container.innerHTML = '';

    GAUGES.forEach((gauge) => {
      const gaugeWrapper = createEl('div', { class: 'syop-gauge-card' });
      const svg = renderGaugeSVG(gauge);
      const label = createEl('div', { class: 'syop-gauge-label' },
        createEl('span', { class: 'gauge-value', style: { color: gauge.color } }, gauge.key),
        createEl('span', { class: 'gauge-title', style: { color: colors.subtext } }, 'AVG SYOP (YRS)')
      );
      gaugeWrapper.appendChild(svg);
      gaugeWrapper.appendChild(label);
      container.appendChild(gaugeWrapper);
    });
  }

  function renderGaugeSVG(gauge) {
    const min = 2;
    const max = 8;
    const width = 240;
    const height = 160;
    const cx = width / 2;
    const cy = height - 18;
    const radius = 112;
    const trackWidth = 18;

    const start = -Math.PI;
    const end = 0;
    const map = (value) => start + ((value - min) / (max - min)) * (end - start);
    const valueAngle = map(Math.max(min, Math.min(max, gauge.value)));

    const svg = createSVG('svg', {
      viewBox: `0 0 ${width} ${height}`,
      class: 'syop-gauge-svg'
    });

    const defs = createSVG('defs');
    const gradient = createSVG('linearGradient', {
      id: `gauge-gradient-${gauge.key}`,
      x1: '0',
      y1: '1',
      x2: '1',
      y2: '0'
    });
    gradient.appendChild(createSVG('stop', { offset: '0%', 'stop-color': hexToRgba(gauge.color, 0.4) }));
    gradient.appendChild(createSVG('stop', { offset: '100%', 'stop-color': gauge.color }));
    defs.appendChild(gradient);
    svg.appendChild(defs);

    const track = createSVG('path', {
      d: describeArc(cx, cy, radius, start, end),
      stroke: 'rgba(31, 36, 55, 0.8)',
      'stroke-width': trackWidth,
      'stroke-linecap': 'round',
      fill: 'none'
    });
    svg.appendChild(track);

    const valuePath = createSVG('path', {
      d: describeArc(cx, cy, radius, start, valueAngle),
      stroke: `url(#gauge-gradient-${gauge.key})`,
      'stroke-width': trackWidth,
      'stroke-linecap': 'round',
      fill: 'none'
    });
    svg.appendChild(valuePath);

    const ticks = [2, 3.5, 5, 6.5, 8];
    ticks.forEach((tick) => {
      const angle = map(tick);
      const inner = polar(cx, cy, radius - trackWidth / 2 - 4, angle);
      const outer = polar(cx, cy, radius + trackWidth / 2 + 4, angle);
      const line = createSVG('line', {
        x1: inner.x,
        y1: inner.y,
        x2: outer.x,
        y2: outer.y,
        stroke: 'rgba(255,255,255,0.7)',
        'stroke-width': '1.5'
      });
      svg.appendChild(line);

      const label = createSVG('text', {
        x: outer.x,
        y: outer.y - 6,
        fill: colors.subtext,
        'font-size': '11',
        'text-anchor': 'middle'
      }, document.createTextNode(tick.toString()));
      svg.appendChild(label);
    });

    const valueText = createSVG('text', {
      x: cx,
      y: cy - 40,
      fill: gauge.color,
      'font-size': '30',
      'font-weight': '800',
      'text-anchor': 'middle',
      'paint-order': 'stroke',
      stroke: 'rgba(11, 14, 22, 0.72)',
      'stroke-width': '0.6'
    }, document.createTextNode(gauge.value.toFixed(2)));
    svg.appendChild(valueText);

    svg.appendChild(createSVG('text', {
      x: cx,
      y: cy - 16,
      fill: colors.subtext,
      'font-size': '16',
      'font-weight': '700',
      'text-anchor': 'middle'
    }, document.createTextNode('YRS')));

    return svg;
  }

  function describeArc(cx, cy, radius, a0, a1) {
    const start = polar(cx, cy, radius, a0);
    const end = polar(cx, cy, radius, a1);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`;
  }

  function renderDraftOverall() {
    const container = document.getElementById('draft-overall-chart');
    if (!container) return;
    container.innerHTML = '';

    const containerWidth = container.clientWidth || 0;
    const fallbackWidth = 360;
    const width = containerWidth > 0 ? containerWidth : fallbackWidth;
    const height = width < 520 ? 270 : 320;
    const margin = width < 520
      ? { top: 26, right: 14, bottom: 48, left: 46 }
      : { top: 32, right: 24, bottom: 56, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const svg = createSVG('svg', {
      viewBox: `0 0 ${width} ${height}`,
      width: String(width),
      height: String(height)
    });

    const defs = createSVG('defs');
    const gradient = createSVG('linearGradient', { id: 'draft-bar-fill', x1: '0', x2: '0', y1: '0', y2: '1' });
    gradient.appendChild(createSVG('stop', { offset: '0%', 'stop-color': colors.accentA }));
    gradient.appendChild(createSVG('stop', { offset: '100%', 'stop-color': colors.accentC }));
    defs.appendChild(gradient);
    svg.appendChild(defs);

    const g = createSVG('g', { transform: `translate(${margin.left},${margin.top})` });
    svg.appendChild(g);

    const groupWidth = chartWidth / DRAFT_OVERALL.length;
    const niceMax = DRAFT_CHART_NICE_MAX || 10;

    const ticks = [];
    for (let value = 0; value <= niceMax + 0.0001; value += 10) {
      ticks.push(value);
    }

    ticks.forEach((tick) => {
      const y = chartHeight - (tick / niceMax) * chartHeight;
      g.appendChild(createSVG('line', {
        x1: 0,
        x2: chartWidth,
        y1: y,
        y2: y,
        stroke: tick === 0 ? 'rgba(255,255,255,0.16)' : colors.grid
      }));
      g.appendChild(createSVG('text', {
        x: -12,
        y: y + 4,
        fill: colors.subtext,
        'font-size': '12',
        'text-anchor': 'end'
      }, document.createTextNode(`${tick}%`)));
    });

    DRAFT_OVERALL.forEach((row, index) => {
      const baseX = index * groupWidth;
      const barWidth = Math.min(54, groupWidth * 0.62);
      const barHeight = (row.hit / niceMax) * chartHeight;
      const y = chartHeight - barHeight;
      const rect = createSVG('rect', {
        x: baseX + (groupWidth - barWidth) / 2,
        y,
        width: barWidth,
        height: Math.max(0, barHeight),
        fill: 'url(#draft-bar-fill)',
        rx: 12,
        ry: 12,
        opacity: '0.95'
      });
      g.appendChild(rect);

      g.appendChild(createSVG('text', {
        x: baseX + groupWidth / 2,
        y: y - 8,
        fill: colors.text,
        'font-size': '12',
        'text-anchor': 'middle',
        'font-weight': '600'
      }, document.createTextNode(`${row.hit.toFixed(1)}%`)));

      g.appendChild(createSVG('text', {
        x: baseX + groupWidth / 2,
        y: chartHeight + 26,
        fill: colors.subtext,
        'font-size': '12',
        'text-anchor': 'middle'
      }, document.createTextNode(`RD ${row.rd}`)));
    });

    g.appendChild(createSVG('line', {
      x1: 0,
      x2: chartWidth,
      y1: chartHeight,
      y2: chartHeight,
      stroke: 'rgba(255,255,255,0.2)'
    }));

    g.appendChild(createSVG('text', {
      x: chartWidth / 2,
      y: chartHeight + 42,
      fill: colors.subtext,
      'font-size': '12',
      'text-anchor': 'middle'
    }, document.createTextNode('Draft Round')));

    container.appendChild(svg);

    const tiles = document.getElementById('draft-round-tiles');
    if (tiles) {
      tiles.innerHTML = '';
      DRAFT_OVERALL.forEach((row) => {
        const tile = createEl('div', { class: 'draft-tile' },
          createEl('span', { class: 'draft-tile-round' }, row.rd),
          createEl('span', { class: 'draft-tile-value' }, `${row.hit.toFixed(1)}%`)
        );
        tiles.appendChild(tile);
      });
    }
  }

  function catmullRomPath(points) {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    const segments = [`M ${points[0].x} ${points[0].y}`];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      segments.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
    }
    return segments.join(' ');
  }

  function renderDraftPositional() {
    const container = document.getElementById('draft-positional-chart');
    if (!container) return;
    container.innerHTML = '';

    const legend = createEl('div', { class: 'syop-line-legend' });
    DRAFT_SERIES.forEach((series) => {
      legend.appendChild(createEl('span', { class: 'legend-item' },
        createEl('span', { class: 'legend-swatch', style: { backgroundColor: series.color } }),
        createEl('span', { class: 'legend-label' }, series.key)
      ));
    });

    const legendHost = document.getElementById('draft-positional-legend');
    if (legendHost) {
      legendHost.innerHTML = '';
      legendHost.appendChild(legend);
    } else {
      container.appendChild(legend);
    }

    const containerWidth = container.clientWidth || 0;
    const fallbackWidth = 360;
    const width = containerWidth > 0 ? containerWidth : fallbackWidth;
    const isCompact = width < 520;
    const height = isCompact ? 300 : 320;
    const margin = isCompact
      ? { top: 48, right: 20, bottom: 56, left: 54 }
      : { top: 32, right: 24, bottom: 56, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const svg = createSVG('svg', {
      viewBox: `0 0 ${width} ${height}`,
      width: String(width),
      height: String(height)
    });

    const g = createSVG('g', { transform: `translate(${margin.left},${margin.top})` });
    svg.appendChild(g);

    const rounds = DRAFT_POSITIONAL.map((row) => row.rd);
    const stepX = chartWidth / (rounds.length - 1 || 1);
    const niceMax = DRAFT_CHART_NICE_MAX || 10;
    const yTicks = [];
    for (let value = 0; value <= niceMax + 0.0001; value += 10) {
      yTicks.push(value);
    }

    yTicks.forEach((tick) => {
      const y = chartHeight - (tick / niceMax) * chartHeight;
      g.appendChild(createSVG('line', {
        x1: 0,
        x2: chartWidth,
        y1: y,
        y2: y,
        stroke: tick === 0 ? 'rgba(255,255,255,0.16)' : colors.grid
      }));
      g.appendChild(createSVG('text', {
        x: -12,
        y: y + 4,
        fill: colors.subtext,
        'font-size': '12',
        'text-anchor': 'end'
      }, document.createTextNode(`${tick}%`)));
    });

    rounds.forEach((round, index) => {
      const x = index * stepX;
      g.appendChild(createSVG('text', {
        x,
        y: chartHeight + 26,
        fill: colors.subtext,
        'font-size': '12',
        'text-anchor': 'middle'
      }, document.createTextNode(`RD ${round}`)));
    });

    const dotRadius = isCompact ? 3.6 : 4.4;

    DRAFT_SERIES.forEach((series) => {
      const points = DRAFT_POSITIONAL.map((row, index) => ({
        x: index * stepX,
        y: chartHeight - ((Number(row[series.key]) || 0) / niceMax) * chartHeight,
        value: row[series.key],
        roundIndex: index
      }));

      const path = createSVG('path', {
        d: catmullRomPath(points),
        fill: 'none',
        stroke: series.color,
        'stroke-width': '3',
        'stroke-linecap': 'round'
      });
      g.appendChild(path);

      points.forEach((point) => {
        g.appendChild(createSVG('circle', {
          cx: point.x,
          cy: point.y,
          r: String(dotRadius),
          fill: colors.bg,
          stroke: series.color,
          'stroke-width': '2'
        }));
      });
    });

    g.appendChild(createSVG('line', {
      x1: 0,
      x2: chartWidth,
      y1: chartHeight,
      y2: chartHeight,
      stroke: 'rgba(255,255,255,0.18)'
    }));

    g.appendChild(createSVG('text', {
      x: chartWidth / 2,
      y: chartHeight + 42,
      fill: colors.subtext,
      'font-size': '12',
      'text-anchor': 'middle'
    }, document.createTextNode('Draft Round')));

    container.appendChild(svg);

    const chipsContainer = createEl('div', {
      class: 'draft-round-chip-container',
      style: {
        padding: `0 ${margin.right}px 0 ${margin.left}px`
      }
    });
    const chipGrid = createEl('div', {
      class: 'draft-round-chip-grid',
      style: { '--round-count': rounds.length }
    });

    rounds.forEach((round, index) => {
      const column = createEl('div', {
        class: 'draft-round-chip-col',
        dataset: { round }
      });
      const roundData = DRAFT_POSITIONAL[index] || {};
      const sortedSeries = DRAFT_SERIES
        .map((series) => ({
          key: series.key,
          color: series.color,
          value: Number(roundData[series.key]) || 0
        }))
        .sort((a, b) => b.value - a.value);

      sortedSeries.forEach((entry) => {
        const chip = createEl('div', {
          class: 'draft-round-chip',
          style: {
            '--chip-accent': entry.color,
            borderColor: hexToRgba(entry.color, 0.55)
          }
        },
        createEl('span', {
          class: 'draft-round-chip-dot',
          style: { backgroundColor: entry.color }
        }),
        createEl('span', {
          class: 'draft-round-chip-value'
        }, `${entry.value}%`));

        column.appendChild(chip);
      });

      chipGrid.appendChild(column);
    });

    chipsContainer.appendChild(chipGrid);
    container.appendChild(chipsContainer);
  }

  function handleResize() {
    if (document.body.dataset.page !== PAGE_ID) return;
    if (resizeTimer) {
      window.clearTimeout(resizeTimer);
    }
    resizeTimer = window.setTimeout(() => {
      renderSunburst();
      renderBarChart();
      renderGauges();
      renderDraftOverall();
      renderDraftPositional();
    }, 180);
  }

  function setupTabs() {
    const tabs = Array.from(document.querySelectorAll('.syop-tab'));
    if (tabs.length === 0) return;

    const panels = new Map();
    tabs.forEach((tab) => {
      const target = tab.dataset.target;
      if (target) {
        const panel = document.getElementById(target);
        if (panel) {
          panels.set(target, panel);
        }
      }
    });

    const activate = (tab, { focusTab } = { focusTab: false }) => {
      tabs.forEach((btn) => {
        const isActive = btn === tab;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
        btn.setAttribute('tabindex', isActive ? '0' : '-1');
        const target = btn.dataset.target;
        const panel = target ? panels.get(target) : null;
        if (panel) {
          if (isActive) {
            panel.classList.add('active');
            panel.removeAttribute('hidden');
          } else {
            panel.classList.remove('active');
            panel.setAttribute('hidden', '');
          }
        }
      });
      if (focusTab) {
        tab.focus();
      }

      window.requestAnimationFrame(() => {
        if (tab.dataset.target === 'draft-tab-panel') {
          renderDraftOverall();
          renderDraftPositional();
        } else {
          renderSunburst();
          renderBarChart();
          renderGauges();
        }
      });
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(tab, { focusTab: false }));
      tab.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          const delta = event.key === 'ArrowRight' ? 1 : -1;
          const nextIndex = (index + delta + tabs.length) % tabs.length;
          activate(tabs[nextIndex], { focusTab: true });
        }
      });
    });

    const currentActive = tabs.find((tab) => tab.classList.contains('active')) || tabs[0];
    if (currentActive) {
      activate(currentActive, { focusTab: false });
    }
  }

  function applyUsernameFromQuery() {
    const input = document.getElementById('usernameInput');
    if (!input) return;
    const params = new URLSearchParams(window.location.search);
    const uname = params.get('username');
    if (uname) {
      input.value = uname;
    }
  }

  function init() {
    if (document.body.dataset.page !== PAGE_ID) return;
    applyUsernameFromQuery();
    setupTabs();
    renderSunburst();
    renderBarChart();
    renderGauges();
    renderDraftOverall();
    renderDraftPositional();
    window.addEventListener('resize', handleResize);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
