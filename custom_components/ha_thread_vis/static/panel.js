class HaThreadVisPanel extends HTMLElement {
  constructor() {
    super();
    this._initialized = false;
    this._animationFrame = null;
    this._nodes = [];
    this._edges = [];
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._initialize();
    }
  }

  connectedCallback() {
    if (this._initialized) {
      this._resize();
    }
  }

  disconnectedCallback() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
  }

  _initialize() {
    this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: block;
        padding: 16px;
        box-sizing: border-box;
        height: 100%;
        color: var(--primary-text-color);
      }
      .panel {
        display: flex;
        flex-direction: column;
        gap: 12px;
        height: 100%;
      }
      .toolbar {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      button {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
        border: none;
        border-radius: 4px;
        padding: 8px 12px;
        font-size: 14px;
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.6;
        cursor: default;
      }
      canvas {
        flex: 1;
        width: 100%;
        height: 100%;
        border-radius: 12px;
        background: var(--card-background-color);
        box-shadow: var(--ha-card-box-shadow, none);
      }
      .status {
        font-size: 12px;
        color: var(--secondary-text-color);
      }
    `;

    const container = document.createElement("div");
    container.className = "panel";

    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";

    this._refreshButton = document.createElement("button");
    this._refreshButton.textContent = "Reload";
    this._refreshButton.addEventListener("click", () => this._loadNetwork());

    this._status = document.createElement("div");
    this._status.className = "status";
    this._status.textContent = "Loading network...";

    toolbar.append(this._refreshButton, this._status);

    this._canvas = document.createElement("canvas");
    this._context = this._canvas.getContext("2d");

    container.append(toolbar, this._canvas);
    this.shadowRoot.append(style, container);

    window.addEventListener("resize", () => this._resize());

    this._initialized = true;
    this._resize();
    this._loadNetwork();
  }

  async _loadNetwork() {
    if (!this._hass) {
      return;
    }
    this._refreshButton.disabled = true;
    this._status.textContent = "Refreshing network...";
    try {
      const data = await this._hass.callWS({ type: "ha_thread_vis/get_network" });
      this._setNetwork(data);
      this._status.textContent = `Loaded ${this._nodes.length} nodes`; 
    } catch (err) {
      this._status.textContent = "Unable to load network";
      // eslint-disable-next-line no-console
      console.error("Failed to load Thread network", err);
    } finally {
      this._refreshButton.disabled = false;
    }
  }

  _setNetwork(data) {
    const width = this._canvas.width;
    const height = this._canvas.height;
    this._nodes = (data.nodes || []).map((node) => ({
      ...node,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
    }));
    this._edges = data.edges || [];
    this._startSimulation();
  }

  _startSimulation() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
    }
    const step = () => {
      this._tick();
      this._draw();
      this._animationFrame = requestAnimationFrame(step);
    };
    step();
  }

  _tick() {
    const width = this._canvas.width;
    const height = this._canvas.height;
    const repulsion = 1200;
    const springLength = 120;
    const springStrength = 0.02;
    const damping = 0.85;

    for (const node of this._nodes) {
      node.vx *= damping;
      node.vy *= damping;
    }

    for (let i = 0; i < this._nodes.length; i += 1) {
      for (let j = i + 1; j < this._nodes.length; j += 1) {
        const nodeA = this._nodes[i];
        const nodeB = this._nodes[j];
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distance = Math.hypot(dx, dy) || 1;
        const force = repulsion / (distance * distance);
        const fx = (force * dx) / distance;
        const fy = (force * dy) / distance;
        nodeA.vx -= fx;
        nodeA.vy -= fy;
        nodeB.vx += fx;
        nodeB.vy += fy;
      }
    }

    for (const edge of this._edges) {
      const source = this._nodes.find((node) => node.id === edge.source);
      const target = this._nodes.find((node) => node.id === edge.target);
      if (!source || !target) {
        continue;
      }
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.hypot(dx, dy) || 1;
      const force = springStrength * (distance - springLength);
      const fx = (force * dx) / distance;
      const fy = (force * dy) / distance;
      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    }

    for (const node of this._nodes) {
      node.x = Math.max(40, Math.min(width - 40, node.x + node.vx));
      node.y = Math.max(40, Math.min(height - 40, node.y + node.vy));
    }
  }

  _draw() {
    const ctx = this._context;
    const width = this._canvas.width;
    const height = this._canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(100, 100, 100, 0.35)";
    for (const edge of this._edges) {
      const source = this._nodes.find((node) => node.id === edge.source);
      const target = this._nodes.find((node) => node.id === edge.target);
      if (!source || !target) {
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }

    for (const node of this._nodes) {
      const { fill, stroke } = this._colorsForGroup(node.group);
      ctx.beginPath();
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.arc(node.x, node.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "var(--primary-text-color, #1b1b1b)";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.label || node.id, node.x, node.y + 34);
    }
  }

  _colorsForGroup(group) {
    switch (group) {
      case "router":
        return { fill: "#92e2ff", stroke: "#2b7de9" };
      case "leader":
        return { fill: "#ffe29a", stroke: "#f2a007" };
      case "device":
      default:
        return { fill: "#c8f7c5", stroke: "#2e7d32" };
    }
  }

  _resize() {
    if (!this._canvas) {
      return;
    }
    const rect = this.getBoundingClientRect();
    this._canvas.width = rect.width - 32;
    this._canvas.height = rect.height - 88;
  }
}

customElements.define("ha-thread-vis-panel", HaThreadVisPanel);
