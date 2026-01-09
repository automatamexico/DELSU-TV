// src/utils/starsFromViews.js
export function starsFromViews(views = 0) {
  // Umbrales que pediste:
  // 0★: 0–10
  // 1★: 11–100
  // 3★: 101–200
  // 4★: 201–300
  // 5★: >300
  if (views <= 10) return 0;
  if (views <= 100) return 1;
  if (views <= 200) return 3;
  if (views <= 300) return 4;
  return 5;
}
