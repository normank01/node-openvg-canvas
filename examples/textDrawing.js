#!/usr/bin/env node-canvas
/*jslint indent: 2, node: true */
"use strict";

// Based on:
// https://github.com/LearnBoost/node-canvas/blob/master/examples/text.js

var Canvas = require('../lib/canvas');
var canvas = new Canvas(200, 200);
var ctx = canvas.getContext('2d');
var fs = require('fs');

var eu = require('./util');

ctx.clearRect(0, 0, canvas.width, canvas.height);
ctx.scale(4, 4);
ctx.strokeStyle = "#fff";

ctx.globalAlpha = 0.2;

ctx.strokeRect(0, 0, 200, 200);
ctx.lineTo(0, 100);
ctx.lineTo(200, 100);
ctx.stroke();

ctx.beginPath();
ctx.lineTo(100, 0);
ctx.lineTo(100, 200);
ctx.stroke();

ctx.globalAlpha = 1;
ctx.font = 'normal 40px Impact, serif';

ctx.rotate(0.5);
ctx.translate(20, -40);

ctx.lineWidth = 1;
ctx.strokeStyle = '#ddd';
ctx.strokeText("Wahoo", 50, 100);

ctx.fillStyle = '#000';
ctx.fillText("Wahoo", 49, 99);

var m = ctx.measureText("Wahoo");

ctx.strokeStyle = '#f00';

ctx.strokeRect(49 + m.actualBoundingBoxLeft,
               99 - m.actualBoundingBoxAscent,
               m.actualBoundingBoxRight - m.actualBoundingBoxLeft,
               m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);

canvas.vgSwapBuffers();
eu.handleTermination();
eu.waitForInput();
