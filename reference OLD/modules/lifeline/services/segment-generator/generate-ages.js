/*
Calculates bounds for Era columns using the absolute Subjective Ages of nodes.
sortedEras - All eras from actor data.
*/
export function generateEras(sortedEras) {
    // We derive the visual bounds for background columns from the data-stored 'age'.
    return sortedEras.map(era => {
        const startAge = Number(era.age) || 0;
        // Find approximate duration or use 1 year default
        const d1 = new Date((era.dateFrom || "") + "T00:00:00");
        const d2 = new Date((era.dateTo || "") + "T00:00:00");
        let duration = 31536000; // 1 year fallback

        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
            duration = Math.max(0, (d2.getTime() - d1.getTime()) / 1000);
        }

        return {
            id: era.id,
            path: era.path,
            name: era.name,
            startAgeSeconds: startAge,
            endAgeSeconds: startAge + duration
        };
    }).sort((a, b) => a.startAgeSeconds - b.startAgeSeconds);
}