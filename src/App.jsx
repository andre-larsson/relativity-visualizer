import { useId, useState } from 'react'
import './App.css'
import {
  basisVectors,
  classifyInterval,
  formatNumber,
  getBoost,
  getTimeAxisBoost,
  interval,
  lowerIndex,
  transformContravariant,
  transformCovariant,
  vectorScale,
} from './relativity'

const GRID_VALUES = [-3, -2, -1, 0, 1, 2, 3]

function SliderField({ label, value, min, max, step, onChange, hint }) {
  const id = useId()

  return (
    <label className="slider-field" htmlFor={id}>
      <span className="slider-topline">
        <span>{label}</span>
        <strong>{formatNumber(value, 2)}</strong>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="slider-hint">{hint}</span>
    </label>
  )
}

function MetricPill({ label, value, accent }) {
  return (
    <div className={`metric-pill metric-${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function TimeAxisBoostBox({ boostTarget, isAligned, onApply }) {
  const buttonLabel = boostTarget.available
    ? isAligned
      ? 'Event already on t′ axis'
      : 'Apply β = x / t'
    : 'Requires timelike event'

  return (
    <div className="boost-helper">
      <p className="section-kicker">Targeted boost</p>
      <strong>Choose the frame where the event has no spatial component.</strong>
      <p>{boostTarget.explanation}</p>
      {boostTarget.available ? (
        <>
          <code>βalign = x / t = {formatNumber(boostTarget.beta)}</code>
          <p className="boost-helper-status">
            Target P&apos; = (
            {formatNumber(boostTarget.transformed.t)}, {formatNumber(boostTarget.transformed.x)})
          </p>
        </>
      ) : (
        <code>x&apos; = 0 requires a timelike event with |x/t| &lt; 1</code>
      )}
      <button
        className="boost-button"
        type="button"
        onClick={() => onApply(boostTarget.beta)}
        disabled={!boostTarget.available || isAligned}
      >
        {buttonLabel}
      </button>
    </div>
  )
}

function MatrixBlock({ title, rows, note }) {
  return (
    <div className="matrix-block">
      <p className="matrix-title">{title}</p>
      <div className="matrix-shell" aria-hidden="true">
        <div className="matrix-bracket matrix-left" />
        <div className="matrix-grid">
          {rows.map((row, rowIndex) =>
            row.map((value, valueIndex) => (
              <span key={`${title}-${rowIndex}-${valueIndex}`}>{formatNumber(value)}</span>
            )),
          )}
        </div>
        <div className="matrix-bracket matrix-right" />
      </div>
      <p className="matrix-note">{note}</p>
    </div>
  )
}

function MinkowskiDiagram({ beta, point, pointPrime, timeLeg, spaceLeg }) {
  const size = 560
  const center = size / 2
  const extent = 4.5
  const scale = size / (extent * 2)
  const gamma = 1 / Math.sqrt(1 - beta * beta)

  const toScreen = ({ t, x }) => ({
    x: center + x * scale,
    y: center - t * scale,
  })

  const toLine = (start, end) => {
    const a = toScreen(start)
    const b = toScreen(end)

    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
  }

  const originalVerticals = GRID_VALUES.map((value) =>
    toLine({ t: -extent, x: value }, { t: extent, x: value }),
  )
  const originalHorizontals = GRID_VALUES.map((value) =>
    toLine({ t: value, x: -extent }, { t: value, x: extent }),
  )

  const primedXLines = GRID_VALUES.map((value) => {
    const offset = value / gamma
    return toLine(
      { t: -extent, x: beta * -extent + offset },
      { t: extent, x: beta * extent + offset },
    )
  })

  const primedTLines = GRID_VALUES.map((value) => {
    const offset = value / gamma
    return toLine(
      { t: beta * -extent + offset, x: -extent },
      { t: beta * extent + offset, x: extent },
    )
  })

  const axes = {
    t: toLine({ t: -extent, x: 0 }, { t: extent, x: 0 }),
    x: toLine({ t: 0, x: -extent }, { t: 0, x: extent }),
    tPrime: toLine(
      { t: -extent, x: -beta * extent },
      { t: extent, x: beta * extent },
    ),
    xPrime: toLine(
      { t: -beta * extent, x: -extent },
      { t: beta * extent, x: extent },
    ),
    lightA: toLine({ t: -extent, x: -extent }, { t: extent, x: extent }),
    lightB: toLine({ t: -extent, x: extent }, { t: extent, x: -extent }),
  }

  const origin = toScreen({ t: 0, x: 0 })
  const eventPoint = toScreen(point)
  const timePoint = toScreen(timeLeg)
  const spacePoint = toScreen(spaceLeg)

  return (
    <svg className="diagram-svg" viewBox={`0 0 ${size} ${size}`} role="img">
      <title>Minkowski diagram with boosted and unboosted coordinates</title>
      <defs>
        <marker
          id="vector-arrow"
          markerWidth="10"
          markerHeight="10"
          refX="7"
          refY="5"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" className="marker-fill marker-event" />
        </marker>
        <marker
          id="time-arrow"
          markerWidth="10"
          markerHeight="10"
          refX="7"
          refY="5"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" className="marker-fill marker-time" />
        </marker>
        <marker
          id="space-arrow"
          markerWidth="10"
          markerHeight="10"
          refX="7"
          refY="5"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" className="marker-fill marker-space" />
        </marker>
      </defs>

      <g className="grid-layer grid-original">
        {originalVerticals.map((line, index) => (
          <line key={`ov-${index}`} {...line} />
        ))}
        {originalHorizontals.map((line, index) => (
          <line key={`oh-${index}`} {...line} />
        ))}
      </g>

      <g className="grid-layer grid-boosted">
        {primedXLines.map((line, index) => (
          <line key={`px-${index}`} {...line} />
        ))}
        {primedTLines.map((line, index) => (
          <line key={`pt-${index}`} {...line} />
        ))}
      </g>

      <g className="light-cone">
        <line {...axes.lightA} />
        <line {...axes.lightB} />
      </g>

      <g className="axis-layer axis-original">
        <line {...axes.t} />
        <line {...axes.x} />
      </g>

      <g className="axis-layer axis-boosted">
        <line {...axes.tPrime} />
        <line {...axes.xPrime} />
      </g>

      <g className="basis-parallelogram">
        <line
          x1={origin.x}
          y1={origin.y}
          x2={timePoint.x}
          y2={timePoint.y}
          markerEnd="url(#time-arrow)"
        />
        <line
          x1={timePoint.x}
          y1={timePoint.y}
          x2={eventPoint.x}
          y2={eventPoint.y}
          markerEnd="url(#space-arrow)"
        />
        <line x1={origin.x} y1={origin.y} x2={spacePoint.x} y2={spacePoint.y} />
        <line x1={spacePoint.x} y1={spacePoint.y} x2={eventPoint.x} y2={eventPoint.y} />
      </g>

      <line
        className="event-vector"
        x1={origin.x}
        y1={origin.y}
        x2={eventPoint.x}
        y2={eventPoint.y}
        markerEnd="url(#vector-arrow)"
      />

      <circle className="origin-dot" cx={origin.x} cy={origin.y} r="5" />
      <circle className="event-dot" cx={eventPoint.x} cy={eventPoint.y} r="8" />

      <text className="axis-label axis-label-t" x={axes.t.x1 + 14} y={axes.t.y1 + 22}>
        t
      </text>
      <text className="axis-label axis-label-x" x={axes.x.x2 - 18} y={axes.x.y2 - 10}>
        x
      </text>
      <text
        className="axis-label axis-label-t-prime"
        x={axes.tPrime.x2 - 28}
        y={axes.tPrime.y2 - 12}
      >
        t&apos;
      </text>
      <text
        className="axis-label axis-label-x-prime"
        x={axes.xPrime.x2 - 22}
        y={axes.xPrime.y2 - 18}
      >
        x&apos;
      </text>
      <text className="event-label" x={eventPoint.x + 12} y={eventPoint.y - 12}>
        P = ({formatNumber(point.t, 2)}, {formatNumber(point.x, 2)})
      </text>
      <text className="event-label event-label-small" x={timePoint.x + 12} y={timePoint.y + 20}>
        t&apos;e&apos;
        <tspan baselineShift="sub">0</tspan>
      </text>
      <text
        className="event-label event-label-small"
        x={spacePoint.x + 12}
        y={spacePoint.y - 12}
      >
        x&apos;e&apos;
        <tspan baselineShift="sub">1</tspan>
      </text>
      <text className="event-label event-label-small" x={eventPoint.x + 12} y={eventPoint.y + 16}>
        P&apos; = ({formatNumber(pointPrime.t, 2)}, {formatNumber(pointPrime.x, 2)})
      </text>
    </svg>
  )
}

function EuclideanComparison({ rapidity }) {
  const size = 260
  const center = size / 2
  const scale = 74
  const theta = rapidity
  const point = {
    x: Math.cos(theta),
    y: Math.sin(theta),
  }

  const arcRadius = 44
  const arcEnd = {
    x: center + Math.cos(theta) * arcRadius,
    y: center - Math.sin(theta) * arcRadius,
  }

  return (
    <svg className="comparison-svg" viewBox={`0 0 ${size} ${size}`} role="img">
      <title>Euclidean rotation on a unit circle</title>
      <circle className="comparison-circle" cx={center} cy={center} r={scale} />
      <line className="comparison-axis" x1="24" y1={center} x2={size - 24} y2={center} />
      <line className="comparison-axis" x1={center} y1={size - 24} x2={center} y2="24" />
      <path
        className="comparison-arc"
        d={`M ${center + arcRadius} ${center} A ${arcRadius} ${arcRadius} 0 0 0 ${arcEnd.x} ${arcEnd.y}`}
      />
      <line
        className="comparison-vector"
        x1={center}
        y1={center}
        x2={center + point.x * scale}
        y2={center - point.y * scale}
      />
      <circle
        className="comparison-point"
        cx={center + point.x * scale}
        cy={center - point.y * scale}
        r="7"
      />
      <text className="comparison-label" x={center + 62} y={center - 8}>
        cos θ
      </text>
      <text className="comparison-label" x={center + 12} y={center - 62}>
        sin θ
      </text>
      <text className="comparison-label" x={center + 30} y={center - 24}>
        θ
      </text>
    </svg>
  )
}

function HyperbolicComparison({ rapidity }) {
  const size = 260
  const center = size / 2
  const extent = 3.4
  const scale = size / (extent * 2)
  const point = {
    t: Math.cosh(rapidity),
    x: Math.sinh(rapidity),
  }

  const toScreen = ({ t, x }) => ({
    x: center + x * scale,
    y: center - t * scale,
  })

  const samples = []

  for (let x = -1.55; x <= 1.55; x += 0.04) {
    samples.push(toScreen({ t: Math.sqrt(1 + x * x), x }))
  }

  const path = samples
    .map((sample, index) => `${index === 0 ? 'M' : 'L'} ${sample.x} ${sample.y}`)
    .join(' ')

  const p = toScreen(point)

  return (
    <svg className="comparison-svg" viewBox={`0 0 ${size} ${size}`} role="img">
      <title>Hyperbolic angle on the unit Minkowski hyperbola</title>
      <path className="comparison-hyperbola" d={path} />
      <line className="comparison-axis" x1="24" y1={center} x2={size - 24} y2={center} />
      <line className="comparison-axis" x1={center} y1={size - 24} x2={center} y2="18" />
      <line className="comparison-vector" x1={center} y1={center} x2={p.x} y2={p.y} />
      <circle className="comparison-point hyperbolic-point" cx={p.x} cy={p.y} r="7" />
      <text className="comparison-label" x={center + 58} y={center - 8}>
        sinh φ
      </text>
      <text className="comparison-label" x={center + 10} y={center - 62}>
        cosh φ
      </text>
      <text className="comparison-label" x={center + 22} y={center - 22}>
        φ
      </text>
    </svg>
  )
}

function App() {
  const [beta, setBeta] = useState(0.52)
  const [eventT, setEventT] = useState(2.4)
  const [eventX, setEventX] = useState(1.1)

  const boost = getBoost(beta)
  const point = { t: eventT, x: eventX }
  const pointPrime = transformContravariant(point, beta)
  const timeAxisBoost = getTimeAxisBoost(point)
  const lowered = lowerIndex(point)
  const loweredPrime = transformCovariant(lowered, beta)
  const basis = basisVectors(beta)
  const timeLeg = vectorScale(basis.time, pointPrime.t)
  const spaceLeg = vectorScale(basis.space, pointPrime.x)
  const sSquared = interval(point)
  const relation = classifyInterval(sSquared)
  const isOnTimeAxis = timeAxisBoost.available && Math.abs(pointPrime.x) < 1e-6

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Special Relativity Visualizer</p>
          <h1>Coordinate changes in Minkowski space, without hiding the basis.</h1>
          <p className="hero-text">
            Slide a Lorentz boost and watch the same event pick up new components, new
            basis vectors, and the same invariant interval. Units use c = 1, so time and
            distance share the same axis scale.
          </p>
        </div>
        <div className="metric-row">
          <MetricPill label="β = v/c" value={formatNumber(boost.beta)} accent="teal" />
          <MetricPill label="γ" value={formatNumber(boost.gamma)} accent="gold" />
          <MetricPill label="φ = artanh β" value={formatNumber(boost.rapidity)} accent="rust" />
          <MetricPill label="s² = t² - x²" value={formatNumber(sSquared)} accent="navy" />
        </div>
      </section>

      <section className="workspace-grid">
        <article className="card card-diagram">
          <div className="card-heading">
            <div>
              <p className="section-kicker">Coordinate system change</p>
              <h2>Passive Lorentz boost in 1+1 dimensions</h2>
            </div>
            <p>
              Original grid lines stay pale. The boosted grid and primed axes show how the
              coordinates change while the event stays put.
            </p>
          </div>
          <MinkowskiDiagram
            beta={boost.beta}
            point={point}
            pointPrime={pointPrime}
            timeLeg={timeLeg}
            spaceLeg={spaceLeg}
          />
          <div className="diagram-notes">
            <p>
              <strong>Contravariant components:</strong> the event transforms as x&apos;
              <sup>μ</sup> = Λ<sup>μ</sup>
              <sub>ν</sub> x<sup>ν</sup>.
            </p>
            <p>
              <strong>Basis vectors:</strong> the primed basis transforms with Λ
              <sup>-1</sup> so that x = x<sup>μ</sup>e<sub>μ</sub> = x&apos;<sup>μ</sup>
              e&apos;<sub>μ</sub>.
            </p>
          </div>
        </article>

        <aside className="card card-controls">
          <div className="card-heading compact-heading">
            <div>
              <p className="section-kicker">Controls</p>
              <h2>Boost and event</h2>
            </div>
            <p>Keep the event fixed in spacetime and change only the observer frame.</p>
          </div>
          <div className="controls-stack">
            <SliderField
              label="Boost velocity β"
              value={beta}
              min={-0.98}
              max={0.98}
              step={0.01}
              onChange={setBeta}
              hint="Negative β tilts the primed axes the other way. Timelike events can be sent to t′ with β = x/t."
            />
            <SliderField
              label="Event time t"
              value={eventT}
              min={-3.5}
              max={3.5}
              step={0.1}
              onChange={setEventT}
              hint="Measured in units where c = 1."
            />
            <SliderField
              label="Event position x"
              value={eventX}
              min={-3.5}
              max={3.5}
              step={0.1}
              onChange={setEventX}
              hint="Change the separation while the metric stays diag(1, -1)."
            />
          </div>

          <TimeAxisBoostBox
            boostTarget={timeAxisBoost}
            isAligned={isOnTimeAxis}
            onApply={setBeta}
          />

          <div className="invariant-box">
            <p className="section-kicker">Invariant classification</p>
            <strong>{relation.label}</strong>
            <p>{relation.explanation}</p>
          </div>

          <div className="equation-box">
            <p className="section-kicker">Same geometric vector</p>
            <code>x = t e₀ + x e₁ = t&apos; e&apos;₀ + x&apos; e&apos;₁</code>
          </div>
        </aside>

        <article className="card card-algebra">
          <div className="card-heading compact-heading">
            <div>
              <p className="section-kicker">Covariance and contravariance</p>
              <h2>Components, covectors, and basis change</h2>
            </div>
            <p>
              Raising and lowering with η = diag(1, -1) flips the spatial sign and exposes
              which objects transform with Λ and which transform with Λ⁻¹.
            </p>
          </div>

          <div className="algebra-grid">
            <MatrixBlock
              title="Contravariant transformation Λ"
              rows={boost.matrix}
              note={
                <>
                  x&apos;<sup>μ</sup> = Λ<sup>μ</sup>
                  <sub>ν</sub> x<sup>ν</sup>
                </>
              }
            />
            <MatrixBlock
              title="Inverse / covariant transformation Λ⁻¹"
              rows={boost.inverse}
              note={
                <>
                  x&apos;<sub>μ</sub> = (Λ<sup>-1</sup>)<sup>ν</sup>
                  <sub>μ</sub> x<sub>ν</sub> and e&apos;<sub>μ</sub> = (Λ
                  <sup>-1</sup>)<sup>ν</sup>
                  <sub>μ</sub> e<sub>ν</sub>
                </>
              }
            />
          </div>

          <div className="component-table">
            <div>
              <span>Original x^μ</span>
              <strong>
                ({formatNumber(point.t)}, {formatNumber(point.x)})
              </strong>
            </div>
            <div>
              <span>Boosted x&apos;^μ</span>
              <strong>
                ({formatNumber(pointPrime.t)}, {formatNumber(pointPrime.x)})
              </strong>
            </div>
            <div>
              <span>Lowered x_μ</span>
              <strong>
                ({formatNumber(lowered.t)}, {formatNumber(lowered.x)})
              </strong>
            </div>
            <div>
              <span>Boosted x&apos;_μ</span>
              <strong>
                ({formatNumber(loweredPrime.t)}, {formatNumber(loweredPrime.x)})
              </strong>
            </div>
            <div>
              <span>Boosted basis e&apos;₀</span>
              <strong>
                ({formatNumber(basis.time.t)}, {formatNumber(basis.time.x)})
              </strong>
            </div>
            <div>
              <span>Boosted basis e&apos;₁</span>
              <strong>
                ({formatNumber(basis.space.t)}, {formatNumber(basis.space.x)})
              </strong>
            </div>
          </div>
        </article>

        <article className="card card-comparison">
          <div className="card-heading compact-heading">
            <div>
              <p className="section-kicker">Hyperbolic trigonometry</p>
              <h2>Ordinary rotation versus Lorentz boost</h2>
            </div>
            <p>
              Use the same numeric parameter on both plots to compare a Euclidean angle θ
              with the rapidity φ. The circle preserves x² + y². The boost preserves t² - x².
            </p>
          </div>

          <div className="comparison-grid">
            <div className="comparison-card">
              <h3>Euclidean plane</h3>
              <EuclideanComparison rapidity={boost.rapidity} />
              <code>R(θ) = [[cos θ, -sin θ], [sin θ, cos θ]]</code>
              <p>cos² θ + sin² θ = 1</p>
            </div>

            <div className="comparison-card">
              <h3>Minkowski plane</h3>
              <HyperbolicComparison rapidity={boost.rapidity} />
              <code>Λ(φ) = [[cosh φ, -sinh φ], [-sinh φ, cosh φ]]</code>
              <p>cosh² φ - sinh² φ = 1, with β = tanh φ</p>
            </div>
          </div>

          <div className="formula-strip">
            <p>
              γ = cosh φ = {formatNumber(Math.cosh(boost.rapidity))} and γβ = sinh φ =
              {' '}
              {formatNumber(Math.sinh(boost.rapidity))}
            </p>
          </div>
        </article>
      </section>

      <section className="summary-grid">
        <article className="summary-card">
          <p className="section-kicker">Contravariance</p>
          <h3>Upper-index components track the coordinate labels.</h3>
          <p>
            xμ changes with the boost matrix because the same vector is being described in a
            new coordinate system.
          </p>
        </article>

        <article className="summary-card">
          <p className="section-kicker">Covariance</p>
          <h3>Lower-index objects and basis vectors follow the inverse map.</h3>
          <p>
            Covectors and basis vectors tilt opposite to contravariant components so the
            reconstructed vector stays geometric rather than coordinate-dependent.
          </p>
        </article>

        <article className="summary-card">
          <p className="section-kicker">Invariance</p>
          <h3>The interval is the quantity every inertial frame agrees on.</h3>
          <p>
            xμxμ = s² remains unchanged, and the light cone marks the boundary where the
            interval becomes null.
          </p>
        </article>
      </section>
    </main>
  )
}

export default App
