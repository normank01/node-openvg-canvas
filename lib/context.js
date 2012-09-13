var util = require('util');

var vg = require('openvg');
var color = require('./color');

var compositeOperation2vg = {
  'source-atop'     : vg.VGBlendMode.VG_BLEND_SRC,
  'source-in'       : vg.VGBlendMode.VG_BLEND_SRC_IN,
  'source-out'      : vg.VGBlendMode.VG_BLEND_SRC, // Not implemented ?
  'source-over'     : vg.VGBlendMode.VG_BLEND_SRC_OVER,
  'destination-atop': vg.VGBlendMode.VG_BLEND_DST_IN, // Not implemented ?
  'destination-in'  : vg.VGBlendMode.VG_BLEND_DST_IN,
  'destination-out' : vg.VGBlendMode.VG_BLEND_DST_IN, // Not implemented ?
  'destination-over': vg.VGBlendMode.VG_BLEND_DST_OVER,
  'lighter'         : vg.VGBlendMode.VG_BLEND_LIGHTEN,
  'copy'            : vg.VGBlendMode.VG_BLEND_SRC, // Not implemented ?
  'xor'             : vg.VGBlendMode.VG_BLEND_SRC, // Not implemented ?

  'openVG-multiply' : vg.VGBlendMode.VG_BLEND_MULTIPLY,
  'openVG-screen'   : vg.VGBlendMode.VG_BLEND_SCREEN,
  'openVG-darker'   : vg.VGBlendMode.VG_BLEND_DARKEN,
  'openVG-additive' : vg.VGBlendMode.VG_BLEND_ADDITIVE,
};

var lineCap2vg = {
  'butt'   : vg.VGCapStyle.VG_CAP_BUTT,
  'round'  : vg.VGCapStyle.VG_CAP_ROUND,
  'square' : vg.VGCapStyle.VG_CAP_SQUARE
};

var lineJoin2vg = {
  'round' : vg.VGJoinStyle.VG_JOIN_MITER,
  'bevel' : vg.VGJoinStyle.VG_JOIN_BEVEL,
  'miter' : vg.VGJoinStyle.VG_JOIN_MITER
}

// textAlign
//   start, end, left, right, center

// textBaseline
//   top, hanging, middle, alphabetic, ideographic, bottom

function newPath() {
  return vg.createPath(vg.VG_PATH_FORMAT_STANDARD,
                       vg.VGPathDatatype.VG_PATH_DATATYPE_F,
                       1.0, 0.0, 0, 0,
                       vg.VGPathCapabilities.VG_PATH_CAPABILITY_ALL);
}


