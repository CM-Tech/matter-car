/*
 * Copyright (c) 2016-2017 Ali Shakiba http://shakiba.me/planck.js
 * Copyright (c) 2006-2011 Erin Catto  http://www.box2d.org
 *
 * This software is provided 'as-is', without any express or implied
 * warranty.  In no event will the authors be held liable for any damages
 * arising from the use of this software.
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 * 1. The origin of this software must not be misrepresented; you must not
 * claim that you wrote the original software. If you use this software
 * in a product, an acknowledgment in the product documentation would be
 * appreciated but is not required.
 * 2. Altered source versions must be plainly marked as such, and must not be
 * misrepresented as being the original software.
 * 3. This notice may not be removed or altered from any source distribution.
 */

noise.seed(3);
var c = document.getElementById("c");
var ctx = c.getContext("2d");
c.width = window.innerWidth;
c.height = window.innerHeight;
var tickSpeed = 1;
var camera = {
	x: 0,
	y: 0
};
var paused = false;
var doubleWheelParent = false;
var SMALL_GROUP = 1;
var LARGE_GROUP = -1;
var BODY_CATEGORY = 0x0002;
var WHEEL_CATEGORY = 0x0004;

var BODY_MASK = 0xFFFF;
var BODY_BROKE_MASK = 0xFFFF ^ BODY_CATEGORY ^ WHEEL_CATEGORY;
var WHEEL_MASK = 0xFFFF ^ WHEEL_CATEGORY ^ BODY_CATEGORY;

var wheelShapeDef = {};
wheelShapeDef.filterCategoryBits = WHEEL_CATEGORY;
wheelShapeDef.filterMaskBits = WHEEL_MASK;
wheelShapeDef.density = 0.5;
wheelShapeDef.friction = 10;
wheelShapeDef.restitution = 0.1;

var bodyShapeDef = {};
bodyShapeDef.filterCategoryBits = BODY_CATEGORY;
bodyShapeDef.filterMaskBits = BODY_MASK;
bodyShapeDef.density = 2;
bodyShapeDef.friction = 10.0;
bodyShapeDef.restitution = 0.05;

var negBodyShapeDef = {};
negBodyShapeDef.filterCategoryBits = BODY_CATEGORY;
negBodyShapeDef.filterMaskBits = BODY_MASK;
negBodyShapeDef.density = -2;
negBodyShapeDef.friction = 10.0;
negBodyShapeDef.restitution = 0.05;
var springShapeDef = {};
springShapeDef.filterCategoryBits = WHEEL_CATEGORY;
springShapeDef.filterMaskBits = WHEEL_MASK;
springShapeDef.density = 15;
springShapeDef.friction = 10.0;
springShapeDef.restitution = 0.05;

var bodyBrokeShapeDef = {};
bodyBrokeShapeDef.filterMaskBits = BODY_BROKE_MASK;
bodyBrokeShapeDef.density = 2;
bodyBrokeShapeDef.restitution = 0.05;
var GRAVITY = 10;
var MASS_MULT = 1.5;
var simSpeed = 1;
var pl = planck,
	Vec2 = pl.Vec2;
var world = new pl.World({
	gravity: Vec2(0, -GRAVITY)
});

// wheel spring settings
var HZ = 4.0;
var ZETA = 0.7;
var SPEED = 6 * Math.PI;
var ground = world.createBody();
var genX = -200;
var flatLandEndX = 25;
var groundFD = {
	density: 0.0,
	friction: 2.0
};
var currentTicks = 0;
var distTicks = 0;
var restartTicks = 400;
var restartCurrent = 0;
var carScore = 0;

function updateProgress(x) {
	if (carScore < x - 3) {
		restartCurrent = 0;
		carScore = x + 0;
		boxCar.score = x + 0
		distTicks = currentTicks + 0;
	}
}

function terrain1(x) {
	if (x < flatLandEndX)
		return 0;
	return noise.perlin2((x - flatLandEndX) / 20, 0) * 10 + noise.perlin2((x - flatLandEndX) / 10, (x - flatLandEndX) / 10) * 10 - Math.pow(Math.max(x - flatLandEndX, 0) / 10, 1.2) / 4 * 10;
}

function terrain2(x) {
	if (x < flatLandEndX)
		return 0;
	return noise.perlin2((x - flatLandEndX) / 15, 0) * (12 - 2 / ((x - flatLandEndX + 10) / 7)) + noise.perlin2((x - flatLandEndX) / 7, (x - flatLandEndX) / 7);
}

function terrain3(x) {
	if (x < flatLandEndX)
		return 0;
	var r=(250-25);
	if(r-Math.sqrt(1-Math.pow(Math.max(x - flatLandEndX, 0)/r,2))*r){
		return (r-Math.sqrt(1-Math.pow(Math.max(x - flatLandEndX, 0)/r,2))*r)*1.75;
	}else{
		return noise.perlin2((x - flatLandEndX) / 15, 0) * (12 - 2 / ((x - flatLandEndX + 10) / 7)) + noise.perlin2((x - flatLandEndX) / 7, (x - flatLandEndX) / 7);
	}
	
	/*return Math.pow(Math.max(x - flatLandEndX, 0) / 5, 3) / 4 * 8 + (((Math.max(x - flatLandEndX, 0) / 5) % 2) / 2 > 0.5
		? 0.1
		: 0);*/
}
function terrain4(x) {
	if (x < flatLandEndX)
		return 0;
	var m = 1;
	if (x < flatLandEndX + 100)
		m = Math.max(x - flatLandEndX, 0) / 100;
	return -Math.sin(Math.max(x - flatLandEndX, 0) / 20 + Math.pow(Math.max(x - flatLandEndX, 0) / 20, 1.75) / 20) * 10 * m;// / (10+40/(Math.pow(Math.max(x - flatLandEndX, 0),0.5)+1)))*10;
}

