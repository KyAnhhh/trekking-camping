export function groupDestinations(tours = []) {
  const groups = new Map();
  for (const tour of tours) {
    const label = tour.location?.trim();
    if (!label || !tour.slug || tour.isActive === false) continue;
    const key = label.toLocaleLowerCase('vi');
    const group = groups.get(key) || { key, label, tours: [] };
    group.tours.push(tour);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.tours.length - a.tours.length || a.label.localeCompare(b.label, 'vi'));
}
