/*
 * jsClock - A simple analog clock with pomodoro timer
 * Copyright (c) 2025 Silvino Rodrigues
 */

function drawClockFace() {
  const svg = document.getElementById('clock');
  const clockFace = document.getElementById('clock-face');

  // Draw clock face
  let circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  setCircleAttributes(circle, 100, 100, 90, "clock-face", 1);
  clockFace.appendChild(circle);

  // Draw hour markers
  drawHourMarkers();

  // Draw minute markers
  drawMinuteMarkers();
}

function setLineAttributes(line, x1, y1, x2, y2, className, strokeWidth, rotate = 0) {
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.setAttribute("class", className);
  line.setAttribute("stroke-width", strokeWidth);
  if (rotate !== 0) {
    line.setAttribute("transform", `rotate(${rotate} 100 100)`);
  }
}

function drawHourMarkers() {
  const svg = document.getElementById('clock');
  const markers = document.getElementById('markers');

  // 12 o'clock position
  for (let i = 0; i < 2; i++) {
    let line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    setLineAttributes(line, 100 + (i == 0 ? -2 : 2), 4.75, 100 + (i == 0 ? -2 : 2), 18, "hour-marker", 2);
    markers.appendChild(line);
  }

  // 1 to 11 o'clock positions
  for (let i = 1; i < 12; i++) {
    let line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    setLineAttributes(line, 100, 12, 100, 18, "hour-marker", 2, i * 30);
    markers.appendChild(line);
  }

  // 1 to 11 o'clock numbers
  for (let i = 1; i < 12; i++) {
    let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", "100");
    text.setAttribute("y", "7");
    text.setAttribute("class", "face-seconds");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.textContent = i * 5;        
    text.setAttribute("transform", `rotate(${i * 30} 100 100)`);
    markers.appendChild(text);
  }

  // 5 minute markers
  for (let i = 0; i < 60; i++) {
    if (i % 5 !== 0) {
      let line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      setLineAttributes(line, 100, 5, 100, 10, "minute-marker", 1, i * 6);
      markers.appendChild(line);
    }
  }
}

// Resize the clock
function handleResize() {
  const size = Math.min(document.body.clientWidth, document.body.clientHeight) / 1.5;
  let element = document.getElementById("clock");
  element.setAttribute("width", size.toFixed(3));
  element.setAttribute("height", size.toFixed(3));
}

// Draw the clock
document.addEventListener("DOMContentLoaded", function() {
  drawHourMarkers();
  handleResize();
  window.addEventListener("resize", handleResize);
});

// Draw pomodoro segments
function setRingSegmentPathById(id, startAngle, endAngle) {
  // Convert angles from degrees to radians
  const startRad = (startAngle - 90) * Math.PI / 180; // -90 to start at 12 o'clock
  const endRad = (endAngle - 90) * Math.PI / 180;
  
  const radius = 78;
  
  // Calculate start and end points
  const startX = (100 + radius * Math.cos(startRad)).toFixed(3);
  const startY = (100 + radius * Math.sin(startRad)).toFixed(3);
  const endX = (100 + radius * Math.cos(endRad)).toFixed(3);
  const endY = (100 + radius * Math.sin(endRad)).toFixed(3);
  
  // Determine if we need the large arc flag
  const diff = (endAngle < startAngle) ? (startAngle - endAngle) : (endAngle - startAngle);
  const largeArcFlag = diff > 180 ? "1" : "0";
  
  // Create the SVG path with both large arc and sweep flags
  const pathData =
    `M ${startX} ${startY} ` +
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
  
  // Update the path element
  let element = document.getElementById(id);
  if ("visible" !== element.getAttribute("visibility")) {
    element.setAttribute("visibility", "visible");
  }
  element.setAttribute("d", pathData);
}

// Update analog clock
function updateClock(now) {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const hourAngle = ((hours % 12) * 30) + (minutes * 0.5);
  const minuteAngle = (minutes * 6) + (seconds * 0.1);
  const secondAngle = seconds * 6;

  transformRotateById("hour-hand", hourAngle);
  transformRotateById("hour-hand-2", hourAngle + 180);
  transformRotateById("minute-hand", minuteAngle);
  transformRotateById("minute-hand-2", minuteAngle + 180);
  transformRotateById("second-hand", secondAngle);
  transformRotateById("second-hand-2", secondAngle + 180);

  const month = now.getMonth();
  const day = now.getDate();
  const weekday = now.getDay();

  const monthStr = months[month].substring(0, 3).toUpperCase();
  const weekdayStr = days[weekday].substring(0, 3).toUpperCase();

  setContentById("dow-str", weekdayStr);
  setContentById("day-str", day);
  setContentById("month-str", monthStr);
}

window.updateClockAlt = updateClock;

// Update pomodoro ring
function updatePomodoro(now) {
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const multiplier = 2;
  const splitAt = 25 / 30;  // 25 min ON, 5 min REST
  const maxVal = (60 * 60) / multiplier;

  var progress = (minutes * 60) + seconds;
  while (progress > maxVal) progress -= maxVal;
  const percentage = progress / maxVal;

  if (percentage <= splitAt) {
    setRingSegmentPathById("p1", 0, percentage * 360);
    setRingSegmentPathById("p2", percentage * 360, splitAt * 360);
    setVisibilityById("p3", false);
    setVisibilityById("p4", false);
    setRingSegmentPathById("p5", splitAt * 360, 360);
  } else {  
    setVisibilityById("p1", false);
    setVisibilityById("p2", false);
    setRingSegmentPathById("p3", splitAt * 360, percentage * 360);
    setRingSegmentPathById("p4", percentage * 360, 360);
    setRingSegmentPathById("p5", 0, splitAt * 360);
  }
}

window.updatePomodoroAlt = updatePomodoro;