var terrains = [];
function resetGround() {
	terrains
		.filter(function (t) {
			return t.m_body.m_xf.p.x + t.m_shape.m_centroid.x < camera.x - Math.max(c.width / scale / 2, 100);
		})
		.forEach(function (a) {
			terrains.splice(terrains.indexOf(a), 1)
			ground.destroyFixture(a);
		})
}
function destroyGround() {
	while (ground.m_fixtureList) {
		ground.destroyFixture(ground.m_fixtureList);
	}
	terrains = [];
}

function genGround() {
	//resetGround()
	while (genX < camera.x + Math.max(c.width / scale / 2, 100)) {
		var nextX = genX + 2; //2 for terrain 3 or 4 otherwise 7
		var terrainFunc = terrain3;
		var curPos = Vec2(genX, terrainFunc(genX));
		var nextPos = Vec2(nextX, terrainFunc(nextX));
		var angle = Math.atan2(nextPos.y - curPos.y, nextPos.x - curPos.x);
		var shape = pl.Box(Math.sqrt(Math.pow(nextPos.x - curPos.x, 2) + Math.pow(nextPos.y - curPos.y, 2)) / 2, 0.5, Vec2(curPos.x / 2 + nextPos.x / 2, curPos.y / 2 + nextPos.y / 2), angle);
		var t_fix = ground.createFixture(shape, groundFD);
		terrains.push(t_fix);
		t_fix.render = {
			fill: "rgba(255,255,255,1)",
			stroke: "rgba(255,255,255,1)",
			layer: 6
		};
		genX = nextX;
	}

}
genGround();

// Car
var topScores = [];
var prevGen = [];
var curGen = [];
var maxTops = 6;
var genSize = 16;
var carDNA = new Car();

function genCarFromOldParents() {
	var parentPool = [];
	for (var i = 0; i < topScores.length; i++) {
		parentPool.push(topScores[topScores.length - i - 1].car);
	}
	for (var i = 0; i < prevGen.length; i++) {
		parentPool.push(prevGen[prevGen.length - i - 1].car);
	}
	for (var i = 0; i <curGen.length; i++) {
		parentPool.push(curGen[curGen.length - i - 1].car);
	}
	var pPow = 1;
	return parentPool[Math.floor(Math.pow(Math.random(), pPow) * parentPool.length)].breed(parentPool[Math.floor(Math.pow(Math.random(), pPow) * parentPool.length)]);
}

function exportBestCar() {
	if(topScores.length<1){
		return "";
	}
	topScores.sort(function (a, b) {
		return a.score - b.score;
	});
	return topScores[topScores.length - 1]
		.car
		.exportCar();
}

function bestScore() {
	var s = 0;
	for (var i = 0; i < topScores.length; i++) {
		s = Math.max(s, topScores[i].score);
	}
	return s;
}
function worstScore() {
	if (topScores.length < 1) {
		return 0;
	}
	var s = topScores[0].score;
	for (var i = 0; i < topScores.length; i++) {
		s = Math.min(s, topScores[i].score);
	}
	return s;
}
function insertNewCarScore(car, score, ticks) {
	topScores.push({ score: score, ticks: ticks, car: car });
	topScores.sort(function (a, b) {
		return a.score - b.score;
	});
	if (topScores.length > maxTops) {
		topScores.splice(0, topScores.length - maxTops);
	}
}
function updateScoreTable() {
	topScores.sort(function (a, b) {
		return a.score - b.score;
	});
	if(topScores.length>0){
	document.querySelectorAll("#score-best")[0].setAttribute("value",topScores[topScores.length-1].car.exportCar());
	}
	var innerHtml = "";
	for (var i = 0; i < topScores.length; i++) {
		var entry = topScores[topScores.length - i - 1];
		var tableEntry = "<tr title='Copy car to clipboard' data-clipboard-target='#score" + i + "'>";
		tableEntry += "<td>";
		tableEntry += (entry.score).toFixed(2);
		tableEntry += "</td>";
		tableEntry += "<td>";
		tableEntry += (entry.ticks * 1 / 75).toFixed(2);
		tableEntry += "</td>";
		tableEntry += "</tr>";

		innerHtml += tableEntry;

	}

	for (var i = 0; i < topScores.length; i++) {
		var entry = topScores[topScores.length - i - 1];

		innerHtml += '<input class="hidden-score-export" id="score' + i + '" value="' + entry.car.exportCar() + '">';
	}
	if (document.querySelectorAll(".score-table tbody")[0].innerHTML != innerHtml) {
		document.querySelectorAll(".score-table tbody")[0].innerHTML = innerHtml;
	}
	//document.querySelectorAll(".hidden-score-exports")[0].innerHTML=clipboardInnerHtml;

}
function switchCar(first) {
	carScore = Math.max(boxCar.getPosition().x, carScore);
	var score = carScore + 0;
	var ticks = distTicks + 0;
	if (first) {
		scoreRecord = [];
		topScores = [];
		prevGen = [];
		curGen = [];
		carDNA = new Car();
		createCar(carDNA);
	} else {
		if (score > 0) {
			curGen.push({
				score: score,
				ticks: distTicks,
				car: carDNA.clone()
			});
			insertNewCarScore(carDNA.clone(), score, ticks);
		}
		if (curGen.length >= genSize) {
			curGen
				.sort(function (a, b) {
					return a.score - b.score;
				});
			curGen.splice(0, curGen.length - 4);
			prevGen = curGen;
			curGen = [];
		}
		if (prevGen.length === 0) {
			if (topScores.length > 0) {
				carDNA = genCarFromOldParents();
			} else {
				carDNA = new Car();
			}
			createCar(carDNA);
		} else {
			carDNA = genCarFromOldParents();
			createCar(carDNA);
		}
	}
	updateScoreTable();
}
function importCar(str) {
	var score = carScore + 0;

	scoreRecord = [];
	topScores = [];
	prevGen = [];
	curGen = [];
	carDNA = new Car().importCar(str);
	createCar(carDNA);

}

