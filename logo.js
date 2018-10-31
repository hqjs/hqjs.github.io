/**
 * Copyright © 2018 hqjs
 */

import Memory from '/memory-vectors.js';
import GL from '/gl-utils.js';
import {getRnd, random, randomInt} from '/math-utils.js';

class Logo {
  constructor(element, logo, {
    scale = 0.5,
    radius = 0.20,
    softRadius = 0.0005,
    minParticleSize = 3,
    maxParticleSize = 8,
    minParticleAlpha = 0.8,
    maxParticleAlpha = 1,
    minFrame = 10,
    maxFrame = 30,
    minBrownSpeed = 0.03,
    maxBrownSpeed = 0.05,
    minBrownRadius = 0,
    maxBrownRadius = 0.05,
    randomPos = true,
    randomAlpha = true,
    initRadius = 1000,
    freeAmount = 100,
    minFreeSize = 1,
    maxFreeSize = 8,
    minFreeAlpha = 0.1,
    maxFreeAlpha = 0.7,
    minFreeSpeed = 0.001,
    maxFreeSpeed = 0.006,
    minFreeFrame = 180,
    maxFreeFrame = 255
  } = {}) {
    this.element = element;
    this.cfg = {
      scale,
      radius,
      softRadius,
      minParticleSize,
      maxParticleSize,
      minParticleAlpha,
      maxParticleAlpha,
      minFrame,
      maxFrame,
      minBrownSpeed,
      maxBrownSpeed,
      minBrownRadius,
      maxBrownRadius,
      randomPos,
      randomAlpha,
      initRadius,
      freeAmount,
      minFreeSize,
      maxFreeSize,
      minFreeAlpha,
      maxFreeAlpha,
      minFreeSpeed,
      maxFreeSpeed,
      minFreeFrame,
      maxFreeFrame
    };

    this.calcSize();
    this.scrollLeft = 0;
    this.scrollTop = 0;

    this.frameCounter = 0;
    this.length = logo.metadata.vertices;
    this.total = this.length + this.cfg.freeAmount;
    this.memory = new Memory({
      positions: {
        type: Memory.Float32Vec2,
        group: {
          logo: {
            init: (i, vec) => {
              if(this.cfg.randomPos) vec.rand(-this.cfg.initRadius, this.cfg.initRadius);
              else vec.init(logo.vertices, 2 * i);
            },
            size: this.length
          },
          free: {
            init: (i, vec) => {
              vec.rand([-this.freeWidth, -this.freeHeight], [this.freeWidth, this.freeHeight]);
            },
            size: this.cfg.freeAmount
          }
        }
      },
      velocities: {
        type: Memory.Float32Vec2,
        group: {
          logo: {
            init: 0,
            size: this.length
          },
          free: {
            init: 0,
            size: this.cfg.freeAmount
          }
        }
      },
      logo: {
        type: Memory.Float32Vec2,
        init: logo.vertices
      },
      brownians: {
        type: Memory.Float32Vec2,
        group: {
          logo: {
            size: this.length
          },
          free: {
            size: this.cfg.freeAmount
          }
        }
      },
      mouse: {
        type: Memory.Float32Vec2,
        init: -1000
      },
      dir: Memory.Float32Vec2,
      sizes: {
        type: Memory.Float32,
        group: {
          logo: {
            init: (i, vec, ref) => {
              ref[i] = random(this.cfg.minParticleSize, this.cfg.maxParticleSize);
            },
            size: this.length
          },
          free: {
            init: (i, vec, ref) => {
              ref[i] = random(this.cfg.minFreeSize, this.cfg.maxFreeSize);
            },
            size: this.cfg.freeAmount
          }
        }
      },
      alphas: {
        type: Memory.Float32,
        group: {
          logo: {
            init: (i, vec, ref) => {
              if(this.cfg.randomAlpha) ref[i] = random(this.cfg.minParticleAlpha, this.cfg.maxParticleAlpha);
              else ref[i] = logo.colors[4 * i + 3];
            },
            size: this.length
          },
          free: {
            init: (i, vec, ref) => {
              ref[i] = random(this.cfg.minFreeAlpha, this.cfg.maxFreeAlpha);
            },
            size: this.cfg.freeAmount
          }
        }
      },
      frames: {
        type: Memory.Uint8,
        group: {
          logo: {
            init: 1,
            size: this.length
          },
          free: {
            init: 1,
            size: this.cfg.freeAmount
          }
        }
      },
      colors: {
        type: Memory.Uint8Vec3,
        group: {
          logo: {
            init: (i, vec) => {
              vec.init(logo.colors, 4 * i);
            },
            size: this.length
          },
          free: {
            init: (i, vec) => {
              const index = 4 * randomInt(0, logo.metadata.colors);
              vec.init(logo.colorset, index);
            },
            size: this.cfg.freeAmount
          }
        }
      }
    });

    (async () => {
        const particle = '/particle.png';
        const vertexShaderPromise = fetch('/lights.vert').then(res => res.text());
        const fragmentShaderPromise = fetch('/lights.frag').then(res => res.text());

        const [vertexShader, fragmentShader] = await Promise.all([
            vertexShaderPromise,
            fragmentShaderPromise
        ]);

        this.gl = new GL({
        width: this.width,
        height: this.height,
        selector: this.element
        });
        this.gl.enableAlpha();
        this.gl.enableExtension('OES_texture_float');
        this.gl.context.clearColor(0, 0, 0, 0);
        this.gl.createVertexShader('particles', vertexShader);
        this.gl.createFragmentShader('particles', fragmentShader);
        this.gl.createProgram('main', 'particles', 'particles');
        this.ptexture = this.gl.createTexture('positions', {
        width: this.memory.views.positions.length / 4,
        height: 1,
        data: this.memory.views.positions
        }, {itype: this.gl.context.FLOAT});
        this.vtexture = this.gl.createTexture('velocities', {
        width: this.memory.views.positions.length / 4,
        height: 1,
        data: this.memory.views.positions
        }, {itype: this.gl.context.FLOAT});
        this.pbuffer0 = this.gl.createFrameBuffer('positions', this.ptexture);
        this.vbuffer0 = this.gl.createFrameBuffer('velocities', this.vtexture);
        this.gl.releaseFrameBuffer();
        this.mainProgram = this.gl.useProgram('main');
        GL.loadImage(particle)
        .then(image => {
            this.gl.createTexture('particle', image);
            this.gl.activateTexture('particle', 0);
            this.mainProgram.attachUniform({
            data: image,
            name: 'u_Texture',
            slot: 0
            });
        })
        .then(() => {
            this._initData();
            this.animate();
        });

        this.subscribeEvents();
    })();
  }

