/*
 * jsClock - A simple digital clock with pomodoro timer
 * Copyright (c) 2017-2025 Silvino Rodrigues
 */

const months = new Array(
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December' );
const days = new Array(
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday' );
const CLOCK_REFRESH = 1000;
const COPYRIGHT_SHOW_DURATION = 1000;
const COPYRIGHT_HIDE_DURATION = 5000;
const DEBOUNCE_POLL_RATE = 200; // 25 minutes

var isDigital = document.body.id !== 'analog';
var isVisible = true;
var isPomodoroOn = false;
const oldTitle = document.title;
var wakeLockSupported = false;
let wakeLock = null;
let clockInterval = null;

var lastMousePosition = { x: null, y: null };
var debounceTimeout = null;
var isMouseMoving = false;
var copyrightTimeout = null;
var isCopyrightVisible = false;

function isCheckboxCheckedById(checkboxId) {
  const checkbox = document.getElementById(checkboxId);
  if (checkbox && checkbox.type === 'checkbox') {
    return checkbox.checked;
  }
  return false;
}

function setContentById(elementId, newValue) {
  const element = document.getElementById(elementId);
  if (element && newValue !== element.textContent) {
    element.textContent = newValue;
  }
}

function updateClock(now) {
  var hours = now.getHours();
  const tHourStr = (hours >= 12) ? "pm" : "am";
  if (hours > 12) hours -= 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const timeStr = String(hours).padStart(2, '0') + ":" + String(minutes).padStart(2, '0');
  const secsStr = String(seconds).padStart(2, '0');

  setContentById("time-str", timeStr);
  setContentById("secs-str", secsStr);
  setContentById("hr12-str", tHourStr);

  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const weekday = now.getDay();

  const fullDateStr = days[weekday] + ", " + day + " " + months[month] + " " + year;
  setContentById("date-str", fullDateStr);
}

function transformRotateById(id, angle) {
  const element = document.getElementById(id);
  if (element) {
    element.setAttribute("transform", `rotate(${angle} 100 100)`);
  }
}

function setVisibilityById(id, visible = true) {
  const element = document.getElementById(id);
  if (element) {
    let value = visible ? "visible" : "hidden";
    if (value !== element.getAttribute("visibility")) {
      element.setAttribute("visibility", value);
    }
  }
}

function setXAndWidthById(id, x, width) {
  const element = document.getElementById(id);
  if (element) {
    let newX = x.toFixed(3);
    let newWidth = width.toFixed(3);

    setVisibilityById(id, true);  // assume you want to see it
    if (element.getAttribute("x") !== newX) {
      element.setAttribute("x", newX);
    }
    if (element.getAttribute("width") !== newWidth) {
      element.setAttribute("width", newWidth);
    }
  }
}

function updatePomodoro(now) {
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const maxVal = 30 * 60;
  const divCut = 25 / 30;  // 25 min ON, 5 min REST
  const svgWidth = 300;

  var progress = (minutes * 60) + seconds;
  while (progress > maxVal) progress -= maxVal;
  const percentage = progress / maxVal;

  if (percentage <= divCut) {
    let cut = percentage;
    setXAndWidthById("p1", 0, cut * svgWidth);
    setXAndWidthById("p2", cut * svgWidth, (divCut - cut) * svgWidth);
    setVisibilityById("p3", false);
    setVisibilityById("p4", false);
    setXAndWidthById("p5", divCut * svgWidth, (1 - divCut) * svgWidth);
  } else {
    let cut = percentage - divCut;
    setVisibilityById("p1", false);
    setVisibilityById("p2", false);
    setXAndWidthById("p3", divCut * svgWidth, cut * svgWidth);
    setXAndWidthById("p4", (divCut + cut) * svgWidth, (1 - divCut + cut) * svgWidth);
    setXAndWidthById("p5", 0, divCut * svgWidth);
  }
}

function updateTitle(now) {
  const hours = now.getHours();
  const minutes = now.getMinutes();
        const title = String(hours).padStart(2, '0') + ":" + String(minutes).padStart(2, '0');
  if (title !== document.title) {
    document.title = title;
  }
}

async function updateAll() {
  if (isVisible) {
    const now = new Date();
    updateTitle(now);
    if (isDigital) {
      updateClock(now);
      if (isPomodoroOn) updatePomodoro(now);
    } else {
      window.updateClockAlt?.(now);
      if (isPomodoroOn) window.updatePomodoroAlt?.(now);
    }
  } else {
    if (oldTitle !== document.title) {
      document.title = oldTitle;
    }
  }
}

async function visibilityChange() {
  if (document.visibilityState === "hidden") { 
    isVisible = false;
  } else if (document.visibilityState === "visible") {
    isVisible = true;
  } else {
    isVisible = true;  // what's your fallback choice?
  }

  if (wakeLockSupported) {
    if (isVisible) {
      if (wakeLock === null) {
        try {
          wakeLock = await navigator.wakeLock.request("screen");
          wakeLock.addEventListener("release", () => {
            wakeLock = null;
          });
        } catch (err) {
          console.error( `Wake Lock Error: ${err.name}, ${err.message}` );
        }
      }
    } else {
      // !isVisible
      if (wakeLock !== null) {
        wakeLock.release().then(() => {
          wakeLock = null;
        });
      }
    }
  }

  updateAll();
}

function handleCopyrightVisibility() {
  const copyrightElement = document.getElementById('copyright');
  if (isCopyrightVisible) {
    copyrightElement.classList.remove('visible');
    document.body.style.cursor = 'none';
    isCopyrightVisible = false;
  } else if (isMouseMoving) {
    copyrightElement.classList.add('visible');
    document.body.style.cursor = 'default';
    isCopyrightVisible = true;
  }
  clearTimeout(copyrightTimeout);
  copyrightTimeout = null; // must reset to pass `=== null` test
}

function handleDebounce() {
  if (null !== debounceTimeout) clearTimeout(debounceTimeout);
  debounceTimeout = null;
  isMouseMoving = false;
  if (isCopyrightVisible) {
    if (null !== copyrightTimeout) clearTimeout(copyrightTimeout); // reset
    copyrightTimeout = setTimeout(handleCopyrightVisibility, COPYRIGHT_HIDE_DURATION);  
  }
}

function handleMouseMove(event) {
  let eventX = (null === event) ? null : event.clientX;
  let eventY = (null === event) ? null : event.clientY;
  if (
    lastMousePosition.x === null ||
    lastMousePosition.y === null ||
    (lastMousePosition.x !== eventX || lastMousePosition.y !== eventY)
  ) {
    isMouseMoving = true;
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(handleDebounce, DEBOUNCE_POLL_RATE);
    lastMousePosition.x = eventX;
    lastMousePosition.y = eventY;
    if (!isCopyrightVisible && copyrightTimeout === null) {
      copyrightTimeout = setTimeout(handleCopyrightVisibility, COPYRIGHT_SHOW_DURATION);  
    }
  }
}

function handleKeyEvent(event) {
  handleMouseMove(null);
}

// Add this to your existing DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", function() {
  // ... existing code ...


  // ... rest of the existing code ...
});