// Breakable dynamic body
var m_velocity;
var m_angularVelocity;
var carCreationPoint = Vec2(0.0, 10.0);
var boxCar = world.createDynamicBody({
	position: carCreationPoint.clone()
});
var wheelFD = wheelShapeDef;
wheelFD.friction = 1;
var autoFast = false;
var partsToBreak = [];
var connectedParts = [];
var connectedPartsI = [];
var connectedPartsArea = [];
var connectedPartsOld = [];
var connectedShapes = [];
var wheels = [];
var wheelsF = [];
var wheelJoints = [];
var springs = [];
var springsF = [];
var springJoints = [];
var connectedPartsWheels = [];
var connectedPartsSprings = [];
var connectedSpringsOld = [];
var connectedWheelsOld = [];
var center_vec = carCreationPoint.clone();

//create car from data
function removeOldCar() {
	for (var i = 0; i < connectedParts.length; i++) {
		world.destroyBody(connectedParts[i]);
	}
	for (var i = 0; i < connectedPartsOld.length; i++) {
		world.destroyBody(connectedPartsOld[i].m_body);
	}
	for (var i = 0; i < wheels.length; i++) {
		if (wheels[i]) {
			world.destroyBody(wheels[i]);
		}
	}
	for (var i = 0; i < connectedWheelsOld.length; i++) {
		if (connectedWheelsOld[i]) {
			world.destroyBody(connectedWheelsOld[i]);
		}
	}
	for (var i = 0; i < springs.length; i++) {
		if (springs[i]) {
			world.destroyBody(springs[i]);
		}
	}
	for (var i = 0; i < connectedSpringsOld.length; i++) {
		if (connectedSpringsOld[i]) {
			world.destroyBody(connectedSpringsOld[i]);
		}
	}
	world.destroyBody(boxCar);
	boxCar = world.createBody({
		position: carCreationPoint.clone()
	});
	partsToBreak = [];
	connectedParts = [];
	connectedPartsI = [];
	connectedPartsArea = [];
	connectedPartsOld = [];
	connectedShapes = [];
	wheels = [];
	wheelsF = [];
	wheelJoints = [];
	connectedPartsWheels = [];
	connectedWheelsOld = [];
	springs = [];
	springJoints = [];
	connectedPartsSprings = [];
	connectedSpringsOld = [];
	center_vec = carCreationPoint.clone();
}