  calcSize() {
    this.offsetX = this.element.offsetLeft;
    this.offsetY = this.element.offsetTop;
    this.height = this.element.parentNode.clientHeight;
    this.width = this.element.parentNode.clientWidth;
    const maxRes = Math.max(this.width, this.height);
    this.resolution = [
      this.height / maxRes,
      this.width / maxRes
    ];
    this.freeWidth = 1 / this.resolution[0] / this.cfg.scale;
    this.freeHeight = 1 / this.resolution[1] / this.cfg.scale;
  }

  _initData() {
    this.gl.createBuffer('colors', this.memory.views.colors);
    this.mainProgram.attachAttribute({
      name: 'a_Color',
      type: this.gl.context.UNSIGNED_BYTE,
      normalized: true,
      size: 3
    });
    this.gl.createBuffer('sizes', this.memory.views.sizes);
    this.mainProgram.attachAttribute({
      name: 'a_Size',
      size: 1
    });
    this.gl.createBuffer('colors', this.memory.views.alphas);
    this.mainProgram.attachAttribute({
      name: 'a_Alpha',
      size: 1
    });
    this.mainProgram.attachUniform({
      data: this.resolution,
      name: 'u_Res',
      type: '2fv'
    });
    this.updateScale();
    this.positionsBuffer = this.gl.createBuffer('positions', this.memory.views.positions);
    this.mainProgram.attachAttribute({
      name: 'a_Position',
      dtype: this.gl.context.STREAM_DRAW
    });
  }

  updateScale() {
    this.mainProgram.attachUniform({
      data: this.cfg.scale,
      name: 'u_Scale',
      type: '1f'
    });
  }

  render() {
    this.gl.context.drawArrays(this.gl.context.POINTS, 0, this.total);
    this._moveLogo();
    this._moveFree();
    this.positionsBuffer.update(this.memory.views.positions);
    this.frameCounter = (this.frameCounter + 1) % 256;
  }

  animate() {
    const doAnimate = () => {
      this.render();
      window.requestAnimationFrame(doAnimate);
    };
    doAnimate();
  }

