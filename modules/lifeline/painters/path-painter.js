const svgNS = "http://www.w3.org/2000/svg";

function _screenX(viewState, age) {
  return (age * viewState.scaleX) + viewState.x;
}

function _screenY(viewState, time) {
  return (time * viewState.scaleY) + viewState.y;
}

function _isValidNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * PathPainter
 * - LEVEL segments: cyan
 * - SPAN segments: magenta dashed (vertical discontinuity)
 * - REST segments: green (override)
 */
export const PathPainter = {
  drawLifeline(group, viewState, graphData) {
    if (!group) return;
    group.innerHTML = "";

    const levelNodes = graphData?.levelNodes || [];
    if (levelNodes.length === 0 && !viewState?.isDragging) return;

    const nowNode = graphData?.nowNode || { age: 0, time: 0, type: "current" };

    // AUTHORITY: Ensure we use eventAge/eventTime for the 'now' node fallback as well
    const nowAge = nowNode.eventAge !== undefined ? nowNode.eventAge : (nowNode.age || 0);
    const nowTime = nowNode.eventTime !== undefined ? nowNode.eventTime : (nowNode.time || 0);
    const normalizedNow = { ...nowNode, eventAge: nowAge, eventTime: nowTime, type: "current" };

    const allPoints = [...levelNodes, normalizedNow];

    for (let i = 0; i < allPoints.length - 1; i++) {
      const p1 = allPoints[i];
      const p2 = allPoints[i + 1];

      // AUTHORITY: Use eventAge and eventTime standard for all coordinate mapping.
      const age1 = p1.eventAge !== undefined ? p1.eventAge : p1.age;
      const time1 = p1.eventTime !== undefined ? p1.eventTime : p1.time;
      const age2 = p2.eventAge !== undefined ? p2.eventAge : p2.age;
      const time2 = p2.eventTime !== undefined ? p2.eventTime : p2.time;

      if (!_isValidNumber(age1) || !_isValidNumber(time1) || !_isValidNumber(age2) || !_isValidNumber(time2)) {
        continue;
      }

      const x1 = _screenX(viewState, age1);
      const y1 = _screenY(viewState, time1);

      let currentStartY = y1;

      // --- 1. HANDLE SPAN JUMP ---
      if (p1.eventIsSpan) {
          const arrivalY = p1.arrivalY || p1.arrivalTs || time1;
          const arrivalCy = _screenY(viewState, arrivalY);
          
          const spanPath = document.createElementNS(svgNS, "path");
          spanPath.setAttribute("d", `M ${x1} ${y1} L ${x1} ${arrivalCy}`);
          spanPath.classList.add("graph-segment-span");
          spanPath.setAttribute("fill", "none");
          spanPath.setAttribute("stroke", "#ff00ff");
          spanPath.setAttribute("stroke-width", "2");
          spanPath.setAttribute("stroke-dasharray", "4,4");
          group.appendChild(spanPath);

          // The NEXT diagonal rail segment MUST start from the arrival point.
          currentStartY = arrivalCy;
      }

      // --- 2. DRAW DIAGONAL RAIL SEGMENT ---
      const x2 = _screenX(viewState, age2);
      const y2 = _screenY(viewState, time2);

      const railPath = document.createElementNS(svgNS, "path");
      railPath.setAttribute("d", `M ${x1} ${currentStartY} L ${x2} ${y2}`);
      railPath.setAttribute("fill", "none");

      // REST overrides everything
      if (p1.isRestStart) {
        railPath.classList.add("graph-segment-rest");
        railPath.setAttribute("stroke", "#00ff00");
      } else {
        railPath.classList.add("graph-segment-level");
        railPath.setAttribute("stroke", "#00ccff");
      }
      railPath.setAttribute("stroke-width", "2");

      group.appendChild(railPath);
    }
  },

  drawDragLine(dragGroup, viewState, dragPreview) {
    if (!dragGroup) return;
    dragGroup.innerHTML = "";
    if (!dragPreview) return;

    const from = dragPreview.from;
    const to = dragPreview.to;

    // AUTHORITY: Use eventAge and eventTime standard
    const age1 = from.eventAge !== undefined ? from.eventAge : from.age;
    const time1 = from.eventTime !== undefined ? from.eventTime : from.time;
    const age2 = to.eventAge !== undefined ? to.eventAge : to.age;
    const time2 = to.eventTime !== undefined ? to.eventTime : to.time;

    if (!_isValidNumber(age1) || !_isValidNumber(time1) || !_isValidNumber(age2) || !_isValidNumber(time2)) {
      return;
    }

    const x1 = _screenX(viewState, age1);
    const y1 = _screenY(viewState, time1);
    const x2 = _screenX(viewState, age2);
    const y2 = _screenY(viewState, time2);

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", `M ${x1} ${y1} L ${x2} ${y2}`);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-width", "2");

    if (dragPreview.eventIsRest) {
      path.classList.add("graph-segment-rest");
      path.setAttribute("stroke", "#00ff00");
    } else if (dragPreview.type === "span") {
      path.classList.add("graph-segment-span");
      path.setAttribute("stroke", "#ff00ff");
      path.setAttribute("stroke-dasharray", "4,4");
    } else {
      path.classList.add("graph-segment-level");
      path.setAttribute("stroke", "#00ccff");
    }

    dragGroup.appendChild(path);
  }
};
