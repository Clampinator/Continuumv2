
export function getObjectiveDateFromSubjectiveX(xSubjective, points, dob) {
    if (!points || points.length === 0) {
        const dobTime = (dob || new Date("0000-01-01")).getTime();
        return new Date(dobTime + xSubjective * 1000);
    }
    if (xSubjective <= points[0].x) return new Date(points[0].y);
    const lastPoint = points[points.length - 1];
    if (xSubjective >= lastPoint.x) return new Date(lastPoint.y + (xSubjective - lastPoint.x) * 1000);
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i], p2 = points[i+1];
        if (xSubjective >= p1.x && xSubjective < p2.x) {
            if (p2.x === p1.x) return new Date(p2.y); 
            const ratio = (xSubjective - p1.x) / (p2.x - p1.x);
            return new Date(p1.y + ratio * (p2.y - p1.y));
        }
    }
    return new Date(lastPoint.y);
}
