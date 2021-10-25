import * as PIXI from "pixi.js";
import { Pane } from "tweakpane";
import * as CamerakitPlugin from "@tweakpane/plugin-camerakit";
import * as EssentialsPlugin from "@tweakpane/plugin-essentials";

// Input parameters
const INPUTS = {
  color: 0xffffff,
  count: 10000,
  mainFreq: 24,
  size: { min: 130, max: 180 },
  speed: 2 * 1e-4,
  subFreq: 300,
  subLen: 0.2
};
// Output parameters
const OUTPUTS = {
  json: ""
};
// Canvas size
const SIZE = 600;

function map(v, s1, e1, s2, e2) {
  return s2 + ((v - s1) / (e1 - s1)) * (e2 - s2);
}

function saveCanvas(canvasElem) {
  const anchor = document.createElement("a");
  anchor.download = "capture.png";
  anchor.href = canvasElem.toDataURL();
  anchor.click();
}

// Custom shader
class EffectFilter extends PIXI.Filter {
  constructor() {
    super(
      null,
      `
precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform vec4 filterArea;
uniform vec2 screenSize;
uniform float abberation;

vec2 applyOffset(float ofs) {
  return ((vTextureCoord.xy * filterArea.xy - screenSize / 2.0) * (1.0 + ofs) + screenSize / 2.0) / filterArea.xy;
}

void main(void) {
  float pr = texture2D(uSampler, applyOffset(0.0)).r;
  float pg = texture2D(uSampler, applyOffset(-abberation)).g;
  float pb = texture2D(uSampler, applyOffset(abberation * -2.0)).b;

	gl_FragColor = vec4(pr, pg, pb, 1.0);
}
			`,
      {
        abberation: {
          type: "float",
          value: 0
        },
        screenSize: {
          type: "vec2",
          value: [0, 0]
        }
      }
    );

    this.padding = 0;
  }

  get abberation() {
    return this.uniforms.abberation;
  }

  set abberation(value) {
    this.uniforms.abberation = value;
  }

  get screenSize() {
    return this.uniforms.screenSize;
  }

  set screenSize(value) {
    this.uniforms.screenSize = value;
  }
}

// PIXI.js application
const app = new PIXI.Application({
  height: SIZE,
  preserveDrawingBuffer: true,
  width: SIZE
});
app.stage.filterArea = new PIXI.Rectangle(0, 0, SIZE, SIZE);
document.body.appendChild(app.renderer.view);

const filter = new EffectFilter();
filter.abberation = 0.015;
filter.screenSize = [SIZE, SIZE];
app.stage.filters = [filter];

const bg = new PIXI.Graphics();
bg.beginFill(0x111111).drawRect(0, 0, SIZE, SIZE).endFill();
app.stage.addChild(bg);

const g = new PIXI.Graphics();
g.x = SIZE / 2;
g.y = SIZE / 2;
app.stage.addChild(g);

// Create a pane
const pane = new Pane({
  title: "Tweakpane playground - Alga"
});
// Register plugins
pane.registerPlugin(CamerakitPlugin);
pane.registerPlugin(EssentialsPlugin);

pane.addInput(INPUTS, "speed", {
  min: 0,
  max: 1e-3
});
pane.addInput(INPUTS, "count", {
  min: 1,
  max: 20000,
  step: 1
});

// Coloration
((folder) => {
  folder.addInput(INPUTS, "color", {
    view: "color"
  });
  folder.addInput(filter, "abberation", {
    view: "cameraring",
    series: 1,
    wide: true,
    unit: {
      pixels: 60,
      ticks: 10,
      value: 0.01
    },
    min: -0.04,
    max: 0.04
  });
})(
  pane.addFolder({
    title: "coloration"
  })
);

// Form
((folder) => {
  folder.addInput(INPUTS, "mainFreq", {
    min: 2,
    max: 100,
    step: 2
  });
  folder.addInput(INPUTS, "subFreq", {
    min: 0,
    max: 500,
    step: 1
  });
  folder.addInput(INPUTS, "subLen", {
    min: 0,
    max: 2
  });
  folder.addInput(INPUTS, "size", {
    min: 0,
    max: 450
  });
})(
  pane.addFolder({
    title: "form"
  })
);

// Misc
let fpsGraph;
((folder) => {
  fpsGraph = folder.addBlade({
    label: "fps",
    lineCount: 2,
    view: "fpsgraph"
  });
  folder.addMonitor(OUTPUTS, "json", {
    multiline: true
  });
  folder
    .addButton({
      title: "Capture"
    })
    .on("click", () => {
      saveCanvas(app.view);
    });
})(
  pane.addFolder({
    title: "misc"
  })
);

// Update output JSON on change
function updatePreset() {
  OUTPUTS.json = JSON.stringify(pane.exportPreset(), null, 2);
}
pane.on("change", () => {
  updatePreset();
});
updatePreset();

// Sketch
let frameCount = 0;
app.ticker.add(() => {
  fpsGraph.begin();
  g.clear();

  const t = frameCount * INPUTS.speed;

  for (let i = 0; i < INPUTS.count; i++) {
    const p = map(i, 0, INPUTS.count, 0, 1);
    const angle = map(p, 0, 1, 0, 2 * Math.PI);

    const mainAngle = Math.sin(map(t + p, 0, 1, 0, INPUTS.mainFreq * Math.PI));
    const len = map(mainAngle, -1, +1, INPUTS.size.min, INPUTS.size.max);

    let dx = Math.cos(angle) * len;
    let dy = Math.sin(angle) * len;

    dx += Math.cos(angle * INPUTS.subFreq) * len * INPUTS.subLen;
    dy += Math.sin(angle * INPUTS.subFreq) * len * INPUTS.subLen;

    g.beginFill(INPUTS.color);
    g.drawRect(dx, dy, 1, 1);
    g.endFill();
  }

  ++frameCount;
  fpsGraph.end();
});