var carScale = 1;
function createCar(carData) {
	restartCurrent = 0;
	carDNA = carData;
	removeOldCar();
	boxCar = world.createDynamicBody({
		position: carCreationPoint.clone()
	});
	connectedParts = [];
	connectedPartsI = [];
	connectedPartsArea = [];
	connectedPartsOld = [];
	connectedShapes = [];
	wheels = [];
	wheelsF = [];
	wheelJoints = [];
	connectedPartsWheels = [];
	connectedWheelsOld = [];
	springs = [];
	springJoints = [];
	connectedPartsSprings = [];
	connectedSpringsOld = [];
	center_vec = carCreationPoint.clone();
	var lowestY = carCreationPoint.y + 0;
	var p_angle = Math.abs((carData.data.angleWeights[0] / carData.totalAngleWeights() * Math.PI * 2)%(Math.PI * 2) );
	if((p_angle+Math.PI)%(Math.PI * 2)-Math.PI<0){
		p_angle=Math.PI-1-((p_angle+Math.PI)%(Math.PI * 2)-Math.PI);
	}
	for (var i = 0; i < carData.bodyParts; i++) {
		connectedPartsArea.push(carData.getAreaOfPiece(i));
		var new_p_angle = p_angle + carData.data.angleWeights[(i + 1) % carData.data.angleWeights.length] / carData.totalAngleWeights() * Math.PI * 2;
		var m_shape = pl.Polygon([
			Vec2(0, 0),
			Vec2(Math.cos(p_angle + 0) * carData.data.lengths[i] * carScale, Math.sin(p_angle + 0) * carData.data.lengths[i] * carScale),
			Vec2(Math.cos(new_p_angle + 0) * carData.data.lengths[(i + 1) % carData.data.lengths.length] * carScale, Math.sin(new_p_angle + 0) * carData.data.lengths[(i + 1) % carData.data.lengths.length] * carScale)
		]);
		var bDef=bodyShapeDef;
		if((((new_p_angle-p_angle+0)/Math.PI*180+360)%360+360)%360>180){
			bDef=negBodyShapeDef;
			console.log("neg");
		}
		var m_piece = boxCar.createFixture(m_shape, bDef);
		lowestY = Math.min(lowestY, m_piece.getAABB(0).lowerBound.y);
		//var bodyColor = decodeRGB(carData.data.colors[i]||0);
		//console.log("#"+(carData.data.colors[i]||0).toString(16).padStart(6,"0"));
		var bodyColor = decodeRGB(parseInt(convertToMaterial((carData.data.colors[i] || 0).toString(16).padStart(6, "0")).substring(1), 16));
		var colorLerp = 0;
		/*m_piece.render = {
		fill : "rgba(" + bodyColor.r * (1 - colorLerp) + 255 * colorLerp + "," + bodyColor.g * (1 - colorLerp) + 255 * colorLerp + "," + bodyColor.b * (1 - colorLerp) + 255 * colorLerp + ",1)", //"hsla(" + Math.random() * 360 + ",100%,50%,0.5)"
		stroke : "rgba(" + bodyColor.r * (1 - colorLerp) + 255 * colorLerp + "," + bodyColor.g * (1 - colorLerp) + 255 * colorLerp + "," + bodyColor.b * (1 - colorLerp) + 255 * colorLerp + ",1)"//"rgba(255,255,255,1)" //stroke : "rgba(" + bodyColor.r * (1 - colorLerp) + 255 * colorLerp + "," + bodyColor.g * (1 - colorLerp) + 255 * colorLerp + "," + bodyColor.b * (1 - colorLerp) + 255 * colorLerp + ",0.75)"
				};*/
		var matHex = convertToMaterial((carData.data.colors[i] || 0).toString(16).padStart(6, "0"));
		m_piece.render = {
			fill: matHex,
			stroke: matHex,
			layer: 6
		};
		connectedParts.push(m_piece);
		connectedPartsI.push(i);
		connectedShapes.push(m_shape);
		var wheelsThere = carData.wheelsAt(i);
		var totWheelAdditions = [];
		var totSpringAdditions = [];
		for (var j = 0; j < wheelsThere.length; j++) {
			var wheelData = wheelsThere[j];
			if (wheelData.o) {
				var wheelColor = decodeRGB(carData.data.colors[(carData.data.wheels.indexOf(wheelData) + 8) % carData.data.colors.length]);
				var wheelPos = Vec2(Math.cos(p_angle) * carData.data.lengths[i] * carScale, Math.sin(p_angle) * carData.data.lengths[i] * carScale)
					.add(center_vec)
					.sub(Vec2(Math.cos(wheelData.axelAngle) * carData.maxRadius * carScale / 3, Math.sin(wheelData.axelAngle) * carData.maxRadius * carScale / 3));
				var wheelAxelPos = Vec2(Math.cos(wheelData.axelAngle) * 0.2 * carScale * carData.maxRadius / 3, Math.sin(wheelData.axelAngle) * 0.2 * carScale * carData.maxRadius / 3).add(wheelPos);
				var spring = world.createDynamicBody(wheelAxelPos);

				var s_fix = spring.createFixture(pl.Box(0.2 * carScale * carData.maxRadius / 1.5, 0.05 * carScale * carData.maxRadius / 1.5, Vec2(0, 0), wheelData.axelAngle), springShapeDef);
				var s_b_fix = m_piece
					.m_body
					.createFixture(pl.Box(0.2 * carScale * carData.maxRadius / 1.5, 0.1 * carScale * carData.maxRadius / 1.5, Vec2(Math.cos(p_angle) * carData.data.lengths[i] * carScale, Math.sin(p_angle) * carData.data.lengths[i] * carScale), wheelData.axelAngle), springShapeDef);
				var wheel = world.createDynamicBody(wheelPos);
				var w_fix = wheel.createFixture(pl.Circle(wheelData.r * carScale*0.89), wheelFD);
				w_fix.render = {
					fill: "rgba(0,0,0,1)",
					layer: 3
				};
				var colorLerp = 1;
				/*s_b_fix.render = {
fill : "rgba(" + wheelColor.r * (1 - colorLerp) + 255 * colorLerp + "," + wheelColor.g * (1 - colorLerp) + 255 * colorLerp + "," + wheelColor.b * (1 - colorLerp) + 255 * colorLerp + ",1)", //"hsla(" + Math.random() * 360 + ",100%,50%,0.5)"
stroke : "rgba(" + wheelColor.r * (1 - colorLerp) + 255 * colorLerp + "," + wheelColor.g * (1 - colorLerp) + 255 * colorLerp + "," + wheelColor.b * (1 - colorLerp) + 255 * colorLerp + ",0.75)",
layer:5
				};
s_fix.render = {
				fill: "rgba(" + wheelColor.r * (1 - colorLerp) + 255 * colorLerp + "," + wheelColor.g * (1 - colorLerp) + 255 * colorLerp + "," + wheelColor.b * (1 - colorLerp) + 255 * colorLerp + ",1)", //"hsla(" + Math.random() * 360 + ",100%,50%,0.5)"
				stroke: "rgba(" + wheelColor.r * (1 - colorLerp) + 255 * colorLerp + "," + wheelColor.g * (1 - colorLerp) + 255 * colorLerp + "," + wheelColor.b * (1 - colorLerp) + 255 * colorLerp + ",0.75)",
				layer:4

			};*/
				var matHex = convertToMaterial((carData.data.colors[(carData.data.wheels.indexOf(wheelData) + 8) % carData.data.colors.length] || 0).toString(16).padStart(6, "0"));
				s_b_fix.render = {
					fill: matHex, //"hsla(" + Math.random() * 360 + ",100%,50%,0.5)"
					stroke: matHex,
					layer: 5
				};
				s_fix.render = {
					fill: matHex, //"hsla(" + Math.random() * 360 + ",100%,50%,0.5)"
					stroke: matHex,
					layer: 4

				};
				var bounceJoint = world.createJoint(pl.PrismaticJoint({
					enableMotor: true,
					lowerTranslation: -carData.maxRadius * carScale / 3,
					upperTranslation: carData.maxRadius * carScale / 3*0.075,
					enableLimit: true

				}, m_piece.m_body, spring, wheel.getWorldCenter(), Vec2(-Math.cos(wheelData.axelAngle) / 1, -Math.sin(wheelData.axelAngle) / 1)));

				var turnJoint = world.createJoint(pl.RevoluteJoint({
					motorSpeed: -SPEED,
					maxMotorTorque: 42 / 2,
					enableMotor: true,
					frequencyHz: 4,
					dampingRatio: 0.1
				}, s_fix.m_body, wheel, wheel.getWorldCenter(), Vec2(-Math.cos(wheelData.axelAngle) / 1, -Math.sin(wheelData.axelAngle) / 1)));
				wheelJoints.push(turnJoint);
				totWheelAdditions.push(turnJoint);
				wheels.push(wheel);
				wheelsF.push(w_fix);

				springJoints.push(bounceJoint);
				totSpringAdditions.push(bounceJoint);
				springs.push(spring);
				springsF.push(s_fix);
				lowestY = Math.min(lowestY, w_fix.getAABB(0).lowerBound.y);
				m_piece
					.m_body
					.resetMassData();
			}
		}
		connectedPartsWheels.push([totWheelAdditions]);
		connectedPartsSprings.push([totSpringAdditions]);
		p_angle = new_p_angle;
	}
	lowestY=0;//lowestY+0.1*carScale;
	boxCar.resetMassData();
	boxCar.setPosition(Vec2(boxCar.getPosition().x, boxCar.getPosition().y - lowestY));
	for (var i = 0; i < springsF.length; i++) {
		var toTransform = springsF[i].m_body;
		toTransform.setPosition(Vec2(toTransform.getPosition().x, toTransform.getPosition().y - lowestY));
	}
	for (var i = 0; i < wheelsF.length; i++) {

		var toTransform = wheelsF[i].m_body;
		toTransform.setPosition(Vec2(toTransform.getPosition().x, toTransform.getPosition().y - lowestY));
	}
	carScore = 0;
	camera.x = 0;
	restartCurrent = 0;
	distTicks = 0;
	currentTicks = 0;
	genX = -200;
	destroyGround();
	genGround();
	updateScoreTable();
}
switchCar(true);
world.on('post-solve', function (contact, impulse) {
	var a = contact;
	while (a) {
		for (var j = 0; j < connectedParts.length; j++) {
			var m_piece = connectedParts[j];
			var strength = 50 * connectedParts[j].m_body.m_mass / 2; //Math.sqrt(connectedPartsArea[j]) * 3;
			//console.log("s",strength);
			if ((a.m_fixtureA == m_piece && connectedPartsOld.indexOf(a.m_fixtureB) < 0 && wheelsF.indexOf(a.m_fixtureB) < 0) || (a.m_fixtureB == m_piece && connectedPartsOld.indexOf(a.m_fixtureA) < 0 && wheelsF.indexOf(a.m_fixtureA) < 0)) {
				var partBreak = false;
				var impulseSum = 0;
				for (var i = 0; i < a.v_points.length; i++) {
					if (a.v_points[i].normalImpulse > strength)
						partBreak = true;
				}
				if (partBreak)
					partsToBreak.push(m_piece);
			}
		}
		a = a.m_next;
	}
});
//Break can only be called in step
function Break(m_piece) {
	if (connectedParts.indexOf(m_piece) >= 0) {
		var mIndex = connectedParts.indexOf(m_piece);
		var m_shape = connectedShapes.splice(connectedParts.indexOf(m_piece), 1)[0];
		var m_area = connectedPartsArea.splice(connectedParts.indexOf(m_piece), 1)[0];
		var m_index = connectedPartsI.splice(connectedParts.indexOf(m_piece), 1)[0];
		var m_wheels = connectedPartsWheels.splice(connectedParts.indexOf(m_piece), 1)[0];
		var m_springs = connectedPartsSprings.splice(connectedParts.indexOf(m_piece), 1)[0];
		connectedParts.splice(connectedParts.indexOf(m_piece), 1);
		// Create two bodies from one.
		var f1 = boxCar.m_fixtureList;
		var f1s = f1.m_shape;
		if (!f1.m_shape)
			return;
		if (!f1.getBody())
			return;
		var index = connectedParts.indexOf(f1);
		var body1 = f1.getBody();
		var center = body1.getWorldCenter();
		if (m_wheels[1]) {
			for (var j = 0; j < m_wheels[1].length; j++) {
				connectedSpringsOld.push(springs.splice(springs.indexOf(m_springs[1][j].m_bodyB), 1)[0]);
				connectedWheelsOld.push(wheels.splice(wheels.indexOf(m_wheels[1][j].m_bodyB), 1)[0]);
				world.destroyJoint(m_wheels[1][j]);
				world.destroyJoint(m_springs[1][j]);
			}
		}
		var prevIndexInList = connectedPartsI.indexOf((m_index + carDNA.bodyParts - 1) % carDNA.bodyParts);
		if (prevIndexInList >= 0 && doubleWheelParent) {
			connectedPartsWheels[prevIndexInList][1] = m_wheels[0];
			connectedPartsSprings[prevIndexInList][1] = m_springs[0];

			for (var j = 0; j < m_springs[0].length; j++) {
				m_springs[0][j].m_bodyA = connectedParts[prevIndexInList].m_body;
			}
		} else {
			for (var j = 0; j < m_wheels[0].length; j++) {
				connectedWheelsOld.push(wheels.splice(wheels.indexOf(m_wheels[0][j].m_bodyB), 1)[0]);
				world.destroyJoint(m_wheels[0][j]);
				connectedSpringsOld.push(wheels.splice(springs.indexOf(m_springs[0][j].m_bodyB), 1)[0]);
				world.destroyJoint(m_springs[0][j]);
			}
		}
		var renderData = m_piece.render;
		boxCar.destroyFixture(m_piece);
		m_piece = null;
		var body2 = world.createBody({
			type: 'dynamic',
			position: body1.getPosition(),
			angle: body1.getAngle()
		});
		m_piece = body2.createFixture(m_shape, bodyBrokeShapeDef);
		m_piece.render = renderData;
		m_piece.render.layer = 2;
		connectedPartsOld.push(m_piece);
		// Compute consistent velocities for new bodies based on cached velocity.
		var center1 = body1.getWorldCenter();
		var center2 = body2.getWorldCenter();
		var velocity1 = Vec2.add(m_velocity, Vec2.cross(m_angularVelocity, Vec2.sub(center1, center)));
		var velocity2 = Vec2.add(m_velocity, Vec2.cross(m_angularVelocity, Vec2.sub(center2, center)));
		body1.setAngularVelocity(m_angularVelocity);
		body1.setLinearVelocity(velocity1);
		body2.setAngularVelocity(m_angularVelocity);
		body2.setLinearVelocity(velocity2);
		boxCar.resetMassData();
	}
}
window.setInterval(resetGround, 1000);
function tick() {
	genGround();
	var cMass = boxCar.m_mass;
	try {
		for (var j = 0; j < wheelJoints.length; j++) {
			if (wheelJoints[j].m_bodyB) {
				if (wheelJoints[j].m_bodyB.m_mass) {
					cMass += wheelJoints[j].m_bodyB.m_mass;
				}
			}
			if (springJoints[j].m_bodyB) {
				cMass += springJoints[j].m_bodyB.m_mass;
			}
		}
	} catch (e) { }
	cMass = cMass / carScale / carScale;
	var torque = MASS_MULT * GRAVITY / wheelJoints.length * cMass;
	var baseSpringForce = 7.5 * cMass / 6;
	for (var j = 0; j < wheelJoints.length; j++) {
		//wheelJoints[j].setMotorSpeed(-SPEED);
		//wheelJoints[j].enableMotor(true);
		if (wheelJoints[j].m_bodyB) {
			wheelJoints[j].setMaxMotorTorque(torque * 2);
		}
		springJoints[j].setMotorSpeed(SPEED);
		springJoints[j].enableMotor(true);
		if (springJoints[j].m_bodyB) {
			var force = 0;
			springJoints[j].setMaxMotorForce(baseSpringForce + 40 / 40 * baseSpringForce * Math.pow(5 * springJoints[j].getJointTranslation() / carScale / (carDNA.maxRadius * carScale / 3), 2));
			//console.log(springJoints[j].getJointTranslation());
			springJoints[j].setMotorSpeed(-20 / 20 * 5 * springJoints[j].getJointTranslation() / carScale / (carDNA.maxRadius * carScale / 3));

			//springJoints[j].setMaxMotorForce(force  );
		}
	}
	restartCurrent++;
	currentTicks++;
	var cp = boxCar.getPosition();
	camera.x = cp.x;
	camera.y = -cp.y;
	updateProgress(cp.x);
	if (restartCurrent >= restartTicks || connectedParts.length < 3) {
		switchCar();
	}
	if (partsToBreak.length > 0) {
		for (var i = 0; i < partsToBreak.length; i++) {
			Break(partsToBreak[i]);
		}
		partsToBreak = [];
	}
	m_velocity = boxCar.getLinearVelocity();
	m_angularVelocity = boxCar.getAngularVelocity();
}
function loop() {

	for (var i = 0; i < simSpeed; i++) {
		if (!paused) {
			if (autoFast !== document
				.getElementById("switch-1")
				.checked) {
				simSpeed = 1;
			}
			autoFast = document
				.getElementById("switch-1")
				.checked;
			//autoFast=false;
			if (autoFast) {
				if (carScore > worstScore()) {
					simSpeed = 1;
				} else {
					simSpeed = 100;
				}
			} else {
				simSpeed = document.getElementById("sim-speed").value;
			}
			document.querySelectorAll(".score-text")[0].innerText = "Score: " + Math.round(Math.max(boxCar.getPosition().x, carScore) * 100) / 100;
			world.step( 1 / 75);
			var tickStart = new Date().getTime();
			tick();
			var t = (new Date().getTime() - tickStart);
			//tickSpeed=t/2+tickSpeed/2;
			//console.log(tickSpeed/2+t/2,t);
		}
	}
	window.setTimeout(loop, 0);

}
function importCarFromDialog() {
	var carCode = document.getElementById("car-code-area").value;
	var car = new Car().importCar(carCode);
	if (car) {
		importCar(carCode);
		closeImportDialog();
	}
}
function closeImportDialog() {
	document.getElementById("car-code-area").value = "";
	var imptT = document.querySelector(".import-dialog .mdl-textfield");
	imptT.MaterialTextfield.checkDirty();
	paused = false;

	document.querySelector("div.import-dialog").setAttribute("open", "false");
}
function openImportDialog() {
	document.getElementById("car-code-area").value = "";
	var imptT = document.querySelector(".import-dialog .mdl-textfield");
	imptT.MaterialTextfield.checkDirty();
	paused = true;
	document.querySelector("div.import-dialog").setAttribute("open", "true");
}
loop();
//window.setInterval(loop, 100/60);
window.addEventListener("resize", function () {
	c.width = window.innerWidth;
	c.height = window.innerHeight;
});

