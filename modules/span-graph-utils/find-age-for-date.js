
export function findAgeForDate(actor, dateObj) {
    if (!dateObj) return null;
    const eras = actor.system.eras || {};

    const sortedEras = Object.entries(eras).sort(([,a], [,b]) => {
        const da = new Date(a.dateFrom);
        const db = new Date(b.dateFrom);
        return da - db;
    });

    if (sortedEras.length === 0) return null;

    if (dateObj < new Date(sortedEras[0][1].dateFrom)) {
        return sortedEras[0][0];
    }

    for (let i = 0; i < sortedEras.length; i++) {
        const [id, era] = sortedEras[i];
        const start = new Date(era.dateFrom);
        if (i === sortedEras.length - 1) return id;
        const [, nextEra] = sortedEras[i+1];
        const nextStart = new Date(nextEra.dateFrom);
        if (dateObj >= start && dateObj < nextStart) return id;
    }
    return null;
}