  _moveLogo() {
    const dir = this.memory.dir;
    const mouse = this.memory.mouse;
    for(let i = 0; i < this.length; i++) {
      const point = this.memory.positions.logo[i];
      dir.copy(mouse)
        .sub(point);
      const distSq = dir.lenSq();
      const origPoint = this.memory.logo[i];
      if(distSq < Math.pow(this.cfg.radius / this.cfg.scale, 2)) {
        point.sub(dir.scale(this.cfg.softRadius / distSq / this.cfg.scale));
      }

      this._brownianMove(i, point, origPoint);
    }
  }

  _moveFree() {
    const dir = this.memory.dir;
    const mouse = this.memory.mouse;
    for(let i = 0; i < this.cfg.freeAmount; i++) {
      const point = this.memory.positions.free[i];
      dir.copy(mouse)
        .sub(point);
      const distSq = dir.lenSq();
      if(distSq < Math.pow(this.cfg.radius / this.cfg.scale, 2)) {
        point.sub(dir.scale(this.cfg.softRadius / distSq / this.cfg.scale));
      }

      this._freeBrownianMove(i, point);
    }
  }

  _brownianMove(index, point, origPoint) {
    const brownVector = this.memory.brownians.logo[index];
    if(this.frameCounter % this.memory.frames.logo[index] === 0) {
      const alpha = 2 * Math.PI * getRnd();
      brownVector
        .of(Math.sin(alpha), Math.cos(alpha))
        .scale(random(this.cfg.minBrownRadius, this.cfg.maxBrownRadius))
        .add(origPoint)
        .sub(point)
        .scale(random(this.cfg.minBrownSpeed, this.cfg.maxBrownSpeed));
      this.memory.frames.logo[index] = randomInt(this.cfg.minFrame, this.cfg.maxFrame);
    }
    point.add(brownVector);
  }

  _freeBrownianMove(index, point) {
    const brownVector = this.memory.brownians.free[index];
    if(this.frameCounter % this.memory.frames.free[index] === 0) {
      const width = this.freeWidth;
      const height = this.freeHeight;
      brownVector
        .of(random(-width, width), random(-height, height))
        .sub(point)
        .scale(random(this.cfg.minFreeSpeed, this.cfg.maxFreeSpeed));
      this.memory.frames.free[index] = randomInt(this.cfg.minFreeFrame, this.cfg.maxFreeFrame);
    }
    point.add(brownVector);
  }

  subscribeEvents() {
    window.addEventListener('resize', this.onResize.bind(this));
    this.gl.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.gl.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.gl.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
  }

  unsubscribeEvents() {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
  }

  onReset() {
    const width = this.cfg.initRadius;
    const height = this.cfg.initRadius;
    for(let i = 0; i < this.length; i++) {
      this.memory.positions.logo[i].rand([-width, -height], [width, height]);
    }
    this.gl.bindBuffer(this.positions, {
      buffer: this.posBuffer,
      dtype: this.gl.context.DYNAMIC_DRAW
    });
  }

  onResize() {
    this.calcSize();
    this.gl.setupCanvas(this.width, this.height, this.gl.canvas);
    this.mainProgram.attachUniform({
      data: this.resolution,
      name: 'u_Res',
      type: '2fv'
    });
    this.gl.context.viewport(0, 0, this.width, this.height);
  }

  onScroll() {
    this.scrollLeft = 0;
    this.scrollTop = 0;
    let element = this.element;
    while(element !== document.body) {
      this.scrollLeft += element.scrollLeft;
      this.scrollTop += element.scrollTop;
      element = element.parentElement;
    }
    this.scrollLeft += document.body.scrollLeft;
    this.scrollTop += document.body.scrollTop;
  }

  onMouseMove(event) {
    const clientX = event.offsetX;
    const clientY = event.offsetY;
    const mouse = this.memory.mouse;
    mouse.x = ((clientX / this.width) * 2 - 1) / this.cfg.scale / this.resolution[0];
    mouse.y = (1 - (clientY / this.height) * 2) / this.cfg.scale / this.resolution[1];
  }

  onMouseDown() {
    this.cfg.softRadius *= -2;
    this.cfg.radius *= 10;
  }

  onMouseUp() {
    this.cfg.softRadius *= -10;
    this.cfg.radius *= -1;
    setTimeout(() => {
      this.cfg.softRadius /= 20;
      this.cfg.radius /= -10;
    }, 300);
  }

  destroy() {
    this.unsubscribeEvents();
    this.removeFromDom();
  }
}

export default Logo;