module.exports.createCanvasRenderingContext2D = function(canvas) {
  // Context information
  var width  = canvas.width;
  var height = canvas.height;

  // OpenVG origin is at bottom left, not top right
  var baseTransform =
    new Float32Array([ 1.0,    0.0, 0.0,
                       0.0,   -1.0, 0.0,
                       0.0, height, 1.0]);

  // var currentTransform =
  //   new Float32Array(9);

  // Internal/Native data
  var clearPaint = vg.createPaint();
  var fillPaint = vg.createPaint();
  var strokePaint = vg.createPaint();

  var currentPath = newPath();
  var immediatePath = newPath();

  var drawingStateStack = [];

  // compositing
  var globalAlpha = 1.0;
  var globalCompositeOperation = 'source-over';

  // image smoothing
  var imageSmoothingEnabled = true;

  // colors and styles (see also the CanvasDrawingStyles interface)
  var strokeStyle = 'black';
  var fillStyle = 'black';

  // shadows
  // attribute unrestricted double shadowOffsetX; // (default 0)
  // attribute unrestricted double shadowOffsetY; // (default 0)
  // attribute unrestricted double shadowBlur; // (default 0)
  // attribute DOMString shadowColor; // (default transparent black)

  // interface CanvasDrawingStyles
  // line caps/joins
  var lineWidth;
  var lineCap;
  var lineJoin;
  var miterLimit;

  // dashed lines
  var lineDashOffset = undefined; // *** default is undefined

  // text
  var font = '10px sans-serif'; // (default 10px sans-serif)
  var textAlign = 'start'; // (default: "start")
  var textBaseline = 'alphabetic'; // (default: "alphabetic")


  // Context object
  var result = {};

  // Methods
  // back-reference to the canvas
  function getCanvas() { return canvas; }
  Object.defineProperty(result, 'canvas', { get: getCanvas });

  // state
  result.save = function() {
    var current = {
      matrix: new Float32Array(9),
      clippingRegion: undefined,
      strokeStyle: undefined,
      fillStyle: undefined,
      globalAlpha: undefined,
      lineWidth: lineWidth,
      lineCap: lineCap,
      lineJoin: lineJoin,
      miterLimit: miterLimit,
      lineDashOffset: undefined,
      shadowOffsetX: undefined,
      shadowOffsetY: undefined,
      shadowBlur: undefined,
      shadowColor: undefined,
      globalCompositeOperation: undefined,
      font: undefined,
      textAlign: undefined,
      textBaseline: undefined,
      imageSmoothingEnabled: undefined
    }

    vg.getMatrix(current.matrix);

    drawingStateStack.push(current);
  };

  result.restore = function() {
    var current = drawingStateStack.pop();

    vg.loadMatrix(current.matrix);
    result.lineWidth = current.lineWidth;
    result.lineCap = current.lineCap;
    result.lineJoin = current.lineJoin;
    result.miterLimit = current.miterLimit;
  };

  // transformations (default transform is the identity matrix)
  result.scale = function(x, y) {
    vg.scale(x, y);
  };

  result.rotate = function(angle) {
    vg.rotate(-angle); // compensate for screen vertical mirroring
  };

  result.translate = function(x, y) {
    vg.translate(x, y);
  };

  result.transform = function(a, b, c, d, e, f) {
    var matrix =
      new Float32Array([ a, b, 0.0,
                         c, d, 0.0,
                         e, f, 1.0]);

    vg.multMatrix(matrix);
  };

  result.setTransform = function(a, b, c, d, e, f) {
    var matrix =
      new Float32Array([ a, b, 0.0,
                         c, d, 0.0,
                         e, f, 1.0]);

    vg.loadIdentity();
    vg.multMatrix(baseTransform);
    vg.multMatrix(x, y);
  };

  result.resetTransform = function() {
    vg.loadIdentity();
    vg.multMatrix(baseTransform);
  };

  // compositing
  function getGlobalAlpha() { return globalAlpha; }
  function setGlobalAlpha(newGlobalAlpha) {
    globalAlpha = newGlobalAlpha;
    // TODO: set stuff
  }
  Object.defineProperty(result, 'globalAlpha', { get: getGlobalAlpha, set: setGlobalAlpha });

  function getGlobalCompositeOperation() { return globalCompositeOperation; }
  function setGlobalCompositeOperation(newGlobalCompositeOperation) {
    var vgBlendMode = compositeOperation2vg[newGlobalCompositeOperation];
    if (vgBlendMode) {
      globalCompositeOperation = newGlobalCompositeOperation;
      vg.setI(vg.VGParamType.VG_BLEND_MODE, vgBlendMode);
    } // TODO else ? (@see spec)
  }
  Object.defineProperty(result, 'globalCompositeOperation', { get: getGlobalCompositeOperation, set: setGlobalCompositeOperation });

  // image smoothing
  function getImageSmoothingEnabled() { return imageSmoothingEnabled; }
  function setImageSmoothingEnabled(newImageSmoothingEnabled) {
    imageSmoothingEnabled = newImageSmoothingEnabled;
    // TODO: set stuff
  }
  Object.defineProperty(result, 'imageSmoothingEnabled', { get: getImageSmoothingEnabled, set: setImageSmoothingEnabled });

  // colors and styles (see also the CanvasDrawingStyles interface)
  function getStrokeStyle() { return strokeStyle; }
  function setStrokeStyle(newStrokeStyle) {
    strokeStyle = newStrokeStyle;

    if ('string' === typeof newStrokeStyle) {
      var strokeColor = color.toVGVector(color.parseColor(newStrokeStyle));

      vg.setParameterI (strokePaint, vg.VGPaintParamType.VG_PAINT_TYPE, vg.VGPaintType.VG_PAINT_TYPE_COLOR);
      vg.setParameterFV(strokePaint, vg.VGPaintParamType.VG_PAINT_COLOR, strokeColor);
      vg.setPaint      (strokePaint, vg.VGPaintMode.VG_STROKE_PATH);
    }
  }
  Object.defineProperty(result, 'strokeStyle', { get: getStrokeStyle, set: setStrokeStyle });

  function getFillStyle() { return fillStyle; }
  function setFillStyle(newFillStyle) {
    fillStyle = newFillStyle;

    if ('string' === typeof newFillStyle) {
      var fillColor = color.toVGVector(color.parseColor(newFillStyle));

      // console.log('fillStyle: ' + fillStyle + ' - color');

      vg.setParameterI (fillPaint, vg.VGPaintParamType.VG_PAINT_TYPE, vg.VGPaintType.VG_PAINT_TYPE_COLOR);
      vg.setParameterFV(fillPaint, vg.VGPaintParamType.VG_PAINT_COLOR, fillColor);
      vg.setPaint      (fillPaint, vg.VGPaintMode.VG_FILL_PATH);
    }
  }
  Object.defineProperty(result, 'fillStyle', { get: getFillStyle, set: setFillStyle });


  result.createLinearGradient = function(x0, y0, x1, y1) {
    return null;
  };

  result.createRadialGradient = function(x0, y0, r0, x1, y1, r1) {
    return null;
  };

  result.createPattern = function(image, repetition) {
    return null;
  };


  // rects
  result.clearRect = function(x, y, w, h) {
    var savePaint = vg.getPaint(vg.VGPaintMode.VG_FILL_PATH);
    vg.setPaint(clearPaint, vg.VGPaintMode.VG_FILL_PATH);

    vg.clearPath(immediatePath, vg.VGPathCapabilities.VG_PATH_CAPABILITY_ALL);
    vg.vgu.rect(immediatePath, x, y, w, h);
    vg.drawPath(immediatePath, vg.VGPaintMode.VG_FILL_PATH);

    vg.setPaint(clearPaint, savePaint);
  };

  result.fillRect = function(x, y, w, h) {
    vg.setPaint(fillPaint, vg.VGPaintMode.VG_FILL_PATH);

    vg.clearPath(immediatePath);
    vg.vgu.rect(immediatePath, x, y, w, h);
    vg.drawPath(immediatePath, vg.VGPaintMode.VG_FILL_PATH);
  };

  result.strokeRect = function(x, y, w, h) {
    vg.setPaint(strokePaint, vg.VGPaintMode.VG_STROKE_PATH);

    vg.clearPath(immediatePath);
    vg.vgu.rect(immediatePath, x, y, w, h);
    vg.drawPath(immediatePath, vg.VGPaintMode.VG_STROKE_PATH);
  };


  // path API (see also CanvasPathMethods)
  result.beginPath = function() {
    vg.clearPath(currentPath, vg.VGPathCapabilities.VG_PATH_CAPABILITY_ALL);
  }


  result.fill = function(path) {
    vg.drawPath(path || currentPath, vg.VGPaintMode.VG_FILL_PATH);
  };

  result.stroke = function(path) {
    vg.drawPath(path || currentPath, vg.VGPaintMode.VG_STROKE_PATH);

    return null;
  };

  result.drawSystemFocusRing = function(path, element) {
    if (element === undefined) {
      element = path;
      path = currentPath;
    }
    return null;
  };

  result.drawCustomFocusRing = function(path, element) {
    if (element === undefined) {
      element = path;
      path = currentPath;
    }
    return null;
  };

  result.scrollPathIntoView = function(path) {
    if (path === undefined) { path = currentPath }
    return null;
  };

  result.clip = function(path) {
    if (path === undefined) { path = currentPath }
    return null;
  };

  result.resetClip = function() {
    return null;
  };

  result.isPointInPath = function(path, x, y) {
    if (y === undefined) {
      y = x;
      x = path;
      path = currentPath;
    }

    return null;
  };

  // text (see also the CanvasDrawingStyles interface)
  result.fillText = function(text, x, y, maxWidth) {
    return null;
  };

  result.strokeText = function(text, x, y, maxWidth) {
    return null;
  };

  result.measureText = function(text) {
    return null;
  };


  // drawing images
  result.drawImage = function(image, dx, dy) {
    return null;
  };

  result.drawImage = function(image, dx, dy, dw, dh) {
    return null;
  };

  result.drawImage = function(image, sx, sy, sw, sh, dx, dy, dw, dh) {
    return null;
  };


  // hit regions
  result.addHitRegion = function(options) {
    return null;
  };

  result.removeHitRegion = function(options) {
    return null;
  };


  // pixel manipulation
  result.createImageData = function(sw, sh) {
    return null;
  };

  result.createImageData = function(imagedata) {
    return null;
  };

  result.createImageDataHD = function(sw, sh) {
    return null;
  };

  result.getImageData = function(sx, sy, sw, sh) {
    return null;
  };

  result.getImageDataHD = function(sx, sy, sw, sh) {
    return null;
  };

  result.putImageData = function(imagedata, dx, dy) {
    return null;
  };

  result.putImageDataHD = function(imagedata, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight) {
    return null;
  };


  // interface CanvasDrawingStyles
  // line caps/joins
  var miterLimit = 10; // (default 10)

  function getLineWidth() { return lineWidth; }
  function setLineWidth(newLineWidth) {
    lineWidth = newLineWidth;
    vg.setF(vg.VGParamType.VG_STROKE_LINE_WIDTH, newLineWidth);
  }
  Object.defineProperty(result, 'lineWidth', { get: getLineWidth, set: setLineWidth });

  function getLineCap() { return lineCap; }
  function setLineCap(newLineCap) {
    var vgCapStyle = lineCap2vg[newLineCap];
    if (vgCapStyle) {
      lineCap = newLineCap;
      vg.setI(vg.VGParamType.VG_STROKE_CAP_STYLE, vgCapStyle);
    } // TODO else ? (@see spec)
  }
  Object.defineProperty(result, 'lineCap', { get: getLineCap, set: setLineCap });

  function getLineJoin() { return lineJoin; }
  function setLineJoin(newLineJoin) {
    var vgJoinStyle = lineJoin2vg[newLineJoin];
    if (vgJoinStyle) {
      lineJoin = newLineJoin;
      vg.setI(vg.VGParamType.VG_STROKE_JOIN_STYLE, vgJoinStyle);
    } // TODO else ? (@see spec)
  }
  Object.defineProperty(result, 'lineCap', { get: getLineCap, set: setLineCap });

  function getMiterLimit() { return miterLimit; }
  function setMiterLimit(newMiterLimit) {
    miterLimit = newMiterLimit;
    vg.setF(vg.VGParamType.VG_STROKE_MITER_LIMIT, newMiterLimit);
  }
  Object.defineProperty(result, 'miterLimit', { get: getMiterLimit, set: setMiterLimit });


  // dashed lines
  result.setLineDash = function(segments) { // default empty
    return null;
  };

  result.getLineDash = function() {
    return null;
  };

  // interface CanvasPathMethods
  // shared path API methods
  result.closePath = function() {
    return null;
  };

  result.moveTo = function(x, y) {
    vg.appendPathData(currentPath, 1, new Uint8Array([vg.VGPathSegment.VG_MOVE_TO]),
                      new Float32Array([x, y]));
  };

  result.lineTo = function(x, y) {
    vg.appendPathData(currentPath, 1, new Uint8Array([vg.VGPathSegment.VG_LINE_TO]),
                      new Float32Array([x, y]));
  };

  result.quadraticCurveTo = function(cpx, cpy, x, y) {
    return null;
  };

  result.bezierCurveTo = function(cp1x, cp1y, cp2x, cp2y, x, y) {
    return null;
  };

  result.arcTo = function(x1, y1, x2, y2, radius) {
    return null;
  };
 
  result.arcTo = function(x1, y1, x2, y2, radiusX, radiusY, rotation) {
    return null;
  };
 
  result.rect = function(x, y, w, h) {
    return null;
  };

  result.arc = function(x, y, radius, startAngle, endAngle, anticlockwise) {
    if (anticlockwise === undefined) { anticlockwise = false; }
    result.ellipse(x, y, radius, radius, 0, startAngle, endAngle, anticlockwise);
  };
 
  result.ellipse = function(x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise) {
    var start  = startAngle * 180 / Math.PI;
    var extent = (endAngle - startAngle) * 180 / Math.PI;
    if (anticlockwise) { extent -= 360; }
    // rotation ignored
    vg.vgu.arc(currentPath, x, y, radiusX * 2, radiusY * 2,
               startAngle * 180 / Math.PI, (endAngle - startAngle) * 180 / Math.PI,
               vg.VGUArcType.VGU_ARC_OPEN);
  };
 
  // Initialization
  vg.loadIdentity();
  vg.multMatrix(baseTransform);

  var bgColor = new Float32Array([0, 0, 0, 1]);

  vg.setParameterI (clearPaint, vg.VGPaintParamType.VG_PAINT_TYPE, vg.VGPaintType.VG_PAINT_TYPE_COLOR);
  vg.setParameterFV(clearPaint, vg.VGPaintParamType.VG_PAINT_COLOR, bgColor);
  vg.setPaint      (clearPaint, vg.VGPaintMode.VG_FILL_PATH);

  vg.setFV         (vg.VGParamType.VG_CLEAR_COLOR, bgColor);
  vg.clear(0, canvas.height-1, width, height);
  // color[0] = 1.0, color[1] = 1.0, color[2] = 1.0;
  // setFill(color);
  // setStroke(color);
  // strokeWidth(0);

  // vg.loadIdentity();

  // set global alpha
  // set global composite operation
  result.globalCompositeOperation = 'src-over';
  // set image smoothing enabled

  // stroke style
  result.lineWidth = 1;
  result.lineCap = 'butt';
  result.lineJoin = 'miter'
  result.miterLimit = 10;

  // fill style

  return result;
};