export const REALMS = [
  { id: 'unranked', name: '无品', order: 0 },
  { id: 'small_star', name: '小星位', order: 1 },
  { id: 'middle_star', name: '中星位', order: 2 },
  { id: 'great_star', name: '大星位', order: 3 },
  { id: 'small_heaven', name: '小天位', order: 4 },
  { id: 'middle_heaven', name: '中天位', order: 5 },
  { id: 'great_heaven', name: '大天位', order: 6 },
  { id: 'shenxiao', name: '神霄位', order: 7 }
];

export function getRealm(id) {
  return REALMS.find(realm => realm.id === id) || REALMS[0];
}

export function getRealmName(id) {
  return getRealm(id).name;
}