var patternC = document.createElement("canvas");
var patternCtx = patternC.getContext("2d");
var scale = Math.min(c.width / 40, c.height / 40);
function render() {

	scale = Math.min(c.width / 40, c.height / 40);
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, c.width, c.height);
	ctx.fillStyle = "#2196F3";


	ctx.fillRect(0, 0, c.width, c.height);
	ctx.translate(-camera.x * scale, -camera.y * scale);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = "multiply";
	ctx.fillStyle = ctx.createPattern(paperTex, "repeat");
	ctx.fillRect(camera.x * scale, camera.y * scale, c.width, c.height);
	ctx.globalCompositeOperation = "source-over";
	ctx.globalAlpha = 1.0;
	ctx.translate(camera.x * scale, camera.y * scale);
	ctx.translate(c.width / 2, c.height / 2);
	ctx.scale(1, -1);
	ctx.translate(-camera.x * scale, camera.y * scale);
	var renderLayers = [];
	function addToLayer(layer, f, b) {
		var found = false;
		for (var i = 0; i < renderLayers.length; i++) {
			if (renderLayers[i].index == layer) {
				found = true;
				renderLayers[i].pairs.push({ f: f, b: b });
			}
		}
		if (!found) {
			renderLayers.push({ index: layer, pairs: [{ f: f, b: b }] });
		}
	}
	for (var body = world.getBodyList(); body; body = body.getNext()) {
		for (var f = body.getFixtureList(); f; f = f.getNext()) {
			var layer = 0;
			if (f.render && f.render.layer) {
				layer = f.render.layer;
			}
			addToLayer(layer, f, body);
		}
	}
	renderLayers.sort(function (a, b) {
		return a.index - b.index;
	});
	for (var i = 0; i < renderLayers.length; i++) {
		for (var j = 0; j < renderLayers[i].pairs.length; j++) {
			var f = renderLayers[i].pairs[j].f;
			var body = renderLayers[i].pairs[j].b;
			ctx.strokeStyle = f.render && f.render.stroke
				? f.render.stroke
				: "#000000";
			ctx.fillStyle = f.render && f.render.fill
				? f.render.fill
				: "rgba(0,0,0,0)";
			ctx.lineWidth = 2;
			ctx.save();
			if (f.m_shape.getType() == "polygon")
				ctx.translate(0, -4);
			if (f.m_shape.getType() == "circle")
				ctx.translate(0, -2);
			ctx.translate(f.m_body.m_xf.p.x * scale, f.m_body.m_xf.p.y * scale);
			ctx.rotate(Math.atan2(f.m_body.m_xf.q.s, f.m_body.m_xf.q.c));
			if (f.m_shape.getType() == "polygon")
				polygonS(f.m_shape);
			if (f.m_shape.getType() == "circle")
				circleS(f.m_shape);
			if (f.m_shape.getType() == "edge")
				edge(f.m_shape);
			ctx.restore();
		}

		for (var j = 0; j < renderLayers[i].pairs.length; j++) {
			var f = renderLayers[i].pairs[j].f;
			var body = renderLayers[i].pairs[j].b;
			ctx.strokeStyle = f.render && f.render.stroke
				? f.render.stroke
				: "#000000";
			ctx.fillStyle = f.render && f.render.fill
				? f.render.fill
				: "rgba(0,0,0,0)";
			ctx.lineWidth = 1;
			ctx.save();
			ctx.translate(f.m_body.m_xf.p.x * scale, f.m_body.m_xf.p.y * scale);
			ctx.rotate(Math.atan2(f.m_body.m_xf.q.s, f.m_body.m_xf.q.c));
			if (f.m_shape.getType() == "polygon")
				polygon(f.m_shape);
			if (f.m_shape.getType() == "circle")
				circle(f.m_shape);

			ctx.restore();
			ctx.strokeStyle = "rgba(0,0,0,0)";
			ctx.globalAlpha = 1;
			ctx.globalCompositeOperation = "multiply";
			ctx.fillStyle = ctx.createPattern(paperTex, "repeat");
			ctx.lineWidth = 1;
			ctx.save();
			ctx.translate(f.m_body.m_xf.p.x * scale, f.m_body.m_xf.p.y * scale);
			ctx.rotate(Math.atan2(f.m_body.m_xf.q.s, f.m_body.m_xf.q.c));
			if (f.m_shape.getType() == "polygon")
				polygon(f.m_shape);
			if (f.m_shape.getType() == "circle")
				circle(f.m_shape);
			ctx.restore();
			ctx.globalCompositeOperation = "source-over";
			ctx.globalAlpha = 1.0;
		}
	}
	window.requestAnimationFrame(render);
}
window.requestAnimationFrame(render);