function handleDoubleClick() {
  if (!document.fullscreenElement) {
    let element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else {
      console.error("Fullscreen API not supported");
    }      
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}

/**
 * Run on first load
 */
document.addEventListener("DOMContentLoaded", function() {
  isPomodoroOn = localStorage.getItem("isPomodoroOn") === "true";
  document.getElementById("pomodoro-checkbox").checked = isPomodoroOn;
  updateAll(); // Initialize clock immediately, first time run

  if ("wakeLock" in navigator) {
    wakeLockSupported = true;
    // console.info("Screen Wake Lock API is supported");
    visibilityChange(); // first time run
  } else {
    console.warn("Screen Wake Lock API is not supported on this browser");
  }

  document.addEventListener("visibilitychange", visibilityChange);
  window.addEventListener("resize", visibilityChange);
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("keydown", handleKeyEvent);
  document.addEventListener("keyup", handleKeyEvent);
  document.addEventListener("dblclick", handleDoubleClick);

  document.getElementById("pomodoro-checkbox").addEventListener("change", function() {
    let wasPomodoroOn = isPomodoroOn;
    if (wasPomodoroOn !== this.checked) {
      isPomodoroOn = this.checked;
      localStorage.setItem("isPomodoroOn", isPomodoroOn);
      if (isPomodoroOn) {
        let now = new Date();
        if (isDigital) {
          updatePomodoro(now);
        } else {
          window.updatePomodoroAlt?.(now);
        }
      } else {
        for (let i = 1; i <= 5; i++) setVisibilityById("p"+i, false);
      }
    }
  });

  clockInterval = setInterval(updateAll, CLOCK_REFRESH); // Start the update loop
});
