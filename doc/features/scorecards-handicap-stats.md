# Feature: Scorecards, Handicap & Stats

## Round Entry

`/rounds/new` loads the course's actual holes (par per hole) from `GET /api/tenants/{id}/holes`, pre-fills scores to par, and computes totals live. On save, the server:

1. Stores the round + hole rows
2. Computes the **handicap differential**:
   $$\text{Differential} = \frac{(\text{Total Strokes} - \text{Course Rating}) \times 113}{\text{Slope Rating}}$$
3. Rounds to 1 decimal and persists it

Defaults if not supplied: CourseRating = 72.0, SlopeRating = 113.

## WHS Handicap Index

Computed on every `GET /api/rounds/stats` call (never stored — always current):

1. Take differentials from the last 20 qualifying rounds (≥9 holes)
2. Use the best N by the official WHS scale:

| Rounds available | Differentials used |
|---|---|
| 3–4 | 1 |
| 5–6 | 2 |
| 7 | 3 |
| 8 | 4 |
| 9 | 5 |
| 10 | 6 |
| 11–12 | 7 |
| 13+ | 8 |

3. Index = ⌊(average of best N) × 0.96 × 10⌋ / 10

## Stats Dashboard (`/stats`)

Pure SVG charts — no chart library dependency.

| Section | Data | Notes |
|---|---|---|
| Hero card | Index, rounds, avg score, avg vs par, best round | Gradient card |
| Score trend | Chronological strokes | Line chart with hover tooltips |
| Hole performance | Avg strokes vs avg par per hole | Stacked bars: green = up-to-par portion, red = over-par |
| By the numbers | Birdies/pars/bogeys/doubles+ per hole | Sortable table data |

## Known Limitations

- **9-hole rounds** are scored against full 18-hole course ratings → inflated differentials. Proper handling needs 9-hole course ratings (future).
- No "adjusted gross score" (ESC/equitable stroke control) yet — raw strokes are used.
- Weather/conditions not factored (WHS PCC adjustment) — acceptable for MVP.