function circleS(shape, f) {
	ctx.beginPath()
	ctx.shadowBlur = 2;
	ctx.fillStyle = "rgba(0,0,0,.26)";
	ctx.shadowColor = "rgba(0,0,0,.26)";
	ctx.shadowOffsetY = 0;
	ctx.shadowOffsetX = 0;
	ctx.arc(shape.m_p.x * scale, shape.m_p.y * scale, shape.m_radius * scale, 0, 2 * Math.PI);
	//ctx.stroke();
	ctx.fill();
	/*ctx.beginPath()
	ctx.strokeStyle = "white";
	ctx.moveTo(shape.m_p.x, shape.m_p.y);
	ctx.lineTo(shape.m_p.x + shape.m_radius, shape.m_p.y);
	ctx.stroke();*/
}
function circle(shape, f) {
	ctx.beginPath()
	ctx.shadowBlur = 0;
	ctx.shadowColor = "rgba(0,0,0,0)";
	ctx.shadowOffsetY = 0;
	ctx.shadowOffsetX = 0;
	ctx.arc(shape.m_p.x * scale, shape.m_p.y * scale, shape.m_radius * scale, 0, 2 * Math.PI);
	//ctx.stroke();
	ctx.fill();
	ctx.beginPath()
	ctx.strokeStyle = "white";
	ctx.moveTo(shape.m_p.x * scale, shape.m_p.y * scale);
	ctx.lineTo(shape.m_p.x * scale + shape.m_radius * scale, shape.m_p.y * scale);
	ctx.stroke();
}
function edge(shape, f) {
	ctx.beginPath();
	ctx.moveTo(shape.m_vertex1.x * scale, shape.m_vertex1.y * scale);
	ctx.lineTo(shape.m_vertex2.x * scale, shape.m_vertex2.y * scale);
	ctx.stroke();
}

