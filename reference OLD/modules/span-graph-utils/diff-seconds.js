
export function diffSeconds(dateA, dateB) {
    return (dateB.getTime() - dateA.getTime()) / 1000;
}
