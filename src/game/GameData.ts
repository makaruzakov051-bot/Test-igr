import * as THREE from 'three';

// ============ WEAPON DATA ============
export interface WeaponData {
  id: string;
  name: string;
  type: 'pistol' | 'smg' | 'rifle' | 'shotgun' | 'dmr' | 'sniper' | 'mg' | 'melee';
  caliber: string;
  damage: number;
  fireRate: number; // rounds per minute
  magSize: number;
  reloadTime: number; // ms
  recoil: number;
  range: number;
  weight: number; // inventory slots
  invW: number;
  invH: number;
  automatic: boolean;
  spread: number;
}

export const WEAPONS: WeaponData[] = [
  { id: 'tt', name: 'ТТ', type: 'pistol', caliber: '7.62x25', damage: 35, fireRate: 400, magSize: 8, reloadTime: 2200, recoil: 0.03, range: 50, weight: 2, invW: 2, invH: 1, automatic: false, spread: 0.02 },
  { id: 'glock17', name: 'Glock-17', type: 'pistol', caliber: '9x19', damage: 28, fireRate: 500, magSize: 17, reloadTime: 1800, recoil: 0.02, range: 50, weight: 2, invW: 2, invH: 1, automatic: false, spread: 0.015 },
  { id: 'colt1911', name: 'Colt 1911', type: 'pistol', caliber: '.45 ACP', damage: 42, fireRate: 350, magSize: 7, reloadTime: 2500, recoil: 0.04, range: 50, weight: 2, invW: 2, invH: 1, automatic: false, spread: 0.025 },
  { id: 'deagle', name: 'Desert Eagle', type: 'pistol', caliber: '.50 AE', damage: 65, fireRate: 200, magSize: 7, reloadTime: 3000, recoil: 0.08, range: 60, weight: 3, invW: 2, invH: 2, automatic: false, spread: 0.03 },
  { id: 'mp5', name: 'MP5', type: 'smg', caliber: '9x19', damage: 25, fireRate: 800, magSize: 30, reloadTime: 2500, recoil: 0.015, range: 80, weight: 5, invW: 2, invH: 3, automatic: true, spread: 0.03 },
  { id: 'ppsh', name: 'ППШ-41', type: 'smg', caliber: '7.62x25', damage: 22, fireRate: 1000, magSize: 71, reloadTime: 4000, recoil: 0.025, range: 70, weight: 6, invW: 2, invH: 3, automatic: true, spread: 0.045 },
  { id: 'uzi', name: 'Uzi', type: 'smg', caliber: '9x19', damage: 24, fireRate: 600, magSize: 32, reloadTime: 2200, recoil: 0.02, range: 60, weight: 4, invW: 2, invH: 3, automatic: true, spread: 0.035 },
  { id: 'ak74', name: 'АК-74', type: 'rifle', caliber: '5.45x39', damage: 38, fireRate: 700, magSize: 30, reloadTime: 2800, recoil: 0.035, range: 200, weight: 7, invW: 2, invH: 4, automatic: true, spread: 0.025 },
  { id: 'akm', name: 'АКМ', type: 'rifle', caliber: '7.62x39', damage: 45, fireRate: 600, magSize: 30, reloadTime: 3000, recoil: 0.045, range: 180, weight: 7, invW: 2, invH: 4, automatic: true, spread: 0.03 },
  { id: 'm4a1', name: 'M4A1', type: 'rifle', caliber: '5.56x45', damage: 36, fireRate: 800, magSize: 30, reloadTime: 2500, recoil: 0.025, range: 220, weight: 6, invW: 2, invH: 4, automatic: true, spread: 0.018 },
  { id: 'saiga12', name: 'Сайга-12', type: 'shotgun', caliber: '12ga', damage: 85, fireRate: 120, magSize: 8, reloadTime: 3500, recoil: 0.07, range: 30, weight: 8, invW: 2, invH: 5, automatic: false, spread: 0.12 },
  { id: 'rem870', name: 'Remington 870', type: 'shotgun', caliber: '12ga', damage: 90, fireRate: 80, magSize: 6, reloadTime: 4000, recoil: 0.08, range: 25, weight: 7, invW: 2, invH: 5, automatic: false, spread: 0.1 },
  { id: 'svd', name: 'СВД', type: 'dmr', caliber: '7.62x54R', damage: 75, fireRate: 200, magSize: 10, reloadTime: 3500, recoil: 0.05, range: 400, weight: 9, invW: 2, invH: 6, automatic: false, spread: 0.008 },
  { id: 'sv98', name: 'СВ-98', type: 'sniper', caliber: '7.62x54R', damage: 120, fireRate: 40, magSize: 10, reloadTime: 4500, recoil: 0.09, range: 600, weight: 11, invW: 2, invH: 7, automatic: false, spread: 0.003 },
  { id: 'awp', name: 'AWP', type: 'sniper', caliber: '.338 Lapua', damage: 150, fireRate: 35, magSize: 5, reloadTime: 5000, recoil: 0.1, range: 800, weight: 12, invW: 2, invH: 7, automatic: false, spread: 0.002 },
  { id: 'barrett', name: 'Barrett M82', type: 'sniper', caliber: '.50 BMG', damage: 200, fireRate: 30, magSize: 10, reloadTime: 6000, recoil: 0.15, range: 1000, weight: 14, invW: 2, invH: 8, automatic: false, spread: 0.004 },
  { id: 'pkm', name: 'ПКМ', type: 'mg', caliber: '7.62x54R', damage: 50, fireRate: 750, magSize: 100, reloadTime: 8000, recoil: 0.05, range: 300, weight: 15, invW: 3, invH: 5, automatic: true, spread: 0.04 },
  { id: 'knife', name: 'Нож', type: 'melee', caliber: '', damage: 40, fireRate: 120, magSize: 999, reloadTime: 0, recoil: 0, range: 2, weight: 1, invW: 1, invH: 2, automatic: false, spread: 0 },
];

export const CALIBERS: Record<string, { name: string; damage: number }> = {
  '7.62x25': { name: '7.62x25 ТТ', damage: 1.0 },
  '9x19': { name: '9x19 Парабеллум', damage: 1.0 },
  '.45 ACP': { name: '.45 ACP', damage: 1.3 },
  '.50 AE': { name: '.50 AE', damage: 1.8 },
  '5.45x39': { name: '5.45x39', damage: 1.1 },
  '7.62x39': { name: '7.62x39', damage: 1.3 },
  '5.56x45': { name: '5.56x45 NATO', damage: 1.1 },
  '12ga': { name: '12 калибр', damage: 2.0 },
  '7.62x54R': { name: '7.62x54R', damage: 1.5 },
  '.338 Lapua': { name: '.338 Lapua', damage: 1.8 },
  '.50 BMG': { name: '.50 BMG', damage: 2.5 },
};

// Hit zone multipliers
export const HIT_ZONES = {
  head: 4.0,
  chest: 1.0,
  stomach: 0.9,
  arm: 0.7,
  leg: 0.7,
  bare_limb: 1.2,
};

// ============ DIFFICULTY ============
export interface DifficultyLevel {
  group: string;
  name: string;
  id: number;
  healthMult: number;
  damageMult: number;
  enemyCount: number;
  aiAccuracy: number;
  priceMult: number;
  rareLootChance: number;
  healAvailability: number;
}

export const DIFFICULTIES: DifficultyLevel[] = [
  // Лёгкая
  { group: 'Лёгкая', name: 'Крайне легко', id: 1, healthMult: 0.5, damageMult: 0.3, enemyCount: 3, aiAccuracy: 0.3, priceMult: 0.5, rareLootChance: 0.5, healAvailability: 1.0 },
  { group: 'Лёгкая', name: 'Очень легко', id: 2, healthMult: 0.65, damageMult: 0.45, enemyCount: 4, aiAccuracy: 0.4, priceMult: 0.6, rareLootChance: 0.45, healAvailability: 0.95 },
  { group: 'Лёгкая', name: 'Легко', id: 3, healthMult: 0.8, damageMult: 0.6, enemyCount: 5, aiAccuracy: 0.5, priceMult: 0.75, rareLootChance: 0.4, healAvailability: 0.9 },
  { group: 'Лёгкая', name: 'В основном легко', id: 4, healthMult: 0.9, damageMult: 0.75, enemyCount: 6, aiAccuracy: 0.6, priceMult: 0.85, rareLootChance: 0.35, healAvailability: 0.85 },
  // Нормальная
  { group: 'Нормальная', name: 'Крайне нормально', id: 5, healthMult: 1.0, damageMult: 0.85, enemyCount: 7, aiAccuracy: 0.65, priceMult: 1.0, rareLootChance: 0.3, healAvailability: 0.8 },
  { group: 'Нормальная', name: 'Очень нормально', id: 6, healthMult: 1.0, damageMult: 0.9, enemyCount: 8, aiAccuracy: 0.7, priceMult: 1.0, rareLootChance: 0.25, healAvailability: 0.75 },
  { group: 'Нормальная', name: 'Нормально', id: 7, healthMult: 1.0, damageMult: 1.0, enemyCount: 9, aiAccuracy: 0.75, priceMult: 1.0, rareLootChance: 0.2, healAvailability: 0.7 },
  { group: 'Нормальная', name: 'В основном нормально', id: 8, healthMult: 1.1, damageMult: 1.1, enemyCount: 10, aiAccuracy: 0.8, priceMult: 1.1, rareLootChance: 0.18, healAvailability: 0.65 },
  // Сложная
  { group: 'Сложная', name: 'Крайне сложно', id: 9, healthMult: 1.2, damageMult: 1.2, enemyCount: 11, aiAccuracy: 0.82, priceMult: 1.2, rareLootChance: 0.15, healAvailability: 0.6 },
  { group: 'Сложная', name: 'Очень сложно', id: 10, healthMult: 1.3, damageMult: 1.3, enemyCount: 12, aiAccuracy: 0.85, priceMult: 1.3, rareLootChance: 0.12, healAvailability: 0.55 },
  { group: 'Сложная', name: 'Сложно', id: 11, healthMult: 1.5, damageMult: 1.4, enemyCount: 13, aiAccuracy: 0.88, priceMult: 1.4, rareLootChance: 0.1, healAvailability: 0.5 },
  { group: 'Сложная', name: 'В основном сложно', id: 12, healthMult: 1.6, damageMult: 1.5, enemyCount: 14, aiAccuracy: 0.9, priceMult: 1.5, rareLootChance: 0.08, healAvailability: 0.45 },
  // Экстремальная
  { group: 'Экстремальная', name: 'Крайне экстремально', id: 13, healthMult: 1.8, damageMult: 1.6, enemyCount: 15, aiAccuracy: 0.92, priceMult: 1.7, rareLootChance: 0.06, healAvailability: 0.4 },
  { group: 'Экстральная', name: 'Очень экстремально', id: 14, healthMult: 2.0, damageMult: 1.7, enemyCount: 16, aiAccuracy: 0.93, priceMult: 1.8, rareLootChance: 0.05, healAvailability: 0.35 },
  { group: 'Экстремальная', name: 'Экстремально', id: 15, healthMult: 2.2, damageMult: 1.8, enemyCount: 17, aiAccuracy: 0.94, priceMult: 2.0, rareLootChance: 0.04, healAvailability: 0.3 },
  { group: 'Экстремальная', name: 'В основном экстремально', id: 16, healthMult: 2.5, damageMult: 2.0, enemyCount: 18, aiAccuracy: 0.95, priceMult: 2.2, rareLootChance: 0.03, healAvailability: 0.25 },
  // Невозможная
  { group: 'Невозможная', name: 'Невозможно', id: 17, healthMult: 3.0, damageMult: 2.2, enemyCount: 20, aiAccuracy: 0.96, priceMult: 2.5, rareLootChance: 0.02, healAvailability: 0.2 },
  { group: 'Невозможная', name: 'Крайне невозможно', id: 18, healthMult: 3.5, damageMult: 2.5, enemyCount: 22, aiAccuracy: 0.97, priceMult: 3.0, rareLootChance: 0.01, healAvailability: 0.15 },
  { group: 'Невозможная', name: 'Очень невозможно', id: 19, healthMult: 4.0, damageMult: 3.0, enemyCount: 25, aiAccuracy: 0.98, priceMult: 3.5, rareLootChance: 0.005, healAvailability: 0.1 },
  { group: 'Невозможная', name: 'В основном невозможно', id: 20, healthMult: 5.0, damageMult: 4.0, enemyCount: 30, aiAccuracy: 0.99, priceMult: 4.0, rareLootChance: 0.001, healAvailability: 0.05 },
];

// ============ GAME STATE ============
export interface InventoryItem {
  type: 'weapon' | 'ammo' | 'medkit' | 'attachment';
  id: string;
  name: string;
  quantity: number;
  w: number;
  h: number;
  gridX: number;
  gridY: number;
}

export interface GameState {
  playerHP: number;
  playerMaxHP: number;
  companionHP: number;
  companionMaxHP: number;
  currentWeapon: WeaponData | null;
  ammoInMag: number;
  ammoReserve: Record<string, number>;
  inventory: InventoryItem[];
  inventorySize: { w: number; h: number };
  money: number;
  kills: number;
  difficulty: DifficultyLevel | null;
  gamePhase: 'menu' | 'difficulty' | 'playing' | 'dead' | 'paused' | 'inventory' | 'shop';
}

export function createInitialState(): GameState {
  return {
    playerHP: 100,
    playerMaxHP: 100,
    companionHP: 80,
    companionMaxHP: 80,
    currentWeapon: WEAPONS[0], // ТТ
    ammoInMag: 8,
    ammoReserve: { '7.62x25': 48, '9x19': 0, '.45 ACP': 0, '5.45x39': 0, '7.62x39': 0, '5.56x45': 0, '12ga': 0, '7.62x54R': 0, '.338 Lapua': 0, '.50 BMG': 0, '.50 AE': 0 },
    inventory: [
      { type: 'weapon', id: 'tt', name: 'ТТ', quantity: 1, w: 2, h: 1, gridX: 0, gridY: 0 },
      { type: 'weapon', id: 'knife', name: 'Нож', quantity: 1, w: 1, h: 2, gridX: 0, gridY: 1 },
      { type: 'ammo', id: '7.62x25', name: '7.62x25', quantity: 48, w: 1, h: 1, gridX: 2, gridY: 0 },
      { type: 'medkit', id: 'bandage', name: 'Бинт', quantity: 3, w: 1, h: 1, gridX: 3, gridY: 0 },
      { type: 'medkit', id: 'apt', name: 'Аптечка', quantity: 1, w: 1, h: 2, gridX: 4, gridY: 0 },
    ],
    inventorySize: { w: 8, h: 5 },
    money: 500,
    kills: 0,
    difficulty: null,
    gamePhase: 'menu',
  };
}
