import { useState, useMemo } from 'react';
import FloatablePanel from './FloatablePanel';

const MONTHS_ORDER = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function GlowBarChart({ data, xKey, yKey, labelKey, onBarClick, selectedBar, color = '#00ff41', height = 150 }) {
  const [hovered, setHovered] = useState(null);
  const maxVal = Math.max(...data.map(d => d[yKey]), 1);
  const W = 640;
  const H = height;
  const count = data.length;
  const slotW = W / count;
  const barW = Math.max(3, slotW - (count > 15 ? 2 : 4));

  return (
    <svg viewBox={`0 0 ${W} ${H + 36}`} width="100%" style={{ fontFamily: 'Courier New, monospace', display: 'block' }}>
      <defs>
        <filter id="glow-bar" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-gold" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map(p => (
        <line key={p} x1={0} y1={H - H * p} x2={W} y2={H - H * p}
          stroke="#00ff4118" strokeWidth="1" strokeDasharray="4 4" />
      ))}
      {/* Baseline */}
      <line x1={0} y1={H} x2={W} y2={H} stroke="#00ff4144" strokeWidth="1" />

      {data.map((d, i) => {
        const val = d[yKey] || 0;
        const barH = Math.max(val > 0 ? 3 : 0, (val / maxVal) * H);
        const x = i * slotW + (slotW - barW) / 2;
        const y = H - barH;
        const isSelected = selectedBar === d[xKey];
        const isHovered = hovered === i;
        const barColor = isSelected ? '#FFD700' : (isHovered ? '#00ffff' : (val > 0 ? color : '#1a2a1a'));
        const filterId = isSelected ? 'glow-gold' : 'glow-bar';

        return (
          <g key={i}
            onClick={() => onBarClick && val > 0 && onBarClick(d)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: val > 0 && onBarClick ? 'pointer' : 'default' }}
          >
            {/* Hover background */}
            {isHovered && val > 0 && (
              <rect x={x - 2} y={0} width={barW + 4} height={H} fill="#00ff410a" />
            )}
            {/* Bar */}
            <rect x={x} y={y} width={barW} height={barH}
              fill={barColor}
              filter={val > 0 ? `url(#${filterId})` : undefined}
              opacity={val > 0 ? 1 : 0.15}
            />
            {/* Value label on top */}
            {val > 0 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle"
                fill={isSelected ? '#FFD700' : (isHovered ? '#00ffff' : color)}
                fontSize={count > 20 ? 6 : 8} fontWeight="700"
              >
                {val >= 10000 ? `${(val / 1000).toFixed(0)}k`
                  : val >= 1000 ? `${(val / 1000).toFixed(1)}k`
                  : val}
              </text>
            )}
            {/* X label */}
            <text x={x + barW / 2} y={H + 14} textAnchor="middle"
              fill={isSelected ? '#FFD700' : (isHovered ? '#00ffff' : '#00ff4177')}
              fontSize={count > 20 ? 6 : 9}
              transform={count > 12 ? `rotate(-35, ${x + barW / 2}, ${H + 14})` : undefined}
            >
              {d[labelKey]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function CyberpunkDashboard({ graphData, defaultPosition, onClose }) {
  const [selectedMonth, setSelectedMonth] = useState(null);

  const { monthlyData, allMonths, grandTotal, unbudgetedCount } = useMemo(() => {
    const totals = {};
    const links = graphData.links.map(l => ({
      src: typeof l.source === 'object' ? l.source.id : l.source,
      tgt: typeof l.target === 'object' ? l.target.id : l.target,
    }));

    let unbudgetedCount = 0;

    graphData.nodes.forEach(node => {
      if (node.nodeType === 'timeline') return;

      const timelineParents = [];
      links.forEach(({ src, tgt }) => {
        const otherId = src === node.id ? tgt : tgt === node.id ? src : null;
        if (!otherId) return;
        const other = graphData.nodes.find(n => n.id === otherId);
        if (other?.nodeType === 'timeline') timelineParents.push(otherId);
      });

      if (timelineParents.length === 0) return;
      if (!node.amount) { unbudgetedCount++; return; }

      timelineParents.forEach(pid => {
        if (!totals[pid]) totals[pid] = { total: 0, tasks: [] };
        totals[pid].total += Number(node.amount) || 0;
        totals[pid].tasks.push({
          id: node.id,
          amount: Number(node.amount),
          date: node.date || null,
          color: node.color || '#00ff41',
        });
      });
    });

    const allMonths = Object.keys(totals).sort((a, b) => {
      const parse = s => {
        const parts = s.split(' ');
        const yr = parseInt(parts[parts.length - 1]) || 0;
        const mo = MONTHS_ORDER.indexOf(parts[0]);
        return yr * 100 + (mo === -1 ? 0 : mo);
      };
      return parse(a) - parse(b);
    });

    const grandTotal = Object.values(totals).reduce((s, m) => s + m.total, 0);
    return { monthlyData: totals, allMonths, grandTotal, unbudgetedCount };
  }, [graphData]);

  const { dayData, unscheduled } = useMemo(() => {
    if (!selectedMonth || !monthlyData[selectedMonth]) return { dayData: [], unscheduled: [] };
    const byDay = {};
    const unscheduled = [];

    monthlyData[selectedMonth].tasks.forEach(t => {
      if (t.date) {
        const day = parseInt(t.date.split('-')[2]);
        if (!byDay[day]) byDay[day] = 0;
        byDay[day] += t.amount;
      } else {
        unscheduled.push(t);
      }
    });

    const dayData = Array.from({ length: 31 }, (_, i) => ({
      day: i + 1,
      label: String(i + 1),
      total: byDay[i + 1] || 0,
    }));

    return { dayData, unscheduled };
  }, [selectedMonth, monthlyData]);

  const monthChartData = allMonths.map(m => ({
    month: m,
    label: m.split(' ').slice(0, 2).join(' '),
    total: monthlyData[m]?.total || 0,
  }));

  const cyberText = { fontFamily: 'Courier New, monospace', color: '#00ff41' };
  const dimLabel = { fontSize: 10, opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.1em' };

  return (
    <FloatablePanel
      id="dashboard-panel"
      title="$ EXPENSE DASHBOARD"
      defaultPosition={defaultPosition}
      defaultSize={{ width: 720, height: 'auto' }}
      minWidth={520}
      onClose={onClose}
    >
      <div style={cyberText}>

        {/* ── Top Stats ── */}
        <div style={{ display: 'flex', gap: 28, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #00ff4133', flexWrap: 'wrap' }}>
          <div>
            <div style={dimLabel}>Total Expenses</div>
            <div style={{ fontSize: 26, fontWeight: 700, textShadow: '0 0 12px #00ff41' }}>
              ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </div>
          </div>
          <div>
            <div style={dimLabel}>Months Tracked</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{allMonths.length}</div>
          </div>
          <div>
            <div style={dimLabel}>Avg / Month</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#00ffff' }}>
              ${allMonths.length ? Math.round(grandTotal / allMonths.length).toLocaleString() : 0}
            </div>
          </div>
          <div>
            <div style={dimLabel}>Unbudgeted Tasks</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: unbudgetedCount > 0 ? '#ff00cc' : '#00ff41' }}>
              {unbudgetedCount}
            </div>
          </div>
          {selectedMonth && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
              <button onClick={() => setSelectedMonth(null)} style={{
                background: 'rgba(0,255,65,0.08)', border: '1px solid #00ff4155',
                color: '#00ff41', padding: '5px 12px', fontSize: 11, cursor: 'pointer',
                fontFamily: 'Courier New, monospace', textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>← All Months</button>
            </div>
          )}
        </div>

        {/* ── Charts ── */}
        {!selectedMonth ? (
          <>
            <div style={{ ...dimLabel, marginBottom: 8 }}>
              Monthly Overview {allMonths.length > 0 ? '— click a bar to see daily breakdown' : ''}
            </div>
            {allMonths.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', opacity: 0.35, fontSize: 13, lineHeight: 1.8 }}>
                No expenses tracked yet.<br />
                Click a node → set an Amount → connect it to a month node.
              </div>
            ) : (
              <GlowBarChart
                data={monthChartData}
                xKey="month" yKey="total" labelKey="label"
                onBarClick={d => setSelectedMonth(d.month)}
                selectedBar={selectedMonth}
              />
            )}
          </>
        ) : (
          <>
            <div style={{ ...dimLabel, marginBottom: 8 }}>
              {selectedMonth} — daily breakdown — total&nbsp;
              <span style={{ color: '#FFD700', textShadow: '0 0 8px #FFD700' }}>
                ${monthlyData[selectedMonth]?.total.toLocaleString()}
              </span>
            </div>
            <GlowBarChart
              data={dayData}
              xKey="day" yKey="total" labelKey="label"
              color="#00ffff"
              height={130}
            />

            {/* Task list */}
            <div style={{ marginTop: 14, borderTop: '1px solid #00ff4122', paddingTop: 10 }}>
              <div style={{ ...dimLabel, marginBottom: 6 }}>Tasks this month</div>
              {monthlyData[selectedMonth]?.tasks
                .sort((a, b) => b.amount - a.amount)
                .map((t, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 12, padding: '4px 0', borderBottom: '1px solid #00ff410f',
                  }}>
                    <span style={{ color: t.color }}>{t.id}</span>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {t.date && <span style={{ opacity: 0.45, fontSize: 10 }}>{t.date}</span>}
                      <span style={{ color: '#FFD700', fontWeight: 700 }}>${t.amount.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              {unscheduled.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 10, opacity: 0.4, color: '#ff00cc' }}>
                  ⚠ {unscheduled.length} task(s) have no date — included in total but not in daily chart
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </FloatablePanel>
  );
}
