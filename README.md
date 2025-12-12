# Global Terrorism Ecosystem Visualization

This project visualizes the Global Terrorism Database using D3.js.

## Prerequisites

- A modern web browser.
- Python 3 (installed by default on macOS) or Node.js.

## How to Run Locally

You can run the visualization using a simple HTTP server.

### Using Python 3 (Recommended)

Run the following command in your terminal from the project directory:

```bash
python3 -m http.server 8089
```

Then open your browser and navigate to:
[http://localhost:8089](http://localhost:8089)

### Using Node.js (via npx)

If you prefer Node.js:

```bash
npx serve -l 8089
```

## Structure

- `index.html`: The main visualization interface.
- `js/ecosystem.js`: Core D3.js visualization logic.
- `css/ecosystem.css`: Stylesheet for the visualization.
- `data/dataset.csv`: The underlying data source.
