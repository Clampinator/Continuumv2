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

    const allPoints = [...levelNodes, { ...nowNode, type: "current" }];

    for (let i = 0; i < allPoints.length - 1; i++) {
      const p1 = allPoints[i];
      const p2 = allPoints[i + 1];

      if (!_isValidNumber(p1.age) || !_isValidNumber(p1.time) || !_isValidNumber(p2.age) || !_isValidNumber(p2.time)) {
        continue;
      }

      const x1 = _screenX(viewState, p1.age);
      const y1 = _screenY(viewState, p1.time);
      const x2 = _screenX(viewState, p2.age);
      const y2 = _screenY(viewState, p2.time);

      if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2)) {
        continue;
      }

      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", `M ${x1} ${y1} L ${x2} ${y2}`);
      path.setAttribute("fill", "none");

      // Segment classification
      const isVertical = Math.abs(x2 - x1) < 0.1;
      const outgoingType = p1.outgoingType || p1.type;

      // REST overrides everything
      if (p1.isRestStart) {
        path.classList.add("graph-segment-rest");
        path.setAttribute("stroke", "#00ff00");
        path.setAttribute("stroke-width", "2");
      } else if (isVertical || outgoingType === "span") {
        path.classList.add("graph-segment-span");
        path.setAttribute("stroke", "#ff00ff");
        path.setAttribute("stroke-width", "2");
        path.setAttribute("stroke-dasharray", "4,4");
      } else {
        path.classList.add("graph-segment-level");
        path.setAttribute("stroke", "#00ccff");
        path.setAttribute("stroke-width", "2");
      }

      group.appendChild(path);
    }
  },

  drawDragLine(dragGroup, viewState, dragPreview) {
    if (!dragGroup) return;
    dragGroup.innerHTML = "";
    if (!dragPreview) return;

    const from = dragPreview.from;
    const to = dragPreview.to;

    if (!_isValidNumber(from?.age) || !_isValidNumber(from?.time) || !_isValidNumber(to?.age) || !_isValidNumber(to?.time)) {
      return;
    }

    const x1 = _screenX(viewState, from.age);
    const y1 = _screenY(viewState, from.time);
    const x2 = _screenX(viewState, to.age);
    const y2 = _screenY(viewState, to.time);

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", `M ${x1} ${y1} L ${x2} ${y2}`);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-width", "2");

    if (dragPreview.isRest) {
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