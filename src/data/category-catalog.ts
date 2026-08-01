import { staticCategories } from '@/data/static-categories';
import type { LiveCategory } from '@/types';

const staticOrder = new Map(staticCategories.map((category, index) => [category.categoryKey, index]));

export function normalizedSearchText(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s+/g, '');
}

export function mergeCategoryCatalog(remote: LiveCategory[] = []) {
  const merged = new Map(staticCategories.map((category) => [category.categoryKey, category]));
  for (const category of remote) {
    const fallback = merged.get(category.categoryKey);
    merged.set(category.categoryKey, {
      ...fallback,
      ...category,
      categoryValue: category.categoryId === 'talk' ? '저챗' : category.categoryValue,
    });
  }
  return [...merged.values()].sort((left, right) => (
    (staticOrder.get(left.categoryKey) ?? Number.MAX_SAFE_INTEGER)
      - (staticOrder.get(right.categoryKey) ?? Number.MAX_SAFE_INTEGER)
    || left.categoryValue.localeCompare(right.categoryValue, 'ko-KR')
  ));
}
