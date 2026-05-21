const PRIORITY_LABELS = {
  normal: 'Normal',
  student_urgent: 'Student',
  travel_emergency: 'Travel',
  hospital_emergency: 'Hospital',
  vip: 'VIP',
};

export function getPriorityDisplay(order) {
  const selectedType = String(
    order?.order_type || order?.priority_type || order?.priorityLevel || 'normal'
  ).toLowerCase();

  if (PRIORITY_LABELS[selectedType]) {
    return PRIORITY_LABELS[selectedType];
  }

  const fallbackLevel = String(order?.priority_level || 'normal').toLowerCase();
  return PRIORITY_LABELS[fallbackLevel] || fallbackLevel.replace(/_/g, ' ') || 'Normal';
}

export function normalizeOrderItems(rawItems) {
  const parsed = typeof rawItems === 'string' ? JSON.parse(rawItems) : rawItems;
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.map((item, index) => {
    const id = item.id ?? item.menu_item_id ?? item.item_id ?? `${item.name || 'item'}-${index}`;
    const quantity = Number(item.quantity ?? item.qty ?? 1);
    const price = Number(item.price ?? item.unit_price ?? item.total_price ?? 0);

    return {
      ...item,
      id,
      name: item.name || item.item_name || 'Menu item',
      price: Number.isFinite(price) ? price : 0,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    };
  });
}