function polygon(shape, f) {
	ctx.lineJoin = "round"
	ctx.beginPath();
	ctx.moveTo(shape.m_vertices[0].x * scale, shape.m_vertices[0].y * scale);
	for (var i = 1; i < shape.m_vertices.length; i++) {
		ctx.lineTo(shape.m_vertices[i].x * scale, shape.m_vertices[i].y * scale);
	}
	ctx.shadowBlur = 0;
	ctx.shadowColor = "rgba(0,0,0,0)";
	ctx.shadowOffsetY = 0;
	ctx.shadowOffsetX = 0;
	ctx.closePath();
	ctx.stroke();
	ctx.fill();
}
function polygonS(shape, f) {
	ctx.lineJoin = "round"
	ctx.beginPath();
	ctx.moveTo(shape.m_vertices[0].x * scale, shape.m_vertices[0].y * scale);
	for (var i = 1; i < shape.m_vertices.length; i++) {
		ctx.lineTo(shape.m_vertices[i].x * scale, shape.m_vertices[i].y * scale);
	}
	ctx.shadowBlur = 4;
	ctx.fillStyle = "rgba(0,0,0,.26)";
	ctx.shadowColor = "rgba(0,0,0,.26)";
	ctx.shadowOffsetY = 0;
	ctx.shadowOffsetX = 0;
	ctx.closePath();
	//ctx.stroke();
	ctx.fill();
}
new Clipboard('.score-table tbody tr');
new Clipboard('.copy-best-button', {
  text: function(trigger) {
    return exportBestCar();
  }
});