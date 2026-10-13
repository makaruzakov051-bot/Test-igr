import { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from './game/Engine';
import { 
  GameState, createInitialState, DIFFICULTIES, DifficultyLevel, 
  WEAPONS, WeaponData, InventoryItem, CALIBERS
} from './game/GameData';

// ============ HIT MARKER COMPONENT ============
function HitMarker({ zone, damage, id }: { zone: string; damage: number; id: number }) {
  const colors: Record<string, string> = {
    head: '#ff0000',
    chest: '#ffaa00',
    stomach: '#ffcc00',
    arm: '#88aaff',
    leg: '#88aaff',
  };
  
  return (
    <div 
      key={id}
      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-ping"
      style={{ animationDuration: '0.3s', animationIterationCount: '1' }}
    >
      <div className="relative w-8 h-8">
        <div className="absolute top-0 left-1/2 w-0.5 h-2 -translate-x-1/2" style={{ backgroundColor: colors[zone] || '#fff' }} />
        <div className="absolute bottom-0 left-1/2 w-0.5 h-2 -translate-x-1/2" style={{ backgroundColor: colors[zone] || '#fff' }} />
        <div className="absolute left-0 top-1/2 w-2 h-0.5 -translate-y-1/2" style={{ backgroundColor: colors[zone] || '#fff' }} />
        <div className="absolute right-0 top-1/2 w-2 h-0.5 -translate-y-1/2" style={{ backgroundColor: colors[zone] || '#fff' }} />
      </div>
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold" style={{ color: colors[zone] || '#fff' }}>
        -{Math.round(damage)}
      </div>
    </div>
  );
}

// ============ MAIN MENU ============
function MainMenu({ onStart, onSettings }: { onStart: () => void; onSettings: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300 mb-2 tracking-wider" style={{ fontFamily: 'Courier New, monospace', textShadow: '0 0 20px rgba(255,100,0,0.3)' }}>
          КАРАУЛ
        </h1>
        <p className="text-gray-600 text-sm mb-12">постсоветский survival-horror FPS</p>
        
        <div className="space-y-4">
          <button 
            onClick={onStart}
            className="block w-64 mx-auto py-3 px-8 bg-gray-900 border border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-orange-900 hover:text-orange-400 transition-all duration-200 text-lg cursor-pointer"
          >
            НАЧАТЬ ИГРУ
          </button>
          <button 
            onClick={onSettings}
            className="block w-64 mx-auto py-3 px-8 bg-gray-900 border border-gray-700 text-gray-400 hover:bg-gray-800 hover:border-gray-500 hover:text-gray-200 transition-all duration-200 cursor-pointer"
          >
            НАСТРОЙКИ
          </button>
        </div>
        
        <div className="mt-16 text-gray-600 text-xs space-y-1">
          <p>WASD — движение | Мышь — обзор | ЛКМ — огонь</p>
          <p>R — перезарядка | F — фонарик | Shift — бег | Пробел — прыжок</p>
          <p>I — инвентарь | Tab — магазин | C — крафт</p>
        </div>
      </div>
      
      {/* Atmospheric elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-900/50 to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-gray-900/30 to-transparent" />
    </div>
  );
}

// ============ SETTINGS ============
function Settings({ onClose, onMainMenu, settings, onChange, inGame }: { 
  onClose: () => void; 
  onMainMenu?: () => void;
  settings: GameSettings;
  onChange: (s: GameSettings) => void;
  inGame?: boolean;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-50">
      <div className="bg-gray-900 border border-gray-700 p-8 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl text-gray-300 tracking-wider">НАСТРОЙКИ</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-2xl cursor-pointer">✕</button>
        </div>
        
        <div className="space-y-6">
          {/* Sensitivity */}
          <div>
            <label className="text-gray-400 text-sm block mb-2">Чувствительность мыши</label>
            <input 
              type="range" 
              min="0.5" max="5" step="0.1"
              value={settings.sensitivity}
              onChange={(e) => onChange({ ...settings, sensitivity: parseFloat(e.target.value) })}
              className="w-full accent-orange-500"
            />
            <div className="text-gray-600 text-xs mt-1">{settings.sensitivity.toFixed(1)}</div>
          </div>
          
          {/* Volume */}
          <div>
            <label className="text-gray-400 text-sm block mb-2">Громкость</label>
            <input 
              type="range" 
              min="0" max="1" step="0.05"
              value={settings.volume}
              onChange={(e) => onChange({ ...settings, volume: parseFloat(e.target.value) })}
              className="w-full accent-orange-500"
            />
            <div className="text-gray-600 text-xs mt-1">{Math.round(settings.volume * 100)}%</div>
          </div>
          
          {/* FOV */}
          <div>
            <label className="text-gray-400 text-sm block mb-2">Поле зрения (FOV)</label>
            <input 
              type="range" 
              min="60" max="110" step="5"
              value={settings.fov}
              onChange={(e) => onChange({ ...settings, fov: parseInt(e.target.value) })}
              className="w-full accent-orange-500"
            />
            <div className="text-gray-600 text-xs mt-1">{settings.fov}°</div>
          </div>
          
          {/* Invert Y */}
          <div className="flex items-center justify-between">
            <label className="text-gray-400 text-sm">Инвертировать ось Y</label>
            <button 
              onClick={() => onChange({ ...settings, invertY: !settings.invertY })}
              className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${settings.invertY ? 'bg-orange-600' : 'bg-gray-700'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.invertY ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          
          {/* Show FPS */}
          <div className="flex items-center justify-between">
            <label className="text-gray-400 text-sm">Показывать FPS</label>
            <button 
              onClick={() => onChange({ ...settings, showFPS: !settings.showFPS })}
              className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${settings.showFPS ? 'bg-orange-600' : 'bg-gray-700'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.showFPS ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
        
        <div className="mt-8 space-y-2">
          <button 
            onClick={onClose}
            className="w-full py-3 border border-gray-600 text-gray-300 hover:bg-gray-800 transition-all cursor-pointer"
          >
            ПРИМЕНИТЬ И ЗАКРЫТЬ
          </button>
          {inGame && onMainMenu && (
            <button 
              onClick={onMainMenu}
              className="w-full py-3 border border-red-900 text-red-400 hover:bg-red-900/30 transition-all cursor-pointer"
            >
              ВЫЙТИ В ГЛАВНОЕ МЕНЮ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface GameSettings {
  sensitivity: number;
  volume: number;
  fov: number;
  invertY: boolean;
  showFPS: boolean;
}

// ============ DIFFICULTY SELECT ============
function DifficultySelect({ onSelect, onBack }: { onSelect: (d: DifficultyLevel) => void; onBack: () => void }) {
  const [selectedGroup, setSelectedGroup] = useState<string>('Лёгкая');
  
  const groups = ['Лёгкая', 'Нормальная', 'Сложная', 'Экстремальная', 'Невозможная'];
  const groupColors: Record<string, string> = {
    'Лёгкая': 'text-green-400',
    'Нормальная': 'text-yellow-400',
    'Сложная': 'text-orange-400',
    'Экстремальная': 'text-red-400',
    'Невозможная': 'text-purple-400',
  };
  
  const filteredDiffs = DIFFICULTIES.filter(d => d.group === selectedGroup);
  
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-50">
      <h2 className="text-3xl text-gray-300 mb-8 tracking-wider">СЛОЖНОСТЬ</h2>
      
      <div className="flex gap-2 mb-8">
        {groups.map(g => (
          <button
            key={g}
            onClick={() => setSelectedGroup(g)}
            className={`px-4 py-2 border text-sm transition-all ${
              selectedGroup === g 
                ? `border-gray-500 ${groupColors[g]} bg-gray-900` 
                : 'border-gray-800 text-gray-600 hover:border-gray-600'
            }`}
          >
            {g}
          </button>
        ))}
      </div>
      
      <div className="grid grid-cols-4 gap-3 mb-8 max-w-2xl">
        {filteredDiffs.map(d => (
          <button
            key={d.id}
            onClick={() => onSelect(d)}
            className="p-4 border border-gray-800 bg-gray-900/50 hover:border-gray-600 hover:bg-gray-800 transition-all text-center group"
          >
            <div className={`text-sm font-bold ${groupColors[d.group]} group-hover:brightness-125`}>
              {d.name}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Ур. {d.id}
            </div>
            <div className="text-xs text-gray-700 mt-2 space-y-0.5">
              <div>HP врагов: x{d.healthMult}</div>
              <div>Урон: x{d.damageMult}</div>
              <div>Враги: {d.enemyCount}</div>
            </div>
          </button>
        ))}
      </div>
      
      <button onClick={onBack} className="px-6 py-2 border border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500 transition-all">
        ← НАЗАД
      </button>
    </div>
  );
}

// ============ HUD ============
function HUD({ state, hitMarkers, waveInfo, isLocked }: { state: GameState; hitMarkers: { zone: string; damage: number; id: number }[]; waveInfo: { wave: number; enemiesLeft: number }; isLocked: boolean }) {
  const hpPercent = (state.playerHP / state.playerMaxHP) * 100;
  const companionPercent = (state.companionHP / state.companionMaxHP) * 100;
  const reserve = state.ammoReserve[state.currentWeapon?.caliber || ''] || 0;
  const isEmpty = state.ammoInMag === 0;
  const isLow = state.ammoInMag <= Math.ceil((state.currentWeapon?.magSize || 1) * 0.25);
  
  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-1 h-1 bg-white/50 rounded-full" />
        <div className="absolute top-1/2 left-1/2 w-5 h-px bg-white/30 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-px h-5 bg-white/30 -translate-x-1/2 -translate-y-1/2" />
        {/* Gap in center */}
        <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      
      {/* Hit markers */}
      {hitMarkers.map(hm => (
        <HitMarker key={hm.id} zone={hm.zone} damage={hm.damage} id={hm.id} />
      ))}
      
      {/* HP Bar - bottom left */}
      <div className="absolute bottom-8 left-6">
        <div className="flex items-center gap-3">
          <div className={`text-2xl font-bold ${hpPercent > 60 ? 'text-green-500' : hpPercent > 30 ? 'text-yellow-500' : 'text-red-500'}`}>
            {Math.round(state.playerHP)}
          </div>
          <div className="w-44 h-2.5 bg-gray-900/80 border border-gray-700/50">
            <div 
              className="h-full transition-all duration-300"
              style={{ 
                width: `${hpPercent}%`, 
                backgroundColor: hpPercent > 60 ? '#44aa44' : hpPercent > 30 ? '#aaaa44' : '#cc3333'
              }}
            />
          </div>
        </div>
        <div className="text-gray-600 text-xs mt-1">ЗДОРОВЬЕ</div>
      </div>
      
      {/* Companion HP */}
      <div className="absolute bottom-20 left-6">
        <div className="flex items-center gap-2">
          <div className="text-blue-400 text-xs font-mono">{Math.round(state.companionHP)}</div>
          <div className="w-20 h-1.5 bg-gray-900/80 border border-gray-800/50">
            <div 
              className="h-full transition-all duration-300 bg-blue-500/80"
              style={{ width: `${companionPercent}%` }}
            />
          </div>
          <span className="text-gray-600 text-[10px]">НАПАРНИК</span>
        </div>
      </div>
      
      {/* Ammo - bottom right */}
      <div className="absolute bottom-8 right-6 text-right">
        <div className={`text-3xl font-bold font-mono ${isEmpty ? 'text-red-500 animate-pulse' : isLow ? 'text-yellow-500' : 'text-gray-300'}`}>
          {state.ammoInMag}
          <span className="text-gray-600 text-lg"> / {reserve}</span>
        </div>
        <div className="text-gray-400 text-sm">{state.currentWeapon?.name || '—'}</div>
        <div className="text-gray-600 text-xs">{state.currentWeapon?.caliber || ''}</div>
        {isEmpty && reserve > 0 && (
          <div className="text-yellow-600 text-xs mt-1 animate-pulse">[R] ПЕРЕЗАРЯДКА</div>
        )}
        {isEmpty && reserve === 0 && (
          <div className="text-red-600 text-xs mt-1">НЕТ ПАТРОНОВ</div>
        )}
      </div>
      
      {/* Kills */}
      <div className="absolute top-6 right-6 text-right">
        <div className="text-gray-600 text-xs tracking-wider">УБИЙСТВ</div>
        <div className="text-2xl font-bold text-gray-400 font-mono">{state.kills}</div>
      </div>
      
      {/* Difficulty */}
      <div className="absolute top-6 left-6">
        <div className="text-gray-700 text-[10px] tracking-wider uppercase">{state.difficulty?.group}</div>
        <div className="text-gray-500 text-xs">{state.difficulty?.name}</div>
      </div>
      
      {/* Money */}
      <div className="absolute top-14 right-6">
        <div className="text-yellow-700 text-xs font-mono">{state.money} ₽</div>
      </div>
      
      {/* Wave info */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center">
        <div className="text-gray-600 text-xs tracking-widest">ВОЛНА {waveInfo.wave}</div>
        <div className="text-gray-500 text-[10px]">Врагов: {waveInfo.enemiesLeft}</div>
      </div>
      
      {/* Pointer lock prompt */}
      {!isLocked && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 border border-gray-600 px-6 py-4 text-center pointer-events-none">
          <div className="text-gray-300 text-sm mb-1">Кликните для захвата мыши</div>
          <div className="text-gray-500 text-xs">WASD — движение • Мышь — обзор • ЛКМ — огонь</div>
          <div className="text-gray-600 text-xs mt-1">ESC — освободить курсор</div>
        </div>
      )}
      
      {/* Controls hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
        <div className="text-gray-700 text-[10px] space-x-3">
          <span>[I] Инвентарь</span>
          <span>[Tab] Магазин</span>
          <span>[C] Крафт</span>
          <span>[F] Фонарик</span>
          <span>[Esc] Меню</span>
        </div>
      </div>
      
      {/* Damage vignette */}
      {state.playerHP < 50 && (
        <div className="absolute inset-0 pointer-events-none transition-opacity duration-500" style={{
          boxShadow: `inset 0 0 ${Math.round(150 - state.playerHP * 2)}px rgba(150,0,0,${(50 - state.playerHP) / 150})`,
        }} />
      )}
      
      {/* Low HP heartbeat effect */}
      {state.playerHP < 25 && (
        <div className="absolute inset-0 pointer-events-none animate-pulse" style={{
          boxShadow: 'inset 0 0 100px rgba(200,0,0,0.15)',
          animationDuration: '0.8s',
        }} />
      )}
    </div>
  );
}

// ============ INVENTORY ============
function Inventory({ state, onClose, onEquipWeapon, onUseItem }: { 
  state: GameState; 
  onClose: () => void; 
  onEquipWeapon: (weapon: WeaponData) => void;
  onUseItem: (item: InventoryItem) => void;
}) {
  const gridCells = [];
  const { w, h } = state.inventorySize;
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const item = state.inventory.find(it => 
        x >= it.gridX && x < it.gridX + it.w && 
        y >= it.gridY && y < it.gridY + it.h
      );
      const isOrigin = item && item.gridX === x && item.gridY === y;
      
      gridCells.push(
        <div 
          key={`${x}-${y}`}
          className={`w-12 h-12 border border-gray-800 flex items-center justify-center text-xs
            ${item ? 'bg-gray-800/80' : 'bg-gray-900/40'}
            ${isOrigin ? 'border-gray-600' : ''}
          `}
          title={item ? `${item.name} x${item.quantity}` : ''}
        >
          {isOrigin && (
            <span className={`text-center leading-tight font-bold ${
              item?.type === 'weapon' ? 'text-orange-400' :
              item?.type === 'ammo' ? 'text-yellow-400' :
              item?.type === 'medkit' ? 'text-green-400' :
              'text-gray-400'
            }`}>
              {item?.name?.substring(0, 3)}
            </span>
          )}
        </div>
      );
    }
  }
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-40 pointer-events-auto">
      <div className="bg-gray-900 border-2 border-gray-600 p-6 max-w-3xl w-full mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl text-gray-300 font-bold tracking-wider">ИНВЕНТАРЬ</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-300 text-2xl cursor-pointer w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        
        <div className="flex gap-6">
          {/* Grid */}
          <div>
            <div className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Сетка ({w}x{h})</div>
            <div className="grid gap-0 border border-gray-700" style={{ gridTemplateColumns: `repeat(${w}, 3rem)` }}>
              {gridCells}
            </div>
          </div>
          
          {/* Item list */}
          <div className="flex-1 max-h-80 overflow-y-auto">
            <div className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Предметы</div>
            <div className="space-y-2">
              {state.inventory.length === 0 ? (
                <div className="text-gray-600 text-sm p-4 text-center">Инвентарь пуст</div>
              ) : (
                state.inventory.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700 hover:border-gray-500 transition-colors">
                    <div className="flex-1">
                      <div className={`text-sm font-bold ${
                        item.type === 'weapon' ? 'text-orange-400' :
                        item.type === 'ammo' ? 'text-yellow-400' :
                        item.type === 'medkit' ? 'text-green-400' :
                        'text-blue-400'
                      }`}>
                        {item.name}
                      </div>
                      <div className="text-gray-600 text-xs mt-0.5">
                        {item.type === 'weapon' && `${WEAPONS.find(w => w.id === item.id)?.caliber || ''}`}
                        {item.type === 'ammo' && `Патроны`}
                        {item.type === 'medkit' && `Лечение`}
                        {item.type === 'attachment' && `Модификация`}
                        {item.quantity > 1 && ` • x${item.quantity}`}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {item.type === 'weapon' && (
                        <button 
                          onClick={() => {
                            const weapon = WEAPONS.find(w => w.id === item.id);
                            if (weapon) onEquipWeapon(weapon);
                          }}
                          className="text-xs px-3 py-1.5 bg-orange-900/50 text-orange-300 hover:bg-orange-800 border border-orange-700 cursor-pointer transition-colors"
                        >
                          Экипировать
                        </button>
                      )}
                      {item.type === 'medkit' && (
                        <button 
                          onClick={() => onUseItem(item)}
                          className="text-xs px-3 py-1.5 bg-green-900/50 text-green-300 hover:bg-green-800 border border-green-700 cursor-pointer transition-colors"
                        >
                          Использовать
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Money and info */}
        <div className="mt-4 pt-3 border-t border-gray-700 flex justify-between items-center">
          <div className="text-gray-500 text-sm">
            Текущее оружие: <span className="text-orange-400">{state.currentWeapon?.name || 'Нет'}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-500 text-sm">Баланс:</span>
            <span className="text-yellow-500 font-bold text-lg">{state.money} ₽</span>
          </div>
        </div>
        
        {/* Controls hint */}
        <div className="mt-3 text-gray-600 text-xs text-center">
          [I] или [Esc] — закрыть • Кликните на предмет для действия
        </div>
      </div>
    </div>
  );
}

// ============ SHOP ============
function Shop({ state, onClose, onBuy }: { 
  state: GameState; 
  onClose: () => void;
  onBuy: (item: { type: string; id: string; name: string; price: number }) => void;
}) {
  const shopItems = [
    // Weapons
    { type: 'weapon', id: 'glock17', name: 'Glock-17 (9x19)', price: 800 },
    { type: 'weapon', id: 'colt1911', name: 'Colt 1911 (.45 ACP)', price: 1200 },
    { type: 'weapon', id: 'deagle', name: 'Desert Eagle (.50 AE)', price: 2500 },
    { type: 'weapon', id: 'mp5', name: 'MP5 (9x19)', price: 1800 },
    { type: 'weapon', id: 'ppsh', name: 'ППШ-41 (7.62x25)', price: 2000 },
    { type: 'weapon', id: 'ak74', name: 'АК-74 (5.45x39)', price: 3500 },
    { type: 'weapon', id: 'akm', name: 'АКМ (7.62x39)', price: 3200 },
    { type: 'weapon', id: 'm4a1', name: 'M4A1 (5.56x45)', price: 4000 },
    { type: 'weapon', id: 'saiga12', name: 'Сайга-12 (12ga)', price: 2800 },
    { type: 'weapon', id: 'rem870', name: 'Remington 870 (12ga)', price: 2200 },
    { type: 'weapon', id: 'svd', name: 'СВД (7.62x54R)', price: 5500 },
    { type: 'weapon', id: 'sv98', name: 'СВ-98 (7.62x54R)', price: 6000 },
    { type: 'weapon', id: 'pkm', name: 'ПКМ (7.62x54R)', price: 7000 },
    // Ammo
    { type: 'ammo', id: '9x19', name: '9x19 (30 шт)', price: 150 },
    { type: 'ammo', id: '7.62x25', name: '7.62x25 (40 шт)', price: 120 },
    { type: 'ammo', id: '5.45x39', name: '5.45x39 (30 шт)', price: 200 },
    { type: 'ammo', id: '7.62x39', name: '7.62x39 (20 шт)', price: 250 },
    { type: 'ammo', id: '5.56x45', name: '5.56x45 (30 шт)', price: 220 },
    { type: 'ammo', id: '12ga', name: '12 калибр (8 шт)', price: 180 },
    { type: 'ammo', id: '7.62x54R', name: '7.62x54R (10 шт)', price: 300 },
    // Medical
    { type: 'medkit', id: 'apt', name: 'Аптечка (+30 HP)', price: 300 },
    { type: 'medkit', id: 'bandage', name: 'Бинт (+15 HP)', price: 100 },
    // Attachments
    { type: 'attachment', id: 'scope_x4', name: 'Прицел x4', price: 1200 },
    { type: 'attachment', id: 'scope_x8', name: 'Прицел x8', price: 2000 },
    { type: 'attachment', id: 'suppressor', name: 'Глушитель', price: 800 },
    { type: 'attachment', id: 'ext_mag', name: 'Увеличенный магазин', price: 600 },
    { type: 'attachment', id: 'foregrip', name: 'Рукоятка', price: 400 },
  ];
  
  const priceMult = state.difficulty?.priceMult || 1;
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-40 pointer-events-auto">
      <div className="bg-gray-900 border-2 border-gray-600 p-6 max-w-lg w-full mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl text-gray-300 font-bold tracking-wider">МАГАЗИН</h3>
          <div className="flex items-center gap-4">
            <span className="text-yellow-500 font-bold text-lg">{state.money} ₽</span>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-2xl cursor-pointer w-8 h-8 flex items-center justify-center">✕</button>
          </div>
        </div>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {shopItems.map((item, i) => {
            const price = Math.round(item.price * priceMult);
            const canAfford = state.money >= price;
            
            return (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700 hover:border-gray-500 transition-colors">
                <div>
                  <span className={`text-sm font-bold ${
                    item.type === 'weapon' ? 'text-orange-400' :
                    item.type === 'ammo' ? 'text-yellow-400' :
                    item.type === 'medkit' ? 'text-green-400' :
                    'text-blue-400'
                  }`}>
                    {item.name}
                  </span>
                </div>
                <button 
                  onClick={() => canAfford && onBuy(item)}
                  className={`text-sm px-4 py-1.5 transition-colors ${
                    canAfford 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer' 
                      : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  }`}
                  disabled={!canAfford}
                >
                  {price} ₽
                </button>
              </div>
            );
          })}
        </div>
        
        <div className="mt-3 text-gray-600 text-xs text-center">
          [Tab] или [Esc] — закрыть
        </div>
      </div>
    </div>
  );
}

// ============ CRAFTING ============
function Crafting({ state, onClose, onCraft }: { 
  state: GameState; 
  onClose: () => void;
  onCraft: (caliber: string, amount: number) => void;
}) {
  const craftableAmmo = [
    { caliber: '9x19', name: '9x19 Парабеллум', cost: 10, amount: 10 },
    { caliber: '7.62x25', name: '7.62x25 ТТ', cost: 12, amount: 10 },
    { caliber: '5.45x39', name: '5.45x39', cost: 15, amount: 10 },
    { caliber: '7.62x39', name: '7.62x39', cost: 18, amount: 10 },
    { caliber: '12ga', name: '12 калибр', cost: 20, amount: 5 },
    { caliber: '7.62x54R', name: '7.62x54R', cost: 25, amount: 5 },
  ];
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-40 pointer-events-auto">
      <div className="bg-gray-900 border-2 border-gray-600 p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl text-gray-300 font-bold tracking-wider">ВЕРСТАК</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-2xl cursor-pointer w-8 h-8 flex items-center justify-center">✕</button>
        </div>
        
        <div className="text-gray-500 text-xs mb-4">
          Крафт патронов из ресурсов: порох, гильзы, свинец
        </div>
        
        <div className="space-y-2">
          {craftableAmmo.map((ammo, i) => {
            const canCraft = state.money >= ammo.cost;
            return (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700 hover:border-gray-500 transition-colors">
                <div>
                  <span className="text-yellow-400 text-sm font-bold">{ammo.name}</span>
                  <span className="text-gray-600 text-xs ml-2">x{ammo.amount}</span>
                </div>
                <button 
                  onClick={() => canCraft && onCraft(ammo.caliber, ammo.amount)}
                  className={`text-sm px-4 py-1.5 transition-colors ${
                    canCraft 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer' 
                      : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  }`}
                  disabled={!canCraft}
                >
                  {ammo.cost} ₽
                </button>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-700 flex justify-between items-center">
          <span className="text-gray-500 text-sm">Баланс:</span>
          <span className="text-yellow-500 font-bold text-lg">{state.money} ₽</span>
        </div>
        
        <div className="mt-3 text-gray-600 text-xs text-center">
          [C] или [Esc] — закрыть
        </div>
      </div>
    </div>
  );
}

// ============ DEATH SCREEN ============
function DeathScreen({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-50">
      <div className="text-center">
        <h2 className="text-5xl font-bold text-red-600 mb-4">ТЫ МЁРТВ</h2>
        <p className="text-gray-500 mb-2">Убийств: {state.kills}</p>
        <p className="text-gray-600 text-sm mb-8">Сложность: {state.difficulty?.name}</p>
        <button 
          onClick={onRestart}
          className="px-8 py-3 border border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-gray-500 transition-all"
        >
          НАЧАТЬ ЗАНОВО
        </button>
      </div>
    </div>
  );
}

// ============ MOBILE CONTROLS ============
function MobileControls({ onMove, onShoot, onReload, onInventory, onLook }: {
  onMove: (x: number, y: number) => void;
  onShoot: (pressed: boolean) => void;
  onReload: () => void;
  onInventory: () => void;
  onLook: (dx: number, dy: number) => void;
}) {
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const joystickRef = useRef<HTMLDivElement>(null);
  const lookRef = useRef<{ startX: number; startY: number; id: number | null }>({ startX: 0, startY: 0, id: null });
  
  const handleJoystickStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    const rect = joystickRef.current?.getBoundingClientRect();
    if (rect) {
      setJoystickPos({
        x: (touch.clientX - rect.left - rect.width / 2) / (rect.width / 2),
        y: (touch.clientY - rect.top - rect.height / 2) / (rect.height / 2),
      });
    }
  };
  
  const handleJoystickMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    const rect = joystickRef.current?.getBoundingClientRect();
    if (rect) {
      const x = Math.max(-1, Math.min(1, (touch.clientX - rect.left - rect.width / 2) / (rect.width / 2)));
      const y = Math.max(-1, Math.min(1, (touch.clientY - rect.top - rect.height / 2) / (rect.height / 2)));
      setJoystickPos({ x, y });
      onMove(x, y);
    }
  };
  
  const handleJoystickEnd = () => {
    setJoystickPos({ x: 0, y: 0 });
    onMove(0, 0);
  };
  
  const handleLookStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    lookRef.current = { startX: touch.clientX, startY: touch.clientY, id: touch.identifier };
  };
  
  const handleLookMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (touch.identifier === lookRef.current.id) {
        const dx = touch.clientX - lookRef.current.startX;
        const dy = touch.clientY - lookRef.current.startY;
        lookRef.current.startX = touch.clientX;
        lookRef.current.startY = touch.clientY;
        onLook(dx * 0.5, dy * 0.5);
        break;
      }
    }
  };
  
  const handleLookEnd = () => {
    lookRef.current.id = null;
  };
  
  return (
    <div className="absolute inset-0 pointer-events-none md:hidden">
      {/* Look area (right half of screen) */}
      <div 
        className="absolute top-0 right-0 w-1/2 h-full pointer-events-auto"
        onTouchStart={handleLookStart}
        onTouchMove={handleLookMove}
        onTouchEnd={handleLookEnd}
      />
      
      {/* Joystick */}
      <div 
        ref={joystickRef}
        className="absolute bottom-24 left-6 w-28 h-28 rounded-full bg-gray-800/50 border border-gray-600/50 pointer-events-auto"
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
      >
        <div 
          className="absolute w-10 h-10 rounded-full bg-gray-600/80 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ 
            transform: `translate(calc(-50% + ${joystickPos.x * 25}px), calc(-50% + ${joystickPos.y * 25}px))` 
          }}
        />
      </div>
      
      {/* Action buttons */}
      <div className="absolute bottom-24 right-6 flex flex-col gap-3 pointer-events-auto">
        <button 
          onTouchStart={() => onShoot(true)} 
          onTouchEnd={() => onShoot(false)}
          className="w-16 h-16 rounded-full bg-red-900/60 border-2 border-red-700/60 text-red-400 text-xs font-bold active:bg-red-800/80"
        >
          ОГОНЬ
        </button>
        <div className="flex gap-2">
          <button onTouchStart={onReload} className="w-12 h-12 rounded-full bg-gray-800/60 border border-gray-600/60 text-gray-400 text-xs active:bg-gray-700">
            ↻
          </button>
          <button onTouchStart={onInventory} className="w-12 h-12 rounded-full bg-gray-800/60 border border-gray-600/60 text-gray-400 text-xs active:bg-gray-700">
            ☰
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN APP ============
export default function App() {
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [hitMarkers, setHitMarkers] = useState<{ zone: string; damage: number; id: number }[]>([]);
  const [showInventory, setShowInventory] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showCrafting, setShowCrafting] = useState(false);
  const [waveInfo, setWaveInfo] = useState({ wave: 1, enemiesLeft: 0 });
  const [damageIndicators, setDamageIndicators] = useState<{ angle: number; id: number }[]>([]);
  const damageIdRef = useRef(0);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<GameSettings>({
    sensitivity: 2.0,
    volume: 0.7,
    fov: 75,
    invertY: false,
    showFPS: false,
  });
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const engineRef = useRef<GameEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hitIdRef = useRef(0);
  
  const startGame = useCallback((difficulty: DifficultyLevel) => {
    setGameState(prev => ({ ...prev, difficulty, gamePhase: 'playing' }));
  }, []);
  
  useEffect(() => {
    if (gameState.gamePhase === 'playing' && containerRef.current && !engineRef.current) {
      const engine = new GameEngine();
      engineRef.current = engine;
      
      engine.init(containerRef.current, gameState.difficulty!);
      engine.setAmmoReserve(gameState.ammoReserve);
      
      // Pointer lock callback
      engine.setLockCallback((locked) => {
        setIsPointerLocked(locked);
      });
      
      engine.setCallbacks({
        onStateUpdate: (partial) => {
          setGameState(prev => ({ ...prev, ...partial }));
        },
        onHitMarker: (zone, damage) => {
          const id = ++hitIdRef.current;
          setHitMarkers(prev => [...prev.slice(-5), { zone, damage, id }]);
          setTimeout(() => {
            setHitMarkers(prev => prev.filter(h => h.id !== id));
          }, 300);
        },
        onKill: () => {
          setGameState(prev => ({ ...prev, kills: prev.kills + 1, money: prev.money + 50 }));
        },
        onDamage: (amount) => {
          setGameState(prev => {
            const newHP = Math.max(0, prev.playerHP - amount);
            return { 
              ...prev, 
              playerHP: newHP, 
              gamePhase: newHP <= 0 ? 'dead' : prev.gamePhase 
            };
          });
        },
        onWaveUpdate: (wave, enemiesLeft) => {
          setWaveInfo({ wave, enemiesLeft });
        },
        onLootPickup: (loot) => {
          setGameState(prev => {
            const newState = { ...prev };
            
            if (loot.type === 'ammo') {
              newState.ammoReserve = { ...prev.ammoReserve };
              newState.ammoReserve[loot.id] = (newState.ammoReserve[loot.id] || 0) + loot.quantity;
              if (engineRef.current) {
                engineRef.current.setAmmoReserve(newState.ammoReserve);
              }
            } else if (loot.type === 'weapon') {
              const weapon = WEAPONS.find(w => w.id === loot.id);
              if (weapon) {
                newState.inventory = [...prev.inventory, {
                  type: 'weapon' as const,
                  id: weapon.id,
                  name: weapon.name,
                  quantity: 1,
                  w: weapon.invW,
                  h: weapon.invH,
                  gridX: 0,
                  gridY: 0,
                }];
              }
            } else if (loot.type === 'medkit') {
              newState.inventory = [...prev.inventory, {
                type: 'medkit' as const,
                id: loot.id,
                name: loot.name,
                quantity: loot.quantity,
                w: 1,
                h: 1,
                gridX: 0,
                gridY: 0,
              }];
            }
            
            return newState;
          });
        },
      });
    }
    
    return () => {
      // Don't destroy on every render, only on unmount
    };
  }, [gameState.gamePhase, gameState.difficulty]);
  
  // Apply settings to engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setFOV(settings.fov);
      engineRef.current.setSensitivity(settings.sensitivity);
      engineRef.current.setInvertY(settings.invertY);
    }
  }, [settings.fov, settings.sensitivity, settings.invertY]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState.gamePhase !== 'playing') return;
      
      if (e.code === 'KeyI') {
        if (showInventory) {
          closeInventory();
        } else {
          openInventory();
        }
      }
      if (e.code === 'Tab') {
        e.preventDefault();
        if (showShop) {
          setShowShop(false);
        } else {
          setShowShop(true);
          setShowInventory(false);
          setShowCrafting(false);
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
        }
      }
      if (e.code === 'KeyC') {
        if (showCrafting) {
          setShowCrafting(false);
        } else {
          setShowCrafting(true);
          setShowInventory(false);
          setShowShop(false);
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
        }
      }
      if (e.code === 'Escape') {
        if (showInventory || showShop || showCrafting) {
          setShowInventory(false);
          setShowShop(false);
          setShowCrafting(false);
        } else if (showSettings) {
          setShowSettings(false);
        } else {
          setShowSettings(true);
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
        }
      }
      // Weapon slots 1-4
      if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3' || e.code === 'Digit4') {
        const slotIndex = parseInt(e.code.replace('Digit', '')) - 1;
        const weapons = gameState.inventory.filter(i => i.type === 'weapon');
        if (slotIndex < weapons.length) {
          const weapon = WEAPONS.find(w => w.id === weapons[slotIndex].id);
          if (weapon) handleEquipWeapon(weapon);
        }
      }
    };
    
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState.gamePhase, gameState.inventory, showInventory, showShop, showCrafting]);
  
  const handleEquipWeapon = (weapon: WeaponData) => {
    if (engineRef.current) {
      engineRef.current.switchWeapon(weapon);
    }
    setGameState(prev => ({
      ...prev,
      currentWeapon: weapon,
      ammoInMag: weapon.magSize,
    }));
  };
  
  const handleUseItem = (item: InventoryItem) => {
    if (item.type === 'medkit') {
      const healAmount = item.id === 'apt' ? 30 : 15;
      setGameState(prev => {
        const newHP = Math.min(prev.playerMaxHP, prev.playerHP + healAmount);
        // Remove one item from inventory
        const newInventory = prev.inventory.map(inv => {
          if (inv === item) {
            return { ...inv, quantity: inv.quantity - 1 };
          }
          return inv;
        }).filter(inv => inv.quantity > 0);
        
        return { ...prev, playerHP: newHP, inventory: newInventory };
      });
    }
  };
  
  const openInventory = () => {
    setShowInventory(true);
    setShowShop(false);
    setShowCrafting(false);
    // Release pointer lock so player can click UI
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  };
  
  const closeInventory = () => {
    setShowInventory(false);
  };
  
  const handleBuy = (item: { type: string; id: string; name: string; price: number }) => {
    setGameState(prev => {
      if (prev.money < item.price) return prev;
      
      const newState = { ...prev, money: prev.money - item.price };
      
      if (item.type === 'ammo') {
        const caliber = item.id;
        newState.ammoReserve = { ...prev.ammoReserve };
        newState.ammoReserve[caliber] = (newState.ammoReserve[caliber] || 0) + 30;
        if (engineRef.current) {
          engineRef.current.setAmmoReserve(newState.ammoReserve);
        }
      } else if (item.type === 'weapon') {
        const weapon = WEAPONS.find(w => w.id === item.id);
        if (weapon) {
          newState.inventory = [...prev.inventory, {
            type: 'weapon' as const,
            id: weapon.id,
            name: weapon.name,
            quantity: 1,
            w: weapon.invW,
            h: weapon.invH,
            gridX: 0,
            gridY: 0,
          }];
        }
      } else if (item.type === 'medkit') {
        newState.playerHP = Math.min(prev.playerMaxHP, prev.playerHP + 30);
      }
      
      return newState;
    });
  };
  
  const handleCraft = (caliber: string, amount: number) => {
    const costs: Record<string, number> = {
      '9x19': 10, '7.62x25': 12, '5.45x39': 15, '7.62x39': 18, '12ga': 20, '7.62x54R': 25,
    };
    const cost = costs[caliber] || 15;
    
    setGameState(prev => {
      if (prev.money < cost) return prev;
      const newReserve = { ...prev.ammoReserve };
      newReserve[caliber] = (newReserve[caliber] || 0) + amount;
      if (engineRef.current) {
        engineRef.current.setAmmoReserve(newReserve);
      }
      return { ...prev, money: prev.money - cost, ammoReserve: newReserve };
    });
  };
  
  const handleRestart = () => {
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
    setGameState(createInitialState());
    setShowInventory(false);
    setShowShop(false);
    setShowCrafting(false);
  };
  
  return (
    <div className="w-full h-full relative overflow-hidden bg-black">
      {/* Game canvas container */}
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* Menu screens */}
      {gameState.gamePhase === 'menu' && !showSettings && (
        <MainMenu 
          onStart={() => setGameState(prev => ({ ...prev, gamePhase: 'difficulty' }))} 
          onSettings={() => setShowSettings(true)}
        />
      )}
      
      {showSettings && (
        <Settings 
          onClose={() => setShowSettings(false)}
          onMainMenu={() => {
            setShowSettings(false);
            if (engineRef.current) {
              engineRef.current.destroy();
              engineRef.current = null;
            }
            setGameState(createInitialState());
          }}
          settings={settings}
          onChange={setSettings}
          inGame={gameState.gamePhase === 'playing'}
        />
      )}
      
      {gameState.gamePhase === 'difficulty' && (
        <DifficultySelect 
          onSelect={startGame} 
          onBack={() => setGameState(prev => ({ ...prev, gamePhase: 'menu' }))} 
        />
      )}
      
      {/* HUD */}
      {(gameState.gamePhase === 'playing') && (
        <>
          <HUD state={gameState} hitMarkers={hitMarkers} waveInfo={waveInfo} isLocked={isPointerLocked} />
          <MobileControls 
            onMove={(x, y) => {
              if (engineRef.current) {
                engineRef.current.setMove({
                  forward: y < -0.3,
                  backward: y > 0.3,
                  left: x < -0.3,
                  right: x > 0.3,
                  sprint: false,
                });
              }
            }}
            onShoot={(pressed) => {
              if (engineRef.current) {
                if (pressed) engineRef.current.startShooting();
                else engineRef.current.stopShooting();
              }
            }}
            onReload={() => {
              // Dispatch keyboard event
              document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR' }));
            }}
            onInventory={openInventory}
            onLook={(dx, dy) => {
              if (engineRef.current) {
                engineRef.current.look(dx, dy);
              }
            }}
          />
        </>
      )}
      
      {/* Inventory overlay */}
      {showInventory && gameState.gamePhase === 'playing' && (
        <Inventory 
          state={gameState} 
          onClose={closeInventory} 
          onEquipWeapon={handleEquipWeapon}
          onUseItem={handleUseItem}
        />
      )}
      
      {/* Shop overlay */}
      {showShop && gameState.gamePhase === 'playing' && (
        <Shop 
          state={gameState} 
          onClose={() => setShowShop(false)}
          onBuy={handleBuy}
        />
      )}
      
      {/* Crafting overlay */}
      {showCrafting && gameState.gamePhase === 'playing' && (
        <Crafting 
          state={gameState}
          onClose={() => setShowCrafting(false)}
          onCraft={handleCraft}
        />
      )}
      
      {/* Death screen */}
      {gameState.gamePhase === 'dead' && (
        <DeathScreen state={gameState} onRestart={handleRestart} />
      )}
    </div>
  );
}
