(() => {
  'use strict';

  const mount = document.getElementById('threeMount');
  const hotbarEl = document.getElementById('hotbar');
  const invPanel = document.getElementById('inventoryPanel');
  const invHotbarEl = document.getElementById('invHotbar');
  const backpackEl = document.getElementById('backpack');
  const creativeInventoryEl = document.getElementById('creativeInventory');
  const creativeItemsEl = document.getElementById('creativeItems');
  const equipmentEl = document.getElementById('equipment');
  const enchantPanel = document.getElementById('enchantPanel');
  const enchantTargetEl = document.getElementById('enchantTarget');
  const enchantOptionsEl = document.getElementById('enchantOptions');
  const shulkerPanel = document.getElementById('shulkerPanel');
  const shulkerTitleEl = document.getElementById('shulkerTitle');
  const shulkerSlotsEl = document.getElementById('shulkerSlots');
  const craftingPanel = document.getElementById('craftingPanel');
  const craftingRecipesEl = document.getElementById('craftingRecipes');
  const furnacePanel = document.getElementById('furnacePanel');
  const furnaceRecipesEl = document.getElementById('furnaceRecipes');
  const tradePanel = document.getElementById('tradePanel');
  const tradeTitleEl = document.getElementById('tradeTitle');
  const tradeOptionsEl = document.getElementById('tradeOptions');
  const messagesEl = document.getElementById('messages');
  const playBtn = document.getElementById('playBtn');
  const startOverlay = document.getElementById('startOverlay');

  const ui = {
    scoreText: document.getElementById('scoreText'),
    hpText: document.getElementById('hpText'), hpBar: document.getElementById('hpBar'),
    shieldText: document.getElementById('shieldText'), shieldBar: document.getElementById('shieldBar'),
    armorText: document.getElementById('armorText'), armorBar: document.getElementById('armorBar'),
    xpText: document.getElementById('xpText'), xpBar: document.getElementById('xpBar'),
    levelText: document.getElementById('levelText'), upgradeText: document.getElementById('upgradeText'),
    poostText: document.getElementById('poostText'), elytraText: document.getElementById('elytraText')
  };

  const WORLD = 180;
  const GROUND_Y = 0;
  const BLUE = 0x3478ff;
  const RED = 0xe84a45;
  const GOLD = 0xe6bd4e;
  const STONE = 0x8b8d89;
  const WOOD = 0x8b5c35;
  const keys = new Set();
  const pointer = { locked: false };
  const mouseButtons = { left: false, right: false };
  const miningState = { key: null, progress: 0, lastToast: 0 };
  const dimensionMeshes = { overworld: [], nether: [], end: [], aether: [] };
  const netherPortals = [];
  const secretPassages = [];
  const lavaHazards = [];
  const endVoidZones = [];
  const aetherSafeZones = [];
  const villagers = [];
  const MAX_SAFE_PROGRESS = Number.MAX_SAFE_INTEGER;
  const DIMENSION_TRAVEL_GRACE = 6;
  let currentDimension = 'overworld';
  let buildDimension = null;
  let yaw = Math.PI * 0.25;
  let pitch = 0;
  let lastTime = performance.now();
  let running = true;

  if (!window.THREE) {
    toast('Three.js could not load. Connect to the internet and refresh.');
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x78a9d6);
  scene.fog = new THREE.Fog(0x78a9d6, 75, 270);
  const camera = new THREE.PerspectiveCamera(76, mount.clientWidth / mount.clientHeight, 0.05, 500);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  mount.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xd7ecff, 0x504133, 1.3);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2cf, 1.15);
  sun.position.set(-55, 95, 35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);

  const mats = {
    grass: mat(0x6da957, true), dirt: mat(0x7a5635, true), stone: mat(STONE, true), stoneDark: mat(0x6f716c, true),
    wood: mat(WOOD, true), roof: mat(0x5c3331, true), blue: mat(BLUE, true), red: mat(RED, true),
    gold: mat(GOLD, true), iron: mat(0xc8d1d8, true), diamond: mat(0x67e1df, true), netherite: mat(0x403640, true),
    leather: mat(0x9a5b34, true), chain: mat(0xaab2b3, true), lapis: mat(0x294bd6, true),
    command: mat(0xb67842, true), redstone: mat(0xb91818, false), piston: mat(0xb79a62, true), tnt: mat(0xd82f22, true),
    fire: mat(0xff6a20, true), black: mat(0x151515, true), white: mat(0xf2f2e8, true), glass: mat(0x9be9ff, false, .46),
    netherrack: mat(0x7b2020, true), netherBrick: mat(0x32151c, true), lava: mat(0xff4a12, false),
    basalt: mat(0x343138, true), soul: mat(0x45606f, true), crimson: mat(0x8b163c, true), warped: mat(0x11857d, true),
    glowstone: mat(0xffd36b, false),
    endStone: mat(0xe8e0aa, true), purpur: mat(0xb184c7, true), chorus: mat(0x77518f, true),
    endSky: mat(0x0b0611, false), emerald: mat(0x26d978, false), villageRoof: mat(0xb76b41, true),
    aetherGrass: mat(0x8bd96e, true), aetherDirt: mat(0x7c6744, true), holystone: mat(0xbfd2d5, true),
    cloud: mat(0xf4fbff, false, .78), skyroot: mat(0xc8a45f, true), ambrosium: mat(0xffe36e, false),
    zanite: mat(0x7b8cff, false), gravitite: mat(0xd28cff, false), aetherBrick: mat(0xe8dcae, true)
  };
  function mat(color, rough = true, opacity = 1) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough ? 0.86 : 0.35, metalness: rough ? 0.03 : 0.2, transparent: opacity < 1, opacity });
  }

  const itemDefs = {};
  function def(id, data) { itemDefs[id] = { id, ...data }; }
  function makeArmorTier(tier, label, material, defense, level, colorIcon) {
    const icon = colorIcon || '🛡️';
    def(`${tier}_helmet`, { name: `${label} Helmet`, icon: '⛑️', type: 'armor', slot: 'helmet', armor: defense * .18, rarity: level >= 8 ? 'legendary' : level >= 6 ? 'epic' : level >= 4 ? 'rare' : 'common', unlock: Math.max(1, level), material });
    def(`${tier}_chestplate`, { name: `${label} Chestplate`, icon, type: 'armor', slot: 'chestplate', armor: defense * .36, rarity: level >= 8 ? 'legendary' : level >= 6 ? 'epic' : level >= 4 ? 'rare' : 'common', unlock: Math.max(1, level), material });
    def(`${tier}_leggings`, { name: `${label} Leggings`, icon: '👖', type: 'armor', slot: 'leggings', armor: defense * .28, rarity: level >= 8 ? 'legendary' : level >= 6 ? 'epic' : level >= 4 ? 'rare' : 'common', unlock: Math.max(1, level), material });
    def(`${tier}_boots`, { name: `${label} Boots`, icon: '🥾', type: 'armor', slot: 'boots', armor: defense * .18, rarity: level >= 8 ? 'legendary' : level >= 6 ? 'epic' : level >= 4 ? 'rare' : 'common', unlock: Math.max(1, level), material });
  }

  def('training_bow', { name: 'Training Bow', icon: '🏹', type: 'bow', damage: 22, speed: 95, cooldown: .55, range: 95, rarity: 'common' });
  def('scout_bow', { name: 'Scout Bow', icon: '🏹', type: 'bow', damage: 25, speed: 105, cooldown: .45, range: 105, rarity: 'uncommon', unlock: 2 });
  def('runner_bow', { name: 'Runner Bow', icon: '🏹', type: 'bow', damage: 24, speed: 110, cooldown: .38, range: 95, moveBonus: .08, rarity: 'rare', unlock: 3 });
  def('assault_bow', { name: 'Assault Bow', icon: '🏹', type: 'bow', damage: 33, speed: 115, cooldown: .58, range: 120, rarity: 'rare', unlock: 4 });
  def('support_bow', { name: 'Support Bow', icon: '🏹', type: 'bow', damage: 28, speed: 105, cooldown: .5, range: 115, healTeam: true, rarity: 'rare', unlock: 4 });
  def('defender_bow', { name: 'Defender Bow', icon: '🏹', type: 'bow', damage: 36, speed: 100, cooldown: .66, range: 110, shieldBonus: .1, rarity: 'epic', unlock: 5 });
  def('sharpshooter_bow', { name: 'Sharpshooter Bow', icon: '🎯', type: 'bow', damage: 55, speed: 135, cooldown: .9, range: 160, rarity: 'epic', unlock: 6 });
  def('crossbow', { name: 'Crossbow', icon: '🎯', type: 'bow', damage: 48, speed: 130, cooldown: 1.05, range: 140, rarity: 'rare', unlock: 5 });
  def('storm_bow', { name: 'Storm Bow', icon: '⚡', type: 'bow', damage: 64, speed: 145, cooldown: .72, range: 150, rarity: 'legendary', unlock: 9 });

  def('wooden_arrow', { name: 'Wooden Arrow', icon: '➶', type: 'arrow', maxStack: 99, damage: 0, rarity: 'common' });
  def('iron_arrow', { name: 'Iron Arrow', icon: '➴', type: 'arrow', maxStack: 99, damage: 8, rarity: 'uncommon', unlock: 2 });
  def('fire_arrow', { name: 'Fire Arrow', icon: '🔥', type: 'arrow', maxStack: 64, damage: 14, fire: true, rarity: 'rare', unlock: 4 });
  def('poison_arrow', { name: 'Poison Arrow', icon: '🟢', type: 'arrow', maxStack: 64, damage: 10, poison: true, rarity: 'rare', unlock: 5 });
  def('piercing_arrow', { name: 'Piercing Arrow', icon: '✦', type: 'arrow', maxStack: 50, damage: 18, pierce: 1, rarity: 'epic', unlock: 6 });
  def('explosive_arrow', { name: 'Explosive Arrow', icon: '💥', type: 'arrow', maxStack: 32, damage: 24, explosive: true, rarity: 'legendary', unlock: 8 });

  const melee = [
    ['wood_sword','Wood Sword','⚔️',18,.48,3.2,'bladedLight','common',1], ['stone_sword','Stone Sword','⚔️',24,.52,3.4,'bladedLight','uncommon',2],
    ['iron_sword','Iron Sword','⚔️',32,.56,3.5,'bladedHeavy','rare',3], ['gold_sword','Gold Sword','⚔️',28,.38,3.4,'bladedLight','rare',3],
    ['diamond_sword','Diamond Sword','⚔️',44,.58,3.6,'bladedHeavy','epic',5], ['netherite_sword','Netherite Sword','⚔️',52,.62,3.7,'bladedHeavy','legendary',8],
    ['wood_axe','Wood Axe','🪓',24,.72,3.2,'bluntLight','common',1], ['stone_axe','Stone Axe','🪓',32,.78,3.3,'bluntLight','uncommon',2],
    ['iron_axe','Iron Axe','🪓',42,.84,3.4,'bluntHeavy','rare',4], ['gold_axe','Gold Axe','🪓',38,.55,3.4,'bluntLight','rare',4],
    ['diamond_axe','Diamond Axe','🪓',56,.9,3.5,'bluntHeavy','epic',6], ['netherite_axe','Netherite Axe','🪓',66,.95,3.6,'bluntHeavy','legendary',9],
    ['trident','Trident','🔱',48,.72,4.2,'pokeHeavy','epic',6], ['mace_weapon','Mace','🔨',68,1.05,3.4,'bluntHeavy','legendary',9],
    ['pickaxe','Pickaxe','⛏️',31,.65,3.2,'bluntLight','uncommon',2], ['shovel','Shovel','🥄',26,.5,3.3,'bladedLight','common',1],
    ['dagger','Dagger','🗡️',20,.32,2.6,'bladedLight','common',1], ['rapier','Rapier','🗡️',28,.42,3.8,'bladedLight','uncommon',2],
    ['katana','Katana','⚔️',42,.52,3.8,'bladedHeavy','epic',5], ['black_katana','Black Katana','⚔️',55,.48,3.9,'bladedHeavy','legendary',8],
    ['short_spear','Short Spear','📍',22,.36,4.2,'pokeLight','uncommon',2], ['sharpened_branch','Sharpened Branch','🌿',18,.32,4.0,'pokeLight','common',1],
    ['godendag','Godendag','🪵',34,.58,4.0,'pokeLight','rare',4], ['pitchfork','Pitchfork','🔱',34,.62,4.4,'pokeHeavy','rare',4],
    ['halberd','Halberd','🔱',46,.82,4.8,'pokeHeavy','epic',6], ['fang_tian','Fang Tian Ji','🔱',58,.9,4.9,'pokeHeavy','legendary',8],
    ['spear','Spear','🔱',39,.68,4.6,'pokeHeavy','rare',5], ['pilum','Pilum','📍',35,.65,4.5,'pokeHeavy','rare',5],
    ['spiked_mace','Spiked Mace','🔨',44,.78,3.4,'bluntLight','rare',4], ['morning_star','Morning Star','☄️',52,.86,3.5,'bluntHeavy','epic',6],
    ['maul','Maul','🔨',62,1.0,3.3,'bluntHeavy','epic',7], ['viking_axe','Viking Axe','🪓',45,.75,3.5,'bluntLight','rare',5],
    ['zweihander','Zweihander','⚔️',65,1.05,4.2,'bladedHeavy','legendary',9], ['flamberge','Flamberge','⚔️',72,1.1,4.2,'bladedHeavy','legendary',10],
    ['scythe','Scythe','⚔️',49,.82,4.1,'bladedHeavy','epic',6], ['falchion','Falchion','⚔️',40,.62,3.5,'bladedHeavy','rare',4]
  ];
  for (const [id,name,icon,damage,cooldown,reach,family,rarity,unlock] of melee) def(id, { name, icon, type: 'melee', damage, cooldown, reach, family, poost: family.startsWith('poke'), rarity, unlock });

  def('wooden_shield', { name: 'Wood Shield', icon: '🛡️', type: 'shield', slot: 'shield', block: .55, rarity: 'common' });
  def('iron_shield', { name: 'Iron Shield', icon: '🛡️', type: 'shield', slot: 'shield', block: .7, rarity: 'rare', unlock: 4 });
  def('tower_shield', { name: 'Tower Shield', icon: '🔰', type: 'shield', slot: 'shield', block: .86, rarity: 'epic', unlock: 6 });
  def('netherite_shield', { name: 'Netherite Shield', icon: '🔰', type: 'shield', slot: 'shield', block: .92, rarity: 'legendary', unlock: 9 });

  def('wood_block', { name: 'Wood Block', icon: '🟫', type: 'block', maxStack: 64, hp: 60, material: 'wood', rarity: 'common' });
  def('dirt_block', { name: 'Dirt Block', icon: '🟫', type: 'block', maxStack: 64, hp: 45, material: 'dirt', rarity: 'common' });
  def('stone_block', { name: 'Stone Block', icon: '⬛', type: 'block', maxStack: 64, hp: 100, material: 'stone', rarity: 'uncommon' });
  def('gold_block', { name: 'Gold Block', icon: '🟨', type: 'block', maxStack: 32, hp: 145, material: 'gold', rarity: 'rare', unlock: 3 });
  def('obsidian_block', { name: 'Obsidian Block', icon: '🟪', type: 'block', maxStack: 16, hp: 260, material: 'netherite', rarity: 'epic', unlock: 7 });
  def('netherrack_block', { name: 'Netherrack', icon: '🟥', type: 'block', maxStack: 64, hp: 35, material: 'netherrack', rarity: 'uncommon', unlock: 3 });
  def('nether_brick_block', { name: 'Nether Brick', icon: '🧱', type: 'block', maxStack: 64, hp: 120, material: 'netherBrick', rarity: 'rare', unlock: 5 });
  def('basalt_block', { name: 'Basalt', icon: '⬛', type: 'block', maxStack: 64, hp: 95, material: 'basalt', rarity: 'rare', unlock: 5 });
  def('glowstone_block', { name: 'Glowstone', icon: '🟨', type: 'block', maxStack: 64, hp: 25, material: 'glowstone', rarity: 'rare', unlock: 4 });
  def('magma_block', { name: 'Magma Block', icon: '🟧', type: 'block', maxStack: 64, hp: 80, material: 'lava', rarity: 'rare', unlock: 4 });
  def('end_stone_block', { name: 'End Stone', icon: '🟨', type: 'block', maxStack: 64, hp: 110, material: 'endStone', rarity: 'rare', unlock: 6 });
  def('purpur_block', { name: 'Purpur Block', icon: '🟪', type: 'block', maxStack: 64, hp: 95, material: 'purpur', rarity: 'rare', unlock: 7 });
  def('end_rod', { name: 'End Rod', icon: '┃', type: 'block', maxStack: 64, hp: 18, material: 'glowstone', flat: true, rarity: 'rare', unlock: 7 });
  def('chorus_flower', { name: 'Chorus Flower', icon: '✿', type: 'block', maxStack: 64, hp: 18, material: 'chorus', rarity: 'rare', unlock: 7 });
  def('end_crystal', { name: 'End Crystal', icon: '◇', type: 'block', maxStack: 16, hp: 12, material: 'glass', endCrystal: true, rarity: 'epic', unlock: 8 });
  def('dragon_egg', { name: 'Dragon Egg', icon: '🥚', type: 'block', maxStack: 1, hp: 300, material: 'black', rarity: 'legendary', unlock: 10 });
  def('dragon_head', { name: 'Dragon Head', icon: '🐲', type: 'block', maxStack: 1, hp: 90, material: 'black', rarity: 'legendary', unlock: 9 });
  def('aether_grass_block', { name: 'Aether Grass', icon: '🟩', type: 'block', maxStack: 64, hp: 55, material: 'aetherGrass', rarity: 'rare', unlock: 6 });
  def('holystone_block', { name: 'Holystone', icon: '⬜', type: 'block', maxStack: 64, hp: 115, material: 'holystone', rarity: 'rare', unlock: 6 });
  def('cloud_block', { name: 'Cloud Block', icon: '☁️', type: 'block', maxStack: 64, hp: 18, material: 'cloud', rarity: 'rare', unlock: 6 });
  def('skyroot_block', { name: 'Skyroot Block', icon: '🟫', type: 'block', maxStack: 64, hp: 55, material: 'skyroot', rarity: 'rare', unlock: 6 });
  def('aether_brick_block', { name: 'Aether Brick', icon: '▥', type: 'block', maxStack: 64, hp: 125, material: 'aetherBrick', rarity: 'epic', unlock: 7 });
  def('gravitite_ore', { name: 'Gravitite Ore', icon: '💜', type: 'block', maxStack: 32, hp: 145, material: 'gravitite', rarity: 'epic', unlock: 7 });
  def('crafting_table', { name: 'Crafting Table', icon: '▦', type: 'block', maxStack: 64, hp: 55, material: 'wood', craftingTable: true, rarity: 'common' });
  def('furnace', { name: 'Furnace', icon: '▥', type: 'block', maxStack: 64, hp: 95, material: 'stone', furnace: true, rarity: 'common' });
  def('bed', { name: 'Bed', icon: '🛏️', type: 'block', maxStack: 16, hp: 25, material: 'wood', bed: true, rarity: 'common' });
  def('respawn_anchor', { name: 'Respawn Anchor', icon: '⬛', type: 'block', maxStack: 16, hp: 180, material: 'netherite', respawnAnchor: true, rarity: 'epic', unlock: 6 });
  def('command_block', { name: 'Command Block', icon: '🧱', type: 'block', maxStack: 16, hp: 180, material: 'command', commandBlock: true, rarity: 'epic', unlock: 5 });
  def('tnt', { name: 'TNT', icon: '🧨', type: 'block', maxStack: 64, hp: 20, material: 'tnt', tnt: true, rarity: 'rare', unlock: 4 });
  def('piston', { name: 'Piston', icon: '▣', type: 'block', maxStack: 64, hp: 120, material: 'piston', piston: true, rarity: 'rare', unlock: 4 });
  def('sticky_piston', { name: 'Sticky Piston', icon: '▣', type: 'block', maxStack: 64, hp: 120, material: 'piston', piston: true, sticky: true, rarity: 'rare', unlock: 5 });
  def('redstone_dust', { name: 'Redstone Dust', icon: '🔴', type: 'block', maxStack: 64, hp: 8, material: 'redstone', redstone: true, flat: true, rarity: 'uncommon', unlock: 3 });
  def('redstone_repeater', { name: 'Redstone Repeater', icon: '▶', type: 'block', maxStack: 64, hp: 30, material: 'redstone', redstone: true, repeater: true, flat: true, rarity: 'rare', unlock: 4 });
  def('redstone_comparator', { name: 'Redstone Comparator', icon: '▷', type: 'block', maxStack: 64, hp: 30, material: 'redstone', redstone: true, comparator: true, flat: true, rarity: 'rare', unlock: 5 });
  def('dispenser', { name: 'Dispenser', icon: '▤', type: 'block', maxStack: 64, hp: 110, material: 'stone', dispenser: true, rarity: 'rare', unlock: 4 });
  def('dropper', { name: 'Dropper', icon: '▥', type: 'block', maxStack: 64, hp: 100, material: 'stone', dropper: true, rarity: 'rare', unlock: 4 });
  def('lever', { name: 'Lever', icon: '⌁', type: 'block', maxStack: 64, hp: 10, material: 'wood', powerSwitch: true, flat: true, rarity: 'uncommon', unlock: 3 });
  def('button', { name: 'Button', icon: '●', type: 'block', maxStack: 64, hp: 8, material: 'wood', button: true, flat: true, rarity: 'uncommon', unlock: 3 });
  def('flint_steel', { name: 'Flint and Steel', icon: '🔥', type: 'tool', flintSteel: true, rarity: 'rare', unlock: 4 });
  def('medkit', { name: 'Med Kit', icon: '➕', type: 'consumable', maxStack: 5, heal: 45, rarity: 'common' });
  def('golden_apple', { name: 'Golden Apple', icon: '🍎', type: 'consumable', maxStack: 16, goldenApple: true, rarity: 'rare', unlock: 4 });
  def('firework_rocket', { name: 'Firework Rocket', icon: '🎆', type: 'consumable', maxStack: 64, firework: true, rarity: 'rare', unlock: 6 });
  def('totem_undying', { name: 'Totem of Undying', icon: '✨', type: 'totem', maxStack: 1, totem: true, rarity: 'legendary', unlock: 8 });
  def('shulker_box', { name: 'Shulker Box', icon: '🟪', type: 'shulker', maxStack: 1, shulker: true, rarity: 'epic', unlock: 7 });
  def('lapis', { name: 'Lapis', icon: '🔷', type: 'material', maxStack: 64, rarity: 'rare' });
  def('ender_pearl', { name: 'Ender Pearl', icon: '🟣', type: 'consumable', maxStack: 16, blink: true, rarity: 'epic', unlock: 5 });
  def('eye_of_ender', { name: 'Eye of Ender', icon: '🟢', type: 'consumable', maxStack: 16, eyeEnder: true, rarity: 'epic', unlock: 6 });
  def('chorus_fruit', { name: 'Chorus Fruit', icon: '🍇', type: 'consumable', maxStack: 64, chorusFruit: true, rarity: 'rare', unlock: 7 });
  def('popped_chorus_fruit', { name: 'Popped Chorus Fruit', icon: '🟣', type: 'material', maxStack: 64, rarity: 'rare', unlock: 7 });
  def('shulker_shell', { name: 'Shulker Shell', icon: '◧', type: 'material', maxStack: 64, rarity: 'epic', unlock: 7 });
  def('emerald', { name: 'Emerald', icon: '💚', type: 'material', maxStack: 64, rarity: 'rare', unlock: 2 });
  def('ambrosium_shard', { name: 'Ambrosium Shard', icon: '🟡', type: 'material', maxStack: 64, rarity: 'rare', unlock: 6 });
  def('zanite_gem', { name: 'Zanite Gem', icon: '🔵', type: 'material', maxStack: 64, rarity: 'epic', unlock: 7 });
  def('aether_key', { name: 'Aether Dungeon Key', icon: '🗝️', type: 'material', maxStack: 16, rarity: 'epic', unlock: 7 });
  def('valkyrie_lance', { name: 'Valkyrie Lance', icon: '🔱', type: 'melee', damage: 64, cooldown: .76, reach: 5.3, family: 'pokeHeavy', poost: true, rarity: 'legendary', unlock: 8 });
  def('water_bucket', { name: 'Water Bucket', icon: '💧', type: 'consumable', maxStack: 1, waterBucket: true, rarity: 'uncommon', unlock: 2 });
  def('empty_bucket', { name: 'Empty Bucket', icon: '◻', type: 'material', maxStack: 16, rarity: 'common', unlock: 2 });
  def('compass', { name: 'Compass', icon: '🧭', type: 'tool', compass: true, rarity: 'uncommon', unlock: 2 });
  def('clock', { name: 'Clock', icon: '🕘', type: 'tool', clock: true, rarity: 'uncommon', unlock: 2 });

  makeArmorTier('leather','Leather','leather', .10, 1, '🥋');
  makeArmorTier('gold','Gold','gold', .16, 2, '🟨');
  makeArmorTier('chainmail','Chainmail','chain', .20, 3, '⛓️');
  makeArmorTier('iron','Iron','iron', .28, 4, '🛡️');
  makeArmorTier('diamond','Diamond','diamond', .40, 6, '💎');
  makeArmorTier('netherite','Netherite','netherite', .50, 9, '⬛');
  def('turtle_helmet', { name: 'Turtle Helmet', icon: '🐢', type: 'armor', slot: 'helmet', armor: .12, waterBreathing: true, rarity: 'rare', unlock: 4, material: 'diamond' });
  def('elytra_wings', { name: 'Elytra Wings', icon: '🪽', type: 'armor', slot: 'wings', armor: .02, glide: true, rarity: 'legendary', unlock: 8, material: 'chain' });

  const ENCHANTS = {
    armor: ['Protection', 'Projectile Protection', 'Fire Protection', 'Blast Protection', 'Thorns', 'Unbreaking', 'Feather Falling', 'Swift Sneak', 'Mending'],
    bow: ['Power', 'Punch', 'Flame', 'Infinity', 'Piercing', 'Quick Charge', 'Multishot', 'Unbreaking', 'Mending'],
    melee: ['Sharpness', 'Knockback', 'Looting', 'Fire Aspect', 'Poost Burst', 'Unbreaking', 'Mending'],
    shield: ['Unbreaking', 'Thorns', 'Shield Guard', 'Mending'],
    wings: ['Unbreaking', 'Feather Falling', 'Swift Glide', 'Mending']
  };

  const CRAFTING_RECIPES = [
    { out: 'crafting_table', count: 1, in: { wood_block: 4 } },
    { out: 'furnace', count: 1, in: { stone_block: 8 } },
    { out: 'bed', count: 1, in: { wood_block: 3, leather_chestplate: 1 } },
    { out: 'empty_bucket', count: 1, in: { iron_sword: 1 } },
    { out: 'water_bucket', count: 1, in: { empty_bucket: 1, lapis: 1 } },
    { out: 'compass', count: 1, in: { redstone_dust: 4, iron_sword: 1 } },
    { out: 'clock', count: 1, in: { redstone_dust: 2, gold_block: 1 } },
    { out: 'eye_of_ender', count: 2, in: { ender_pearl: 2, glowstone_block: 1 } },
    { out: 'wooden_arrow', count: 16, in: { wood_block: 1, stone_block: 1 } },
    { out: 'iron_arrow', count: 12, in: { wooden_arrow: 12, iron_sword: 1 } },
    { out: 'tnt', count: 2, in: { dirt_block: 4, fire_arrow: 1 } },
    { out: 'redstone_dust', count: 8, in: { stone_block: 2, lapis: 1 } },
    { out: 'lever', count: 2, in: { wood_block: 1, stone_block: 1 } },
    { out: 'button', count: 4, in: { stone_block: 1 } },
    { out: 'shulker_box', count: 1, in: { obsidian_block: 2, nether_brick_block: 2, ender_pearl: 1 } },
    { out: 'shulker_box', count: 1, in: { shulker_shell: 2, purpur_block: 2 } },
    { out: 'end_crystal', count: 1, in: { obsidian_block: 1, eye_of_ender: 1, glowstone_block: 1 } },
    { out: 'respawn_anchor', count: 1, in: { obsidian_block: 4, glowstone_block: 2, ender_pearl: 1 } },
    { out: 'firework_rocket', count: 6, in: { tnt: 1, fire_arrow: 2 } },
    { out: 'golden_apple', count: 1, in: { gold_block: 2, medkit: 1 } },
    { out: 'cloud_block', count: 4, in: { ambrosium_shard: 1, water_bucket: 1 } },
    { out: 'aether_brick_block', count: 4, in: { holystone_block: 4, ambrosium_shard: 1 } },
    { out: 'valkyrie_lance', count: 1, in: { zanite_gem: 3, gravitite_ore: 1, iron_sword: 1 } }
  ];
  const FURNACE_RECIPES = [
    { out: 'stone_block', count: 1, in: { dirt_block: 1 } },
    { out: 'gold_block', count: 1, in: { stone_block: 6, wood_block: 1 } },
    { out: 'obsidian_block', count: 1, in: { magma_block: 2, stone_block: 2 } },
    { out: 'nether_brick_block', count: 2, in: { netherrack_block: 4 } },
    { out: 'popped_chorus_fruit', count: 2, in: { chorus_fruit: 2 } },
    { out: 'purpur_block', count: 4, in: { popped_chorus_fruit: 4 } },
    { out: 'basalt_block', count: 2, in: { netherrack_block: 2, stone_block: 2 } },
    { out: 'glowstone_block', count: 1, in: { magma_block: 1, lapis: 1 } },
    { out: 'fire_arrow', count: 8, in: { wooden_arrow: 8, magma_block: 1 } },
    { out: 'ambrosium_shard', count: 3, in: { holystone_block: 2 } },
    { out: 'zanite_gem', count: 1, in: { gravitite_ore: 1 } }
  ];
  const VILLAGER_TRADES = {
    Farmer: [
      { out: 'emerald', count: 2, in: { dirt_block: 8 } },
      { out: 'golden_apple', count: 1, in: { emerald: 6 } },
      { out: 'chorus_fruit', count: 4, in: { emerald: 5 } }
    ],
    Fletcher: [
      { out: 'iron_arrow', count: 24, in: { emerald: 3 } },
      { out: 'fire_arrow', count: 12, in: { emerald: 5, magma_block: 1 } },
      { out: 'ender_pearl', count: 2, in: { emerald: 7 } }
    ],
    Cleric: [
      { out: 'eye_of_ender', count: 2, in: { emerald: 8, ender_pearl: 1 } },
      { out: 'totem_undying', count: 1, in: { emerald: 18, gold_block: 2 } },
      { out: 'respawn_anchor', count: 1, in: { emerald: 12, glowstone_block: 2 } }
    ],
    Armorer: [
      { out: 'diamond_chestplate', count: 1, in: { emerald: 16, gold_block: 2 } },
      { out: 'netherite_shield', count: 1, in: { emerald: 20, obsidian_block: 2 } },
      { out: 'elytra_wings', count: 1, in: { emerald: 28, shulker_shell: 2 } }
    ]
  };

  const rarityOrder = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
  const unlocksByLevel = {};
  for (const id in itemDefs) {
    const u = itemDefs[id].unlock;
    if (u && u > 1) (unlocksByLevel[u] ||= []).push(id);
  }

  function stackMax(id) { return itemDefs[id].maxStack || 1; }
  function canStack(id) { return stackMax(id) > 1; }
  function makeStack(id, count = 1) {
    const stack = { id, count, uid: Math.random().toString(36).slice(2), enchants: {} };
    if (itemDefs[id]?.shulker) stack.contents = [];
    return stack;
  }
  function stackLabel(s) { return s ? itemDefs[s.id].name : ''; }
  function enchantPower(stack) { return stack && stack.enchants ? Object.values(stack.enchants).reduce((a,b)=>a+b,0) : 0; }
  function hasEnchant(stack, name) { return stack && stack.enchants && stack.enchants[name]; }

  function createInventory() { return { hotbar: Array(9).fill(null), backpack: Array(36).fill(null), selected: 0 }; }
  function addItem(inv, id, count = 1, preferHotbar = false) {
    let remaining = count;
    const areas = preferHotbar ? [inv.hotbar, inv.backpack] : [inv.backpack, inv.hotbar];
    if (canStack(id)) {
      for (const area of areas) for (const s of area) {
        if (s && s.id === id && s.count < stackMax(id)) {
          const add = Math.min(remaining, stackMax(id) - s.count);
          s.count += add; remaining -= add;
          if (remaining <= 0) return true;
        }
      }
    }
    for (const area of areas) for (let i = 0; i < area.length; i++) {
      if (!area[i]) {
        const add = Math.min(remaining, stackMax(id));
        area[i] = makeStack(id, add);
        remaining -= add;
        if (remaining <= 0) return true;
      }
    }
    if (id !== 'shulker_box') {
      for (const area of [inv.hotbar, inv.backpack]) for (const s of area) {
        if (s && itemDefs[s.id]?.shulker) {
          s.contents ||= [];
          if (s.contents.length < 27) {
            s.contents.push(makeStack(id, Math.min(remaining, stackMax(id))));
            return true;
          }
        }
      }
    }
    return false;
  }

  function insertStack(inv, stack, preferHotbar = true) {
    const areas = preferHotbar ? [inv.hotbar, inv.backpack] : [inv.backpack, inv.hotbar];
    if (canStack(stack.id)) {
      for (const area of areas) for (const s of area) {
        if (s && s.id === stack.id && JSON.stringify(s.enchants || {}) === JSON.stringify(stack.enchants || {}) && s.count < stackMax(stack.id)) {
          const add = Math.min(stack.count, stackMax(stack.id) - s.count);
          s.count += add; stack.count -= add;
          if (stack.count <= 0) return true;
        }
      }
    }
    for (const area of areas) for (let i = 0; i < area.length; i++) {
      if (!area[i]) { area[i] = stack; return true; }
    }
    return false;
  }

  function removeItem(inv, id, count = 1) {
    let need = count;
    for (const area of [inv.hotbar, inv.backpack]) for (let i = 0; i < area.length; i++) {
      const s = area[i];
      if (s && s.id === id) {
        const n = Math.min(need, s.count); s.count -= n; need -= n;
        if (s.count <= 0) area[i] = null;
        if (need <= 0) return true;
      }
    }
    return false;
  }
  function countItem(inv, id) {
    let total = 0;
    for (const area of [inv.hotbar, inv.backpack]) for (const s of area) if (s && s.id === id) total += s.count;
    return total;
  }
  function findFirst(inv, predicate) {
    for (const area of [inv.hotbar, inv.backpack]) for (const s of area) if (s && predicate(s, itemDefs[s.id])) return s;
    return null;
  }
  function selectedStack() { return player.inventory.hotbar[player.inventory.selected]; }
  function isMiningTool(stack = selectedStack()) {
    const id = String(stack?.id || '');
    return id.includes('pickaxe') || id.includes('axe');
  }
  function bestArrow(inv) {
    const order = ['explosive_arrow','piercing_arrow','fire_arrow','poison_arrow','iron_arrow','wooden_arrow'];
    for (const id of order) if (countItem(inv, id) > 0) return id;
    return null;
  }

  const colliders = [];
  const entities = [];
  const projectiles = [];
  const lootDrops = [];
  const chests = [];
  const placedBlocks = new Map();
  const brokenFloor = new Map();
  let activeShulker = null;
  const flags = {
    blue: { team: 'blue', home: new THREE.Vector3(-72, 0, 72), pos: new THREE.Vector3(-72, 0, 72), carrier: null, mesh: null },
    red: { team: 'red', home: new THREE.Vector3(72, 0, -72), pos: new THREE.Vector3(72, 0, -72), carrier: null, mesh: null }
  };
  const score = { blue: 0, red: 0 };
  const worldRules = { keepInventory: false, mobGriefing: true, doFireTick: true };
  let gameMode = 'survival';

  function vecXZ(x, z) { return new THREE.Vector3(x, 0, z); }
  function distXZ(a, b) { const dx = a.x - b.x, dz = a.z - b.z; return Math.hypot(dx, dz); }
  function yawDir() { return new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize(); }
  function rightDir() { return new THREE.Vector3(-Math.cos(yaw), 0, Math.sin(yaw)).normalize(); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rand(min, max) { return min + Math.random() * (max - min); }
  function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function nowSec() { return performance.now() / 1000; }
  function cellKey(x, z) { return `${Math.round(x)},${Math.round(z)}`; }
  function gridSnap(v) { return Math.round(v / 4) * 4; }
  function objectDimension() { return buildDimension || currentDimension; }
  function trackDimensionObject(mesh, dimension = objectDimension()) {
    mesh.userData.dimension = dimension;
    if (dimensionMeshes[dimension]) dimensionMeshes[dimension].push(mesh);
    mesh.visible = dimension === currentDimension;
  }

  function addBox(name, x, y, z, sx, sy, sz, material, solid = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
    mesh.position.set(x, y + sy / 2, z);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = name;
    scene.add(mesh);
    trackDimensionObject(mesh);
    if (solid) colliders.push({ mesh, min: new THREE.Vector3(x - sx/2, y, z - sz/2), max: new THREE.Vector3(x + sx/2, y + sy, z + sz/2), kind: name, dimension: objectDimension() });
    return mesh;
  }
  function addCylinder(name, x, y, z, r, h, material, solid = true, sides = 10) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, sides), material);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = name;
    scene.add(mesh);
    trackDimensionObject(mesh);
    if (solid) colliders.push({ mesh, min: new THREE.Vector3(x - r, y, z - r), max: new THREE.Vector3(x + r, y + h, z + r), kind: name, dimension: objectDimension() });
    return mesh;
  }

  function buildWorld() {
    buildDimension = 'overworld';
    addBox('grass', 0, -0.2, 0, WORLD + 18, .4, WORLD + 18, mats.grass, false);
    addBox('path', 0, -0.18, 0, 22, .08, WORLD + 4, mats.dirt, false);
    addBox('path', 0, -0.17, 0, WORLD + 4, .08, 20, mats.dirt, false);
    for (let i = -4; i <= 4; i++) {
      addBox('stone path', i * 12, -0.15, i * -12, 6, .09, 6, mats.stoneDark, false);
    }

    // Outer castle walls and towers.
    addBox('north wall', 0, 0, -88, WORLD, 12, 4, mats.stone);
    addBox('south wall', 0, 0, 88, WORLD, 12, 4, mats.stone);
    addBox('west wall', -88, 0, 0, 4, 12, WORLD, mats.stone);
    addBox('east wall', 88, 0, 0, 4, 12, WORLD, mats.stone);
    for (const [x,z] of [[-82,-82],[82,-82],[-82,82],[82,82]]) {
      addCylinder('round tower', x, 0, z, 8, 17, mats.stone, true, 12);
      addCylinder('tower roof', x, 17, z, 8.5, 4, mats.roof, false, 12);
    }
    // Battlements.
    for (let i = -80; i <= 80; i += 12) {
      addBox('crenel north', i, 12, -88, 5, 3, 4.5, mats.stoneDark);
      addBox('crenel south', i, 12, 88, 5, 3, 4.5, mats.stoneDark);
      addBox('crenel west', -88, 12, i, 4.5, 3, 5, mats.stoneDark);
      addBox('crenel east', 88, 12, i, 4.5, 3, 5, mats.stoneDark);
    }
    // Interior structures, cover, ramps, crates.
    addBox('blue keep', -64, 0, 64, 24, 14, 24, mats.stone, false);
    addBox('red keep', 64, 0, -64, 24, 14, 24, mats.stone, false);
    addBox('bridge wall', 0, 0, -22, 54, 8, 4, mats.stone);
    addBox('bridge wall', 0, 0, 22, 54, 8, 4, mats.stone);
    addBox('middle tower', 0, 0, 0, 13, 19, 13, mats.stone);
    addBox('middle ladder marker', -8, 0, 0, 1, 16, 7, mats.wood, false);
    addBox('barrels edgeboost', -16, 0, 13, 7, 4, 5, mats.wood, true);
    addBox('barrels edgeboost', 18, 0, -14, 7, 4, 5, mats.wood, true);
    addSecretTunnel(-72, 20, 72, -20, 'Hidden Wall Tunnel');
    addSecretTunnel(0, 68, 0, -68, 'Ancient Tower Passage');
    addNetherPortal(0, 42, 'Nether Portal', 'nether', new THREE.Vector3(0, 0, 64));
    addNetherPortal(-42, 42, 'End Portal', 'end', new THREE.Vector3(0, 0, -30));
    addNetherPortal(42, 42, 'Aether Portal', 'aether', new THREE.Vector3(0, 0, 0));
    buildVillage();

    // Decorations.
    for (let i = 0; i < 16; i++) {
      const x = rand(-70, 70), z = rand(-70, 70);
      if (Math.abs(x) < 18 && Math.abs(z) < 28) continue;
      const trunk = addCylinder('tree trunk', x, 0, z, .8, 5, mats.wood, true, 6);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(4.2, 8, 7), mat(0x3f7f39, true));
      crown.position.set(x, 8, z); crown.castShadow = true; scene.add(crown);
      colliders.push({ mesh: trunk, min: new THREE.Vector3(x-1,0,z-1), max: new THREE.Vector3(x+1,5,z+1), kind: 'tree' });
    }
    createFlag('blue'); createFlag('red');
    spawnChests();
    buildDimension = null;
  }

  function buildVillage() {
    const houses = [[-58,-14],[-44,-4],[-32,-16],[-52,8]];
    for (const [x,z] of houses) {
      addBox('village house', x, 0, z, 9, 5, 8, mats.wood, true);
      addBox('village roof', x, 5, z, 10, 2.4, 9, mats.villageRoof, false);
      addBox('village door', x, .1, z - 4.15, 2, 3, .25, mats.black, false);
      addBox('village window', x - 3.2, 2.4, z - 4.18, 1.2, 1.1, .18, mats.glass, false);
      addBox('village window', x + 3.2, 2.4, z - 4.18, 1.2, 1.1, .18, mats.glass, false);
    }
    addBox('village well', -43, 0, -26, 5, 1.3, 5, mats.stone, true);
    addBox('village path', -46, -0.12, -12, 38, .1, 8, mats.dirt, false);
    addVillager(-42, -22, 'Farmer');
    addVillager(-54, -4, 'Fletcher');
    addVillager(-34, -8, 'Cleric');
    addVillager(-58, 7, 'Armorer');
  }

  function buildNetherWorld() {
    buildDimension = 'nether';
    addBox('netherrack floor', 0, -0.22, 0, WORLD + 18, .45, WORLD + 18, mats.netherrack, false);
    addLavaPool(-58, -18, 46, 72, 'Lava Sea');
    addLavaPool(56, 28, 48, 58, 'Lava Sea');
    addLavaPool(0, -8, 20, 12, 'Lava River');
    lavaHazards.push({ dimension: 'nether', x: -58, z: -18, sx: 46, sz: 72 }, { dimension: 'nether', x: 56, z: 28, sx: 48, sz: 58 });
    lavaHazards.push({ dimension: 'nether', x: 0, z: -8, sx: 20, sz: 12 });

    addBox('nether north wall', 0, 0, -88, WORLD, 18, 4, mats.netherrack);
    addBox('nether south wall', 0, 0, 88, WORLD, 18, 4, mats.netherrack);
    addBox('nether west wall', -88, 0, 0, 4, 18, WORLD, mats.netherrack);
    addBox('nether east wall', 88, 0, 0, 4, 18, WORLD, mats.netherrack);

    for (const [x,z,h] of [[-68,-62,24],[-46,56,19],[62,-54,22],[72,64,28],[-18,-72,18],[20,76,16]]) {
      addCylinder('basalt pillar', x, 0, z, 2.8, h, mats.basalt, true, 7);
      addBox('glowstone vein', x + 2.4, h * .55, z - 1.3, 1.2, 1.2, 1.2, mats.glowstone, false);
    }

    for (const [x,z,matr,label] of [[-34,34,mats.crimson,'crimson fungus'],[-26,46,mats.crimson,'crimson fungus'],[38,-42,mats.warped,'warped fungus'],[48,-32,mats.warped,'warped fungus']]) addNetherFungusTree(x, z, matr, label);

    addBox('soul sand valley', 0, -0.1, -58, 46, .12, 24, mats.soul, false);
    for (let i = -22; i <= 22; i += 11) addBox('bone fossil', i, .05, -58 + (i % 2 ? 6 : -5), 8, .8, 1.1, mats.white, false);

    addBox('fortress bridge', 0, 4, 4, 76, 3, 9, mats.netherBrick, true);
    addBox('fortress corridor', 20, 4, -20, 12, 9, 54, mats.netherBrick, true);
    addBox('fortress tower left', -34, 0, 4, 10, 16, 10, mats.netherBrick, true);
    addBox('fortress tower right', 34, 0, 4, 10, 16, 10, mats.netherBrick, true);
    for (let x = -32; x <= 32; x += 8) {
      addBox('fortress fence north', x, 7, -1.8, 2, 2.3, .8, mats.netherBrick, true);
      addBox('fortress fence south', x, 7, 9.8, 2, 2.3, .8, mats.netherBrick, true);
    }
    addNetherPortal(0, 70, 'Return Portal', 'overworld', new THREE.Vector3(0, 0, 42));
    spawnNetherChests();
    buildDimension = null;
  }

  function buildEndWorld() {
    buildDimension = 'end';
    addBox('end void', 0, -0.35, 0, WORLD + 18, .25, WORLD + 18, mats.endSky, false);
    addEndIsland(0, 0, 72, 72, 'main end island');
    addEndIsland(-58, 48, 26, 24, 'outer end island');
    addEndIsland(58, -42, 30, 26, 'outer end island');
    addEndIsland(48, 58, 22, 22, 'outer end island');
    addEndIsland(-54, -50, 24, 20, 'outer end island');
    endVoidZones.push({ x: 0, z: 0, sx: 72, sz: 72 }, { x: -58, z: 48, sx: 26, sz: 24 }, { x: 58, z: -42, sx: 30, sz: 26 }, { x: 48, z: 58, sx: 22, sz: 22 }, { x: -54, z: -50, sx: 24, sz: 20 });
    for (const [x,z,h] of [[-28,-28,26],[28,-26,30],[-30,28,24],[30,30,28],[0,-34,32],[0,34,22]]) {
      addCylinder('obsidian pillar', x, 0, z, 3.2, h, mats.black, true, 10);
      addBox('end crystal perch', x, h, z, 2.5, .4, 2.5, mats.glass, false);
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.1), mats.glass);
      crystal.position.set(x, h + 2, z); scene.add(crystal); trackDimensionObject(crystal, 'end');
      const light = new THREE.PointLight(0xd7b6ff, 1.3, 18); light.position.set(x, h + 2, z); scene.add(light); trackDimensionObject(light, 'end');
    }
    addBox('exit portal frame', 0, 0, 28, 9, .7, 9, mats.black, false);
    addNetherPortal(0, 28, 'Exit Portal', 'overworld', new THREE.Vector3(-42, 0, 42));
    buildEndCity(58, -42);
    buildEndShip(48, 58);
    for (const [x,z] of [[-22,10],[-14,24],[12,-18],[26,6],[-58,48],[58,-42],[48,58]]) addChorusPlant(x, z);
    spawnEndChests();
    buildDimension = null;
  }

  function buildAetherWorld() {
    buildDimension = 'aether';
    addBox('aether sky', 0, -0.38, 0, WORLD + 18, .22, WORLD + 18, mats.cloud, false);
    addAetherIsland(0, 0, 58, 48, 'main aether island');
    addAetherIsland(-54, 34, 26, 24, 'skyroot island');
    addAetherIsland(54, 34, 24, 22, 'cloud island');
    addAetherIsland(-46, -48, 28, 22, 'holystone island');
    addAetherIsland(48, -48, 30, 24, 'dungeon island');
    aetherSafeZones.push({ x: 0, z: 0, sx: 58, sz: 48 }, { x: -54, z: 34, sx: 26, sz: 24 }, { x: 54, z: 34, sx: 24, sz: 22 }, { x: -46, z: -48, sx: 28, sz: 22 }, { x: 48, z: -48, sx: 30, sz: 24 });
    addBox('cloud bridge north', -27, .05, 17, 30, .35, 5, mats.cloud, false);
    addBox('cloud bridge east', 27, .05, 17, 30, .35, 5, mats.cloud, false);
    addBox('cloud bridge southwest', -24, .05, -25, 36, .35, 5, mats.cloud, false);
    addBox('cloud bridge southeast', 24, .05, -25, 36, .35, 5, mats.cloud, false);
    addNetherPortal(0, 14, 'Return Portal', 'overworld', new THREE.Vector3(42, 0, 42));
    for (const [x,z] of [[-56,32],[-48,38],[10,18],[56,32]]) addSkyrootTree(x, z);
    for (const [x,z] of [[-16,-14],[18,-12],[-42,-50],[52,-54],[44,-42]]) {
      addBox('holystone outcrop', x, 0, z, 5, 3.2, 5, mats.holystone, true);
      addBox('ambrosium vein', x + 1.8, 2.2, z - 1.2, 1.1, 1.1, 1.1, mats.ambrosium, false);
    }
    buildAetherDungeon(48, -48);
    spawnAetherChests();
    buildDimension = null;
  }

  function addAetherIsland(x, z, sx, sz, name) {
    addBox(name, x, -0.15, z, sx, .36, sz, mats.aetherGrass, false);
    addBox(name + ' dirt', x, -0.62, z, sx * .88, .8, sz * .88, mats.aetherDirt, false);
    addBox(name + ' cloud rim', x, -0.95, z, sx * .7, .55, sz * .7, mats.cloud, false);
  }

  function addSkyrootTree(x, z) {
    addCylinder('skyroot trunk', x, 0, z, .75, 5.5, mats.skyroot, true, 7);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(3.4, 10, 8), mats.aetherGrass);
    crown.position.set(x, 7.4, z); crown.castShadow = true; scene.add(crown); trackDimensionObject(crown, 'aether');
    addBox('golden leaves', x, 7.2, z, 5.8, 1.2, 5.8, mats.ambrosium, false);
  }

  function buildAetherDungeon(x, z) {
    addBox('aether dungeon base', x, 0, z, 18, 7, 18, mats.aetherBrick, true);
    addBox('aether dungeon cap', x, 7, z, 20, 2.4, 20, mats.holystone, true);
    addBox('aether altar', x, 9.4, z, 5, 1.4, 5, mats.gravitite, false);
    addBox('valkyrie arch left', x - 8.5, 7.2, z, 1.1, 8, 2, mats.aetherBrick, true);
    addBox('valkyrie arch right', x + 8.5, 7.2, z, 1.1, 8, 2, mats.aetherBrick, true);
    addBox('valkyrie arch top', x, 14.5, z, 18, 1.1, 2, mats.aetherBrick, true);
    const label = makeLabel('AETHER DUNGEON', '#fff3a3', 'rgba(54,64,90,.72)');
    label.position.set(x, 17, z); label.scale.set(7, 1.1, 1); scene.add(label); trackDimensionObject(label, 'aether');
  }

  function addEndIsland(x, z, sx, sz, name) {
    addBox(name, x, -0.12, z, sx, .35, sz, mats.endStone, false);
    addBox(name + ' rim', x, -0.55, z, sx * .9, .9, sz * .9, mats.endStone, false);
  }

  function addChorusPlant(x, z) {
    let y = 0;
    for (let i = 0; i < 4; i++) { addBox('chorus stem', x, y, z, .9, 2.2, .9, mats.chorus, false); y += 2.1; }
    for (const [dx,dz] of [[2,0],[-2,0],[0,2],[0,-2]]) {
      addBox('chorus branch', x + dx / 2, y - 1.8, z + dz / 2, Math.abs(dx) ? 2.2 : .8, .8, Math.abs(dz) ? 2.2 : .8, mats.chorus, false);
      addBox('chorus flower', x + dx, y - 1.4, z + dz, 1.1, 1.1, 1.1, mats.purpur, false);
    }
  }

  function buildEndCity(x, z) {
    addBox('end city base', x, 0, z, 12, 9, 12, mats.purpur, true);
    addBox('end city tower', x, 9, z, 8, 20, 8, mats.purpur, true);
    addBox('end city cap', x, 29, z, 11, 5, 11, mats.purpur, true);
    addBox('end rods', x - 5, 32, z, .35, 5, .35, mats.glowstone, false);
    addBox('end rods', x + 5, 32, z, .35, 5, .35, mats.glowstone, false);
    addBox('end city bridge', x - 23, 14, z, 34, 3, 5, mats.purpur, true);
  }

  function buildEndShip(x, z) {
    addBox('end ship hull', x, 8, z, 21, 4, 7, mats.purpur, true);
    addBox('end ship mast', x, 12, z, 1, 12, 1, mats.endStone, false);
    addBox('end ship sail', x, 17, z, .45, 8, 10, mats.glass, false);
    addBox('dragon head prow', x - 12, 9.5, z, 3, 2, 2.4, mats.black, false);
  }

  function addLavaPool(x, z, sx, sz, label) {
    const lava = addBox(label.toLowerCase(), x, -0.08, z, sx, .28, sz, mats.lava, false);
    const light = new THREE.PointLight(0xff5c1a, 2.2, Math.max(sx, sz) * .75);
    light.position.set(x, 1.4, z); scene.add(light); trackDimensionObject(light, 'nether');
    const sign = makeLabel(label, '#ffd09a', 'rgba(95,20,0,.7)');
    sign.position.set(x, 2.1, z); sign.scale.set(7, 1.25, 1); scene.add(sign); trackDimensionObject(sign, 'nether');
    return lava;
  }

  function addNetherFungusTree(x, z, matr, label) {
    addCylinder(label + ' stem', x, 0, z, 1.2, 8, matr, true, 8);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(5.2, 5.5, 8), matr);
    cap.position.set(x, 10.6, z); cap.castShadow = true; scene.add(cap); trackDimensionObject(cap, 'nether');
    const crown = new THREE.Mesh(new THREE.BoxGeometry(7.5, 1.4, 7.5), matr);
    crown.position.set(x, 8.5, z); crown.castShadow = true; scene.add(crown); trackDimensionObject(crown, 'nether');
    for (const [dx,dz] of [[3.8,0],[-3.8,0],[0,3.8],[0,-3.8]]) {
      addBox(label + ' hanging roots', x + dx, 4.6, z + dz, .45, 3.8, .45, matr, false);
    }
    addBox(label + ' roots', x, .05, z, 5.8, .2, 5.8, matr, false);
  }

  function addVillager(x, z, job) {
    const group = new THREE.Group();
    const robe = job === 'Farmer' ? mats.grass : job === 'Fletcher' ? mats.wood : job === 'Cleric' ? mats.purpur : mats.iron;
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.1, .9), robe);
    body.position.y = 1.25; body.castShadow = true; group.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.05, .85, .9), mat(0xc9906a, true));
    head.position.y = 2.75; head.castShadow = true; group.add(head);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(.28, .26, .35), mat(0xb57555, true));
    nose.position.set(0, 2.66, -.58); group.add(nose);
    const label = makeLabel(job, '#eaffc7', 'rgba(22,45,18,.72)');
    label.position.y = 4.1; label.scale.set(5.6, 1.05, 1); group.add(label);
    group.position.set(x, 0, z); scene.add(group); trackDimensionObject(group, 'overworld');
    villagers.push({ pos: new THREE.Vector3(x, 0, z), job, mesh: group, trades: VILLAGER_TRADES[job] || [] });
  }

  function createFlag(team) {
    const f = flags[team];
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, 7, 8), mats.wood);
    pole.position.y = 3.5; group.add(pole);
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, .15), team === 'blue' ? mats.blue : mats.red);
    cloth.position.set(2, 5.6, 0); group.add(cloth);
    group.position.copy(f.home);
    scene.add(group); f.mesh = group;
  }

  function makeLabel(text, color = '#fff4c7', bg = 'rgba(0,0,0,.58)') {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
    ctx.fillStyle = color; ctx.font = 'bold 34px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
    sprite.scale.set(10, 1.9, 1);
    return sprite;
  }

  function addSecretPortal(x, z, label) {
    const portal = new THREE.Group();
    const frameMat = mat(0x2fffe4, false);
    const glowMat = mat(0x87fff3, false, .52);
    const back = new THREE.Mesh(new THREE.BoxGeometry(7, 7.5, .45), glowMat);
    back.position.y = 3.75; portal.add(back);
    const top = new THREE.Mesh(new THREE.BoxGeometry(8.2, .55, .7), frameMat);
    top.position.y = 7.75; portal.add(top);
    const left = new THREE.Mesh(new THREE.BoxGeometry(.55, 7.6, .7), frameMat);
    left.position.set(-4.1, 3.8, 0); portal.add(left);
    const right = left.clone(); right.position.x = 4.1; portal.add(right);
    const light = new THREE.PointLight(0x3ffff0, 1.4, 20);
    light.position.y = 4; portal.add(light);
    const sign = makeLabel(`${label} - Press E`, '#9ffff6', 'rgba(0,30,36,.72)');
    sign.position.y = 9.4; portal.add(sign);
    portal.position.set(x, 0, z);
    scene.add(portal);
    trackDimensionObject(portal, objectDimension());
    return portal;
  }

  function addSecretTunnel(ax, az, bx, bz, label) {
    const a = new THREE.Vector3(ax, 0, az);
    const b = new THREE.Vector3(bx, 0, bz);
    addSecretPortal(ax, az, label);
    addSecretPortal(bx, bz, label);
    secretPassages.push({ a, b, name: label, dimension: objectDimension() });
  }

  function addNetherPortal(x, z, label, targetDimension, targetPos) {
    const portal = new THREE.Group();
    const obsidian = mats.netherite;
    const glowMat = mat(0xaa43ff, false, .62);
    const back = new THREE.Mesh(new THREE.BoxGeometry(5.4, 7, .38), glowMat);
    back.position.y = 3.7; portal.add(back);
    const left = new THREE.Mesh(new THREE.BoxGeometry(.7, 8, .8), obsidian);
    left.position.set(-3.1, 4, 0); portal.add(left);
    const right = left.clone(); right.position.x = 3.1; portal.add(right);
    const top = new THREE.Mesh(new THREE.BoxGeometry(6.8, .7, .8), obsidian);
    top.position.y = 8; portal.add(top);
    const bottom = top.clone(); bottom.position.y = .35; portal.add(bottom);
    const light = new THREE.PointLight(targetDimension === 'nether' ? 0xff6a20 : 0x9d5cff, 1.9, 24);
    light.position.y = 4.1; portal.add(light);
    const sign = makeLabel(`${label} - Press E`, '#f4cdff', 'rgba(44,0,72,.75)');
    sign.position.y = 9.65; portal.add(sign);
    portal.position.set(x, 0, z);
    portal.userData.portal = true;
    scene.add(portal);
    trackDimensionObject(portal);
    netherPortals.push({ pos: new THREE.Vector3(x, 0, z), dimension: objectDimension(), targetDimension, targetPos, label, mesh: portal });
    return portal;
  }

  function spawnChests() {
    const spots = [
      [-56, 38, 'rare'], [56, -38, 'rare'], [-10, 31, 'epic'], [10, -31, 'epic'],
      [-74, -38, 'good'], [74, 38, 'good'], [-25, 16, 'good'], [25, -16, 'good'],
      [-24, 66, 'legendary'], [24, -66, 'legendary']
    ];
    for (const [x,z,quality] of spots) {
      const base = addBox('loot chest', x, 0, z, 4, 2.4, 3, mats.wood, false);
      const lid = addBox('chest lid', x, 2.4, z, 4.2, .5, 3.2, mats.gold, false);
      const glow = new THREE.PointLight(quality === 'legendary' ? 0xffe080 : 0x7dc5ff, quality === 'legendary' ? .72 : .34, 9);
      glow.position.set(x, 3.4, z); scene.add(glow);
      const sparkle = new THREE.Mesh(new THREE.OctahedronGeometry(.45), quality === 'legendary' ? mats.gold : mats.glass);
      sparkle.position.set(x, 3.55, z); sparkle.castShadow = false; scene.add(sparkle);
      const beacon = addCylinder('loot marker', x, 0, z, 1.65, .08, quality === 'legendary' ? mats.gold : mats.glass, false, 20);
      beacon.position.y = .12;
      chests.push({ pos: new THREE.Vector3(x, 0, z), quality, dimension: objectDimension(), opened: false, cooldown: 0, mesh: base, lid, glow });
    }
  }

  function spawnNetherChests() {
    const spots = [
      [-34, 4, 'epic'], [34, 4, 'epic'], [20, -42, 'legendary'], [-8, -58, 'rare'], [52, -20, 'rare']
    ];
    for (const [x,z,quality] of spots) {
      const base = addBox('nether loot chest', x, 0, z, 4, 2.4, 3, mats.netherBrick, false);
      const lid = addBox('nether chest lid', x, 2.4, z, 4.2, .5, 3.2, mats.glowstone, false);
      addBox('nether chest front latch', x, 1.2, z - 1.62, .7, .55, .18, mats.gold, false);
      addBox('nether chest left band', x - 2.15, .12, z, .18, 2.8, 3.35, mats.gold, false);
      addBox('nether chest right band', x + 2.15, .12, z, .18, 2.8, 3.35, mats.gold, false);
      const label = makeLabel(quality === 'legendary' ? 'FORTRESS LOOT' : 'NETHER CHEST', '#ffd36b', 'rgba(48,8,10,.78)');
      label.position.set(x, 4.5, z); label.scale.set(6.8, 1.15, 1); scene.add(label); trackDimensionObject(label, 'nether');
      const glow = new THREE.PointLight(quality === 'legendary' ? 0xff6a20 : 0xd96bff, quality === 'legendary' ? .9 : .48, 10);
      glow.position.set(x, 3.4, z); scene.add(glow); trackDimensionObject(glow, 'nether');
      const sparkle = new THREE.Mesh(new THREE.OctahedronGeometry(.45), quality === 'legendary' ? mats.lava : mats.glowstone);
      sparkle.position.set(x, 3.55, z); scene.add(sparkle); trackDimensionObject(sparkle, 'nether');
      chests.push({ pos: new THREE.Vector3(x, 0, z), quality, dimension: 'nether', opened: false, cooldown: 0, mesh: base, lid, glow });
    }
  }

  function spawnEndChests() {
    const spots = [
      [58, -42, 'legendary'], [48, 58, 'legendary'], [-58, 48, 'epic'], [18, 18, 'epic'], [-18, -18, 'rare']
    ];
    for (const [x,z,quality] of spots) {
      const base = addBox('end city chest', x, 0, z, 4, 2.4, 3, mats.purpur, false);
      const lid = addBox('end chest lid', x, 2.4, z, 4.2, .5, 3.2, mats.endStone, false);
      addBox('end chest latch', x, 1.2, z - 1.62, .7, .55, .18, mats.emerald, false);
      const label = makeLabel(quality === 'legendary' ? 'END CITY LOOT' : 'END CHEST', '#e9d4ff', 'rgba(30,12,48,.78)');
      label.position.set(x, 4.5, z); label.scale.set(6.8, 1.15, 1); scene.add(label); trackDimensionObject(label, 'end');
      const glow = new THREE.PointLight(0xb88cff, quality === 'legendary' ? 1.1 : .55, 12);
      glow.position.set(x, 3.4, z); scene.add(glow); trackDimensionObject(glow, 'end');
      chests.push({ pos: new THREE.Vector3(x, 0, z), quality, dimension: 'end', opened: false, cooldown: 0, mesh: base, lid, glow });
    }
  }

  function spawnAetherChests() {
    const spots = [
      [48, -48, 'legendary'], [-54, 34, 'epic'], [54, 34, 'epic'], [-46, -48, 'rare'], [14, 12, 'rare']
    ];
    for (const [x,z,quality] of spots) {
      const base = addBox('aether loot chest', x, 0, z, 4, 2.4, 3, mats.skyroot, false);
      const lid = addBox('aether chest lid', x, 2.4, z, 4.2, .5, 3.2, mats.ambrosium, false);
      addBox('aether chest latch', x, 1.2, z - 1.62, .7, .55, .18, mats.zanite, false);
      const label = makeLabel(quality === 'legendary' ? 'AETHER DUNGEON LOOT' : 'AETHER CHEST', '#fff3a3', 'rgba(54,64,90,.78)');
      label.position.set(x, 4.5, z); label.scale.set(7.2, 1.15, 1); scene.add(label); trackDimensionObject(label, 'aether');
      const glow = new THREE.PointLight(0xfff0a0, quality === 'legendary' ? 1.15 : .62, 12);
      glow.position.set(x, 3.4, z); scene.add(glow); trackDimensionObject(glow, 'aether');
      chests.push({ pos: new THREE.Vector3(x, 0, z), quality, dimension: 'aether', opened: false, cooldown: 0, mesh: base, lid, glow });
    }
  }

  function createActor(name, team, x, z, ai = false, dimension = currentDimension) {
    const inv = createInventory();
    addItem(inv, ai ? choice(['training_bow','scout_bow','assault_bow']) : 'training_bow', 1, true);
    addItem(inv, 'wooden_arrow', ai ? 40 : 80, true);
    addItem(inv, ai ? choice(['dagger','short_spear','wood_axe','wood_sword']) : 'short_spear', 1, true);
    addItem(inv, 'wooden_shield', 1, true);
    addItem(inv, 'wood_block', ai ? 8 : 24, true);
    addItem(inv, 'medkit', ai ? 1 : 3, true);
    addItem(inv, 'lapis', ai ? 2 : 8, false);
    if (!ai) {
      addItem(inv, 'leather_helmet', 1); addItem(inv, 'leather_chestplate', 1); addItem(inv, 'leather_leggings', 1); addItem(inv, 'leather_boots', 1);
      addItem(inv, 'stone_sword', 1, true); addItem(inv, 'stone_block', 16);
      addItem(inv, 'crafting_table', 1, true); addItem(inv, 'furnace', 1, true);
      addItem(inv, 'ender_pearl', 3, true); addItem(inv, 'command_block', 2, true);
      addItem(inv, 'redstone_dust', 16); addItem(inv, 'tnt', 4); addItem(inv, 'flint_steel', 1, true);
    }
    const actor = {
      id: Math.random().toString(36).slice(2), name, team, ai,
      pos: new THREE.Vector3(x, 0, z), vel: new THREE.Vector3(), radius: 1.2,
      yaw: team === 'blue' ? -Math.PI/4 : Math.PI*0.75,
      hp: 100, maxHp: 100, shieldHp: 55, maxShield: 55, alive: true,
      dimension,
      inventory: inv,
      equipment: { helmet: null, chestplate: null, leggings: null, boots: null, shield: null, wings: null },
      lastAttack: 0, respawn: 0, cooldowns: { poost: 0 }, lastPoke: 0, blocking: false,
      carrying: null, kills: 0, poison: 0, fire: 0,
      progress: ai ? null : { level: 1, xp: 0, upgradePoints: 0, damage: 1, speed: 1 },
      aiTimer: 0, aiGoal: null, xpValue: ai ? 55 : 0,
      mesh: makeActorMesh(team, name, ai, dimension)
    };
    actor.mesh.position.copy(actor.pos);
    scene.add(actor.mesh);
    // Auto equip starter gear.
    equipFirst(actor, 'shield');
    equipFirst(actor, 'helmet'); equipFirst(actor, 'chestplate'); equipFirst(actor, 'leggings'); equipFirst(actor, 'boots');
    return actor;
  }

  function makeActorMesh(team, name, ai, dimension = 'overworld') {
    const group = new THREE.Group();
    const isBlaze = /blaze/i.test(name);
    const isPiglin = /piglin|piggrim/i.test(name);
    const isMagma = /magma/i.test(name);
    const isGhast = /ghast/i.test(name);
    const isEnderman = /enderman/i.test(name);
    const isStrider = /strider/i.test(name);
    const isShulker = /shulker/i.test(name);
    const isDragon = /dragon/i.test(name);
    const isZephyr = /zephyr/i.test(name);
    const isValkyrie = /valkyrie/i.test(name);
    const isSentry = /sentry/i.test(name);
    const isAerwhale = /aerwhale/i.test(name);
    const bodyMat = isBlaze || isMagma ? mats.fire : isPiglin ? mats.gold : isGhast ? mats.white : isEnderman || isDragon ? mats.black : isShulker ? mats.purpur : isStrider ? mats.crimson : isZephyr || isAerwhale ? mats.cloud : isValkyrie ? mats.ambrosium : isSentry ? mats.holystone : team === 'blue' ? mats.blue : mats.red;
    const bodyGeom = isAerwhale ? new THREE.BoxGeometry(4.8, 1.6, 7.2) : isDragon ? new THREE.BoxGeometry(3.4, 1.3, 5.4) : isShulker || isSentry ? new THREE.BoxGeometry(1.8, 1.8, 1.8) : isGhast || isZephyr ? new THREE.BoxGeometry(2.5, 2.2, 2.5) : isMagma ? new THREE.BoxGeometry(2.1, 1.35, 2.1) : isEnderman ? new THREE.BoxGeometry(.75, 3.4, .75) : isBlaze ? new THREE.OctahedronGeometry(1.05) : new THREE.CylinderGeometry(.9, 1.05, 2.2, 8);
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 1.35; body.castShadow = true; group.add(body);
    if (isMagma) {
      body.position.y = .9;
      const crack = new THREE.Mesh(new THREE.BoxGeometry(2.25, .15, .18), mats.glowstone);
      crack.position.set(0, .95, -1.08); group.add(crack);
    }
    const headMat = isPiglin ? mat(0xe0a06e, true) : isBlaze ? mats.glowstone : isEnderman || isDragon ? mats.black : isStrider ? mat(0xb54a61, true) : isValkyrie ? mats.iron : isSentry ? mats.zanite : mat(0xd1a47b, true);
    const head = new THREE.Mesh(isPiglin || isEnderman || isStrider ? new THREE.BoxGeometry(1.1, .8, .9) : new THREE.SphereGeometry(.62, 10, 8), headMat);
    head.position.y = 2.85; head.castShadow = true; group.add(head);
    if (isGhast || isMagma || isShulker || isZephyr || isSentry || isAerwhale) head.visible = false;
    if (isPiglin) {
      const snout = new THREE.Mesh(new THREE.BoxGeometry(.62, .32, .32), mat(0xffb78f, true));
      snout.position.set(0, 2.72, -.56); group.add(snout);
      const earL = new THREE.Mesh(new THREE.BoxGeometry(.28, .55, .18), headMat);
      earL.position.set(-.68, 2.92, 0); group.add(earL);
      const earR = earL.clone(); earR.position.x = .68; group.add(earR);
    }
    if (isBlaze) {
      for (let i = 0; i < 8; i++) {
        const rod = new THREE.Mesh(new THREE.BoxGeometry(.22, 1.2, .22), mats.fire);
        const a = i / 8 * Math.PI * 2;
        rod.position.set(Math.cos(a) * 1.35, 1.8 + (i % 2) * .55, Math.sin(a) * 1.35);
        rod.rotation.y = a; group.add(rod);
      }
      const glow = new THREE.PointLight(0xff7b20, 1.2, 8);
      glow.position.y = 2; group.add(glow);
    }
    if (isGhast) {
      body.position.y = 3.2;
      for (let i = 0; i < 5; i++) {
        const tentacle = new THREE.Mesh(new THREE.BoxGeometry(.22, 1.8, .22), mats.white);
        tentacle.position.set((i - 2) * .45, 1.4, (i % 2 ? .55 : -.55)); group.add(tentacle);
      }
    }
    if (isEnderman) {
      body.position.y = 2.2;
      const eyes = new THREE.Mesh(new THREE.BoxGeometry(.55, .12, .08), mat(0xd840ff, false));
      eyes.position.set(0, 3.1, -.42); group.add(eyes);
    }
    if (isStrider) {
      const legL = new THREE.Mesh(new THREE.BoxGeometry(.25, 1.5, .25), mats.crimson);
      legL.position.set(-.45, .75, 0); group.add(legL);
      const legR = legL.clone(); legR.position.x = .45; group.add(legR);
    }
    if (isShulker) {
      body.position.y = 1.05;
      const shellTop = new THREE.Mesh(new THREE.BoxGeometry(2, .35, 2), mats.purpur);
      shellTop.position.y = 2.15; group.add(shellTop);
      const eye = new THREE.Mesh(new THREE.BoxGeometry(.45, .18, .08), mats.glowstone);
      eye.position.set(0, 1.45, -1.02); group.add(eye);
    }
    if (isDragon) {
      body.position.y = 3.6;
      head.position.set(0, 3.9, -3.3);
      const wingL = new THREE.Mesh(new THREE.BoxGeometry(4.5, .18, 2.4), mats.black);
      wingL.position.set(-3.5, 3.75, 0); wingL.rotation.z = .25; group.add(wingL);
      const wingR = wingL.clone(); wingR.position.x = 3.5; wingR.rotation.z = -.25; group.add(wingR);
      const eyes = new THREE.Mesh(new THREE.BoxGeometry(.75, .12, .08), mat(0xd840ff, false));
      eyes.position.set(0, 3.95, -3.78); group.add(eyes);
    }
    if (isZephyr || isAerwhale) {
      body.position.y = isAerwhale ? 4.2 : 3.2;
      const glow = new THREE.PointLight(0xdaf6ff, .9, 10);
      glow.position.y = body.position.y; group.add(glow);
      for (let i = 0; i < 3; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(.55 + i * .12, 8, 6), mats.cloud);
        puff.position.set((i - 1) * .9, body.position.y + .65, -1.2 + i * .4); group.add(puff);
      }
    }
    if (isValkyrie) {
      const wingL = new THREE.Mesh(new THREE.BoxGeometry(2.6, .18, 1.2), mats.white);
      wingL.position.set(-1.9, 2.1, .1); wingL.rotation.z = .34; group.add(wingL);
      const wingR = wingL.clone(); wingR.position.x = 1.9; wingR.rotation.z = -.34; group.add(wingR);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(.7, .05, 6, 18), mats.ambrosium);
      halo.position.y = 3.45; halo.rotation.x = Math.PI / 2; group.add(halo);
    }
    if (isSentry) {
      body.position.y = 1.1;
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.42), mats.zanite);
      gem.position.set(0, 1.35, -1); group.add(gem);
    }
    const shield = new THREE.Mesh(new THREE.BoxGeometry(.12, 1.5, 1.05), mats.iron);
    shield.position.set(-.85, 1.55, .25); shield.name = 'visualShield'; group.add(shield);
    const weapon = new THREE.Mesh(new THREE.BoxGeometry(.13, .13, 2.8), mats.wood);
    weapon.position.set(.85, 1.75, .65); weapon.rotation.x = Math.PI * .2; weapon.name = 'visualWeapon'; group.add(weapon);
    const labelCanvas = document.createElement('canvas'); labelCanvas.width = 256; labelCanvas.height = 64;
    const ctx = labelCanvas.getContext('2d'); ctx.fillStyle = dimension === 'nether' ? 'rgba(64,10,10,.72)' : dimension === 'aether' ? 'rgba(45,62,92,.72)' : 'rgba(0,0,0,.55)'; ctx.fillRect(0,0,256,64); ctx.fillStyle = isBlaze || isMagma ? '#ffd36b' : isPiglin ? '#ffe0a3' : isEnderman ? '#e18aff' : isZephyr || isValkyrie || isAerwhale ? '#fff3a3' : '#fff4c7'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center'; ctx.fillText(dimension === 'nether' || dimension === 'aether' ? name.toUpperCase() : name,128,39);
    const tex = new THREE.CanvasTexture(labelCanvas);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    label.scale.set(6, 1.5, 1); label.position.y = 4.1; group.add(label);
    return group;
  }

  let player;
  let lastAutoSave = 0;
  const SAVE_KEY = 'castleLootArchers3D.save.v1';

  function cleanSavedStack(stack) {
    if (!stack || !itemDefs[stack.id]) return null;
    const count = clamp(Math.floor(stack.count || 1), 1, stackMax(stack.id));
    const enchants = {};
    if (stack.enchants && typeof stack.enchants === 'object') {
      for (const [name, level] of Object.entries(stack.enchants)) {
        const n = clamp(Math.floor(Number(level) || 0), 1, 5);
        if (n > 0) enchants[name] = n;
      }
    }
    const cleaned = { id: stack.id, count, uid: stack.uid || Math.random().toString(36).slice(2), enchants };
    if (itemDefs[stack.id]?.shulker) cleaned.contents = Array.isArray(stack.contents) ? stack.contents.map(cleanSavedStack).filter(Boolean).slice(0, 27) : [];
    return cleaned;
  }

  function cleanSavedSlots(slots, length) {
    const out = Array(length).fill(null);
    if (!Array.isArray(slots)) return out;
    for (let i = 0; i < Math.min(length, slots.length); i++) out[i] = cleanSavedStack(slots[i]);
    return out;
  }

  function inventoryHasAny(inv) {
    return [...inv.hotbar, ...inv.backpack].some(Boolean);
  }

  function recoverEssentialItems() {
    if (!player?.inventory) return;
    if (!inventoryHasAny(player.inventory)) {
      addItem(player.inventory, 'training_bow', 1, true);
      addItem(player.inventory, 'wooden_arrow', 80, true);
      addItem(player.inventory, 'short_spear', 1, true);
      addItem(player.inventory, 'wood_block', 24, true);
      addItem(player.inventory, 'medkit', 3, true);
    }
    if (countItem(player.inventory, 'command_block') <= 0) addItem(player.inventory, 'command_block', 2, true);
    if (countItem(player.inventory, 'crafting_table') <= 0) addItem(player.inventory, 'crafting_table', 1, true);
    if (countItem(player.inventory, 'furnace') <= 0) addItem(player.inventory, 'furnace', 1, true);
  }

  function clonePlayerCarryState() {
    return {
      inventory: JSON.parse(JSON.stringify(player.inventory)),
      equipment: JSON.parse(JSON.stringify(player.equipment)),
      progress: JSON.parse(JSON.stringify(player.progress)),
      kills: player.kills,
      hp: player.hp,
      shieldHp: player.shieldHp,
      maxHp: player.maxHp,
      maxShield: player.maxShield
    };
  }

  function restorePlayerCarryState(state) {
    player.inventory = state.inventory;
    player.equipment = state.equipment;
    player.progress = state.progress;
    player.kills = state.kills;
    player.maxHp = state.maxHp;
    player.maxShield = state.maxShield;
    player.hp = Math.max(1, state.hp);
    player.shieldHp = state.shieldHp;
  }

  function isOnEndIsland(pos) {
    return endVoidZones.some(h => Math.abs(pos.x - h.x) <= h.sx / 2 && Math.abs(pos.z - h.z) <= h.sz / 2);
  }

  function isOnAetherIsland(pos) {
    return aetherSafeZones.some(h => Math.abs(pos.x - h.x) <= h.sx / 2 && Math.abs(pos.z - h.z) <= h.sz / 2);
  }

  function safeEndArrival(preferred = new THREE.Vector3(0, 0, -30)) {
    const candidates = [preferred, new THREE.Vector3(0,0,-26), new THREE.Vector3(-16,0,-18), new THREE.Vector3(16,0,-18), new THREE.Vector3(0,0,0), new THREE.Vector3(18,0,18), new THREE.Vector3(-18,0,18)];
    for (const p of candidates) if (isOnEndIsland(p)) return p.clone();
    return new THREE.Vector3(0, 0, 0);
  }

  function safeAetherArrival(preferred = new THREE.Vector3(0, 0, 0)) {
    const candidates = [preferred, new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,10), new THREE.Vector3(-12,0,0), new THREE.Vector3(12,0,0), new THREE.Vector3(48,0,-48), new THREE.Vector3(-54,0,34)];
    for (const p of candidates) if (isOnAetherIsland(p)) return p.clone();
    return new THREE.Vector3(0, 0, 0);
  }

  function safeArrivalForDimension(dimension, preferred) {
    if (dimension === 'end') return safeEndArrival(preferred);
    if (dimension === 'aether') return safeAetherArrival(preferred);
    return preferred.clone();
  }

  function protectAfterDimensionTravel() {
    player.dimensionGraceUntil = nowSec() + DIMENSION_TRAVEL_GRACE;
    player.hp = player.maxHp;
    player.shieldHp = player.maxShield;
    player.fire = 0; player.poison = 0;
    toast('Dimension travel protection active.');
  }

  function saveProgress() {
    if (!player || !player.progress || player.ai) return;
    try {
      const data = {
        version: 1,
        savedAt: Date.now(),
        hp: player.alive ? player.hp : player.maxHp,
        maxHp: player.maxHp,
        shieldHp: player.shieldHp,
        maxShield: player.maxShield,
        kills: player.kills,
        progress: player.progress,
        inventory: player.inventory,
        equipment: player.equipment,
        netherRespawn: player.netherRespawn || null,
        pos: { x: player.pos.x, y: player.pos.y, z: player.pos.z },
        yaw,
        gameMode,
        currentDimension,
        worldRules,
        shulkerBoxes: [...placedBlocks.values()]
          .filter(b => itemDefs[b.type]?.shulker)
          .map(b => ({ x: b.x, z: b.z, dimension: b.dimension || 'overworld', contents: (b.contents || []).map(cleanSavedStack).filter(Boolean).slice(0, 27) })),
        brokenFloors: [...brokenFloor.values()]
          .map(h => ({ x: h.x, z: h.z, depth: Math.max(1, Math.floor(h.depth || 1)) }))
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn('Could not save progress.', err);
    }
  }

  function clearSavedProgress() {
    try { localStorage.removeItem(SAVE_KEY); } catch (err) { console.warn('Could not clear progress.', err); }
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || data.version !== 1) return false;

      player.maxHp = clamp(Number(data.maxHp) || 100, 1, 999);
      player.hp = clamp(Number(data.hp) || player.maxHp, 1, player.maxHp);
      player.maxShield = clamp(Number(data.maxShield) || 55, 0, 999);
      player.shieldHp = clamp(Number(data.shieldHp) || player.maxShield, 0, player.maxShield);
      player.kills = Math.max(0, Math.floor(Number(data.kills) || 0));

      player.progress = {
        level: clamp(Math.floor(Number(data.progress?.level) || 1), 1, MAX_SAFE_PROGRESS),
        xp: clamp(Number(data.progress?.xp) || 0, 0, MAX_SAFE_PROGRESS),
        upgradePoints: clamp(Math.floor(Number(data.progress?.upgradePoints) || 0), 0, MAX_SAFE_PROGRESS),
        damage: clamp(Number(data.progress?.damage) || 1, .1, 50),
        speed: clamp(Number(data.progress?.speed) || 1, .1, 12)
      };

      player.inventory = {
        hotbar: cleanSavedSlots(data.inventory?.hotbar, 9),
        backpack: cleanSavedSlots(data.inventory?.backpack, 36),
        selected: clamp(Math.floor(Number(data.inventory?.selected) || 0), 0, 8)
      };

      player.equipment = { helmet: null, chestplate: null, leggings: null, boots: null, shield: null, wings: null };
      for (const slot of Object.keys(player.equipment)) player.equipment[slot] = cleanSavedStack(data.equipment?.[slot]);
      player.netherRespawn = data.netherRespawn && Number.isFinite(Number(data.netherRespawn.x)) ? {
        x: Number(data.netherRespawn.x), y: 0, z: Number(data.netherRespawn.z), charges: Math.max(0, Math.floor(Number(data.netherRespawn.charges) || 0))
      } : null;

      if (data.pos) {
        player.pos.set(clamp(Number(data.pos.x) || -68, -WORLD/2 + 5, WORLD/2 - 5), Math.max(0, Number(data.pos.y) || 0), clamp(Number(data.pos.z) || 68, -WORLD/2 + 5, WORLD/2 - 5));
        player.mesh.position.copy(player.pos);
        unstuckActor(player, 'Saved position was blocked. Moved you to safe ground.');
      }
      yaw = Number.isFinite(data.yaw) ? data.yaw : yaw;
      gameMode = ['survival','creative','adventure','spectator'].includes(data.gameMode) ? data.gameMode : gameMode;
      currentDimension = ['overworld','nether','end','aether'].includes(data.currentDimension) ? data.currentDimension : 'overworld';
      player.dimension = currentDimension;
      if (currentDimension === 'end' && !isOnEndIsland(player.pos)) {
        player.pos.copy(safeEndArrival());
        player.mesh.position.copy(player.pos);
        protectAfterDimensionTravel();
        toast('Moved you to safe End ground.');
      }
      if (currentDimension === 'aether' && !isOnAetherIsland(player.pos)) {
        player.pos.copy(safeAetherArrival());
        player.mesh.position.copy(player.pos);
        protectAfterDimensionTravel();
        toast('Moved you to a safe Aether island.');
      }
      if (data.worldRules && typeof data.worldRules === 'object') Object.assign(worldRules, data.worldRules);
      restoreSavedShulkers(data.shulkerBoxes);
      restoreSavedBrokenFloors(data.brokenFloors);
      recoverEssentialItems();
      if (Number(data.progress?.level) > MAX_SAFE_PROGRESS || Number(data.progress?.xp) > MAX_SAFE_PROGRESS) {
        toast('Repaired unsafe saved level/XP number.');
        saveProgress();
      }
      toast('Loaded saved progress.');
      return true;
    } catch (err) {
      console.warn('Could not load saved progress.', err);
      return false;
    }
  }

  function resetGame(loadSaved = true) {
    for (const e of entities) scene.remove(e.mesh);
    entities.length = 0; projectiles.forEach(p => scene.remove(p.mesh)); projectiles.length = 0;
    lootDrops.forEach(l => scene.remove(l.mesh)); lootDrops.length = 0;
    closeShulkerPanel(); closeStationPanels();
    for (const [,b] of placedBlocks) { scene.remove(b.mesh); if (b.label) scene.remove(b.label); const idx = colliders.indexOf(b.collider); if (idx >= 0) colliders.splice(idx,1); }
    for (const [,h] of brokenFloor) { scene.remove(h.mesh); h.debris.forEach(m => scene.remove(m)); }
    placedBlocks.clear(); brokenFloor.clear(); score.blue = 0; score.red = 0;
    currentDimension = 'overworld';
    if (!loadSaved) clearSavedProgress();
    player = createActor('You', 'blue', -68, 68, false, 'overworld');
    if (loadSaved) loadProgress();
    entities.push(player);
    for (let i=0;i<5;i++) entities.push(createActor('Blue Guard '+(i+1), 'blue', rand(-76,-55), rand(56,76), true, 'overworld'));
    for (let i=0;i<7;i++) {
      const bot = createActor('Red Raider '+(i+1), 'red', rand(55,76), rand(-76,-55), true, 'overworld');
      if (i > 1) addItem(bot.inventory, 'iron_arrow', 20);
      if (i > 2) addItem(bot.inventory, choice(['iron_sword','pitchfork','rapier','spiked_mace']), 1);
      if (i > 3) addItem(bot.inventory, 'iron_shield', 1);
      if (i === 6) { addItem(bot.inventory, 'diamond_chestplate', 1); addItem(bot.inventory, 'sharpshooter_bow', 1); }
      entities.push(bot);
    }
    const netherMobs = ['Blaze', 'Blaze', 'Piglin', 'Piglin', 'Magma Cube', 'Ghast', 'Enderman', 'Strider'];
    for (let i=0;i<netherMobs.length;i++) {
      const name = netherMobs[i];
      const bot = createActor(name, 'red', rand(-52,52), rand(-60,30), true, 'nether');
      addItem(bot.inventory, name === 'Blaze' || name === 'Ghast' ? 'fire_arrow' : name === 'Piglin' ? 'gold_sword' : 'stone_sword', name === 'Blaze' || name === 'Ghast' ? 30 : 1, true);
      if (name === 'Blaze' || name === 'Ghast') addItem(bot.inventory, 'crossbow', 1, true);
      if (name === 'Magma Cube') { bot.radius = 1.6; bot.maxHp = 135; bot.hp = 135; }
      if (name === 'Ghast') { bot.radius = 1.8; bot.maxHp = 80; bot.hp = 80; bot.pos.y = 8; }
      if (name === 'Enderman') { bot.maxHp = 150; bot.hp = 150; }
      entities.push(bot);
    }
    const endMobs = ['Enderman', 'Enderman', 'Enderman', 'Shulker', 'Shulker', 'Ender Dragon'];
    for (let i=0;i<endMobs.length;i++) {
      const name = endMobs[i];
      const endSpawns = [[24,24],[-24,24],[24,-8],[-24,-8],[32,30],[0,26]];
      const spawn = endSpawns[i] || [rand(-28,28), rand(-8,30)];
      const bot = createActor(name, 'red', spawn[0], spawn[1], true, 'end');
      addItem(bot.inventory, name === 'Shulker' ? 'shulker_shell' : name === 'Ender Dragon' ? 'dragon_head' : 'ender_pearl', 1, true);
      if (name === 'Ender Dragon') { bot.radius = 2.6; bot.maxHp = 420; bot.hp = 420; bot.pos.y = 9; bot.xpValue = 450; }
      if (name === 'Shulker') { bot.radius = 1.4; bot.maxHp = 120; bot.hp = 120; bot.xpValue = 120; }
      entities.push(bot);
    }
    const aetherMobs = ['Zephyr', 'Zephyr', 'Valkyrie', 'Sentry', 'Sentry', 'Aerwhale'];
    for (let i=0;i<aetherMobs.length;i++) {
      const name = aetherMobs[i];
      const aetherSpawns = [[-18,10],[18,12],[-54,34],[48,-48],[56,34],[0,-16]];
      const spawn = aetherSpawns[i] || [rand(-24,24), rand(-18,18)];
      const bot = createActor(name, 'red', spawn[0], spawn[1], true, 'aether');
      addItem(bot.inventory, name === 'Valkyrie' ? 'valkyrie_lance' : name === 'Sentry' ? 'zanite_gem' : 'ambrosium_shard', name === 'Zephyr' ? 3 : 1, true);
      if (name === 'Zephyr') { addItem(bot.inventory, 'crossbow', 1, true); addItem(bot.inventory, 'wooden_arrow', 40, true); bot.pos.y = 4; }
      if (name === 'Valkyrie') { bot.radius = 1.35; bot.maxHp = 170; bot.hp = 170; bot.xpValue = 160; }
      if (name === 'Sentry') { bot.radius = 1.4; bot.maxHp = 130; bot.hp = 130; bot.xpValue = 110; }
      if (name === 'Aerwhale') { bot.radius = 2.8; bot.maxHp = 260; bot.hp = 260; bot.pos.y = 8; bot.xpValue = 220; }
      entities.push(bot);
    }
    for (const team of ['blue','red']) { flags[team].pos.copy(flags[team].home); flags[team].carrier = null; flags[team].mesh.position.copy(flags[team].pos); }
    applyDimensionVisuals();
    renderInventory(); updateUI();
    toast(loadSaved ? '3D match started. Find chests, loot enemies, build cover, and try poosting with Q.' : 'New game started. Saved progress cleared.');
  }

  function equipFirst(actor, slot) {
    const s = findFirst(actor.inventory, (stack, d) => (d.type === 'armor' || d.type === 'shield') && d.slot === slot);
    if (s) equipStack(actor, s, true);
  }
  function removeStackByUid(inv, uid) {
    for (const area of [inv.hotbar, inv.backpack]) for (let i=0;i<area.length;i++) if (area[i] && area[i].uid === uid) { const s = area[i]; area[i] = null; return s; }
    return null;
  }
  function equipStack(actor, stack, quiet = false) {
    if (!stack) return false;
    const d = itemDefs[stack.id];
    if (d.type !== 'armor' && d.type !== 'shield') return false;
    const slot = d.slot;
    const removed = removeStackByUid(actor.inventory, stack.uid);
    if (!removed) return false;
    const old = actor.equipment[slot];
    actor.equipment[slot] = removed;
    if (old) insertStack(actor.inventory, old, true);
    if (!quiet && actor === player) toast(`Equipped ${d.name}.`);
    if (actor === player && player) renderInventory();
    return true;
  }

  function armorReduction(actor, incomingKind = '') {
    let red = 0;
    for (const slot of ['helmet','chestplate','leggings','boots']) {
      const s = actor.equipment[slot]; if (!s) continue;
      red += itemDefs[s.id].armor || 0;
      if (hasEnchant(s, 'Protection')) red += .025 * s.enchants['Protection'];
      if (incomingKind === 'projectile' && hasEnchant(s, 'Projectile Protection')) red += .035 * s.enchants['Projectile Protection'];
      if (incomingKind === 'fire' && hasEnchant(s, 'Fire Protection')) red += .04 * s.enchants['Fire Protection'];
      if (incomingKind === 'blast' && hasEnchant(s, 'Blast Protection')) red += .04 * s.enchants['Blast Protection'];
    }
    const wings = actor.equipment.wings;
    if (wings && hasEnchant(wings, 'Feather Falling')) red += .015 * wings.enchants['Feather Falling'];
    return clamp(red, 0, .78);
  }

  function buildWorldAndStart() {
    buildWorld();
    buildNetherWorld();
    buildEndWorld();
    buildAetherWorld();
    resetGame();
    setTimeout(() => {
      camera.aspect = Math.max(1, mount.clientWidth) / Math.max(1, mount.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(Math.max(1, mount.clientWidth), Math.max(1, mount.clientHeight));
      updateCamera();
      renderer.render(scene, camera);
    }, 50);
    animate();
  }

  function updateCamera() {
    pitch = clamp(pitch, -1.35, 1.25);
    const eye = player.pos.clone().add(new THREE.Vector3(0, player.alive ? 2.7 : 1.2, 0));
    camera.position.copy(eye);
    const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    camera.lookAt(eye.clone().add(dir));
    player.yaw = yaw;
  }

  function collideHorizontal(actor, desired) {
    const r = actor.radius;
    desired.x = clamp(desired.x, -WORLD/2 + 5, WORLD/2 - 5);
    desired.z = clamp(desired.z, -WORLD/2 + 5, WORLD/2 - 5);
    let x = desired.x, z = actor.pos.z;
    if (!hitsWorld(x, z, r, actor.pos.y)) actor.pos.x = x;
    z = desired.z; x = actor.pos.x;
    if (!hitsWorld(x, z, r, actor.pos.y)) actor.pos.z = z;
  }
  function hitsWorld(x, z, r, y = 0) {
    for (const c of colliders) {
      if ((c.dimension || 'overworld') !== currentDimension) continue;
      if (y > c.max.y + 0.2) continue;
      const nx = clamp(x, c.min.x, c.max.x);
      const nz = clamp(z, c.min.z, c.max.z);
      if ((x-nx)*(x-nx)+(z-nz)*(z-nz) < r*r) return c;
    }
    return null;
  }
  function safeSpawnNear(base) {
    const spots = [
      [0,0], [6,0], [-6,0], [0,6], [0,-6], [8,8], [-8,8], [8,-8], [-8,-8],
      [14,0], [-14,0], [0,14], [0,-14], [16,16], [-16,16], [16,-16], [-16,-16]
    ];
    for (const [dx,dz] of spots) {
      const x = clamp(base.x + dx, -WORLD/2 + 8, WORLD/2 - 8);
      const z = clamp(base.z + dz, -WORLD/2 + 8, WORLD/2 - 8);
      if (!hitsWorld(x, z, 1.8, 0)) return new THREE.Vector3(x, 0, z);
    }
    return new THREE.Vector3(0, 0, 0);
  }
  function unstuckActor(actor, reason = '') {
    if (!actor || !hitsWorld(actor.pos.x, actor.pos.z, actor.radius + .25, actor.pos.y)) return false;
    const base = actor.team === 'blue' ? flags.blue.home : flags.red.home;
    actor.pos.copy(safeSpawnNear(base));
    actor.vel.set(0, 0, 0); actor.onGround = true;
    actor.mesh.position.copy(actor.pos);
    if (actor === player) {
      updateCamera();
      toast(reason || 'Moved you to safe ground.');
      saveProgress();
    }
    return true;
  }
  function raycastLook(maxDist = 8) {
    const origin = camera.position.clone();
    const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).normalize();
    return { origin, dir, point: origin.clone().addScaledVector(dir, maxDist) };
  }

  function activeItemDef(actor = player) {
    const s = actor.inventory.hotbar[actor.inventory.selected];
    return s ? itemDefs[s.id] : null;
  }
  function useActive() {
    if (!player.alive || invPanel.classList.contains('hidden') === false || enchantPanel.classList.contains('hidden') === false || shulkerPanel.classList.contains('hidden') === false || craftingPanel.classList.contains('hidden') === false || furnacePanel.classList.contains('hidden') === false || tradePanel.classList.contains('hidden') === false) return;
    const s = selectedStack();
    if (!s) { toast('Select an item in the hotbar.'); return; }
    const d = itemDefs[s.id];
    if (d.type === 'bow') shootBow(player, s);
    else if (d.type === 'melee') meleeAttack(player, s);
    else if (d.compass) useCompass();
    else if (d.clock) useClock();
    else if (d.type === 'block') placeBlock(s);
    else if (d.type === 'consumable') useConsumable(s);
    else if (d.flintSteel) useFlintAndSteel();
    else if (d.shulker) placeShulkerBox(s);
    else if (d.totem) toast('Totem of Undying works automatically when you would die.');
    else if (d.type === 'armor' || d.type === 'shield') equipStack(player, s);
    else if (d.type === 'arrow') toast('Select a bow. Best arrows are used automatically.');
    else toast(`${d.name} is a material.`);
  }

  function shootBow(actor, bowStack) {
    const bow = itemDefs[bowStack.id];
    const t = nowSec();
    let cd = bow.cooldown;
    if (hasEnchant(bowStack, 'Quick Charge')) cd *= Math.max(.55, 1 - bowStack.enchants['Quick Charge'] * .12);
    if (t - actor.lastAttack < cd) return;
    const arrowId = bestArrow(actor.inventory);
    if (!arrowId) { if (actor === player) toast('No arrows. Loot a chest or defeated enemy.'); return; }
    if (!hasEnchant(bowStack, 'Infinity')) removeItem(actor.inventory, arrowId, 1);
    actor.lastAttack = t;
    const arrow = itemDefs[arrowId];
    const dir = actor === player ? raycastLook(1).dir : new THREE.Vector3(Math.sin(actor.yaw), 0, Math.cos(actor.yaw)).normalize();
    const start = actor.pos.clone().add(new THREE.Vector3(0, 2.3, 0)).addScaledVector(dir, 1.5);
    let damage = bow.damage + arrow.damage;
    if (hasEnchant(bowStack, 'Power')) damage *= 1 + bowStack.enchants['Power'] * .16;
    const count = hasEnchant(bowStack, 'Multishot') ? 3 : 1;
    for (let i = 0; i < count; i++) {
      const spread = count === 1 ? 0 : (i - 1) * .04;
      const d2 = dir.clone().applyAxisAngle(new THREE.Vector3(0,1,0), spread).normalize();
      makeArrowProjectile(start, d2, bow.speed, bow.range, actor, damage, arrowId, bowStack);
    }
    renderInventory();
  }

  function makeArrowProjectile(start, dir, speed, range, owner, damage, arrowId, weaponStack) {
    const arrowMesh = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, 1.6, 6), itemDefs[arrowId].fire ? mats.fire : mats.wood);
    shaft.rotation.x = Math.PI / 2; arrowMesh.add(shaft);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.13, .35, 6), mats.iron);
    tip.position.z = .9; tip.rotation.x = Math.PI / 2; arrowMesh.add(tip);
    arrowMesh.position.copy(start);
    arrowMesh.lookAt(start.clone().add(dir));
    scene.add(arrowMesh);
    trackDimensionObject(arrowMesh, owner.dimension || currentDimension);
    projectiles.push({ mesh: arrowMesh, pos: start.clone(), vel: dir.clone().multiplyScalar(speed), owner, team: owner.team, dimension: owner.dimension || currentDimension, life: range / speed, damage, arrowId, weaponStack, hit: new Set() });
  }

  function meleeAttack(actor, stack) {
    const w = itemDefs[stack.id];
    const t = nowSec();
    if (t - actor.lastAttack < w.cooldown) return;
    actor.lastAttack = t;
    const dir = actor === player ? raycastLook(1).dir : new THREE.Vector3(Math.sin(actor.yaw), 0, Math.cos(actor.yaw)).normalize();
    if (w.poost) {
      actor.lastPoke = t;
      actor.vel.x += dir.x * 4.5;
      actor.vel.z += dir.z * 4.5;
    }
    const origin = actor.pos.clone().add(new THREE.Vector3(0, 1.3, 0));
    let hitAny = false;
    let damage = w.damage;
    if (hasEnchant(stack, 'Sharpness')) damage *= 1 + stack.enchants['Sharpness'] * .18;
    if (hasEnchant(stack, 'Poost Burst') && w.poost) damage *= 1.08;
    for (const target of entities) {
      if ((target.dimension || 'overworld') !== (actor.dimension || currentDimension)) continue;
      if (!target.alive || target.team === actor.team) continue;
      const to = target.pos.clone().sub(actor.pos); const flatDist = Math.hypot(to.x, to.z);
      if (flatDist > w.reach + target.radius) continue;
      const flatDir = new THREE.Vector3(to.x, 0, to.z).normalize();
      if (flatDir.dot(new THREE.Vector3(dir.x, 0, dir.z).normalize()) > .42) {
        damageActor(target, damage, actor, w.family.includes('blunt') ? 'blast' : 'melee');
        if (hasEnchant(stack, 'Knockback')) {
          target.vel.x += flatDir.x * stack.enchants['Knockback'] * 3.0;
          target.vel.z += flatDir.z * stack.enchants['Knockback'] * 3.0;
        }
        if (hasEnchant(stack, 'Fire Aspect')) target.fire = Math.max(target.fire, 3 + stack.enchants['Fire Aspect']);
        hitAny = true;
      }
    }
    slashEffect(origin, dir, hitAny ? 0xfff0a3 : 0xc7d4e8);
  }

  function slashEffect(origin, dir, color) {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(1.4, .035, 6, 24, Math.PI), mat(color, false));
    mesh.position.copy(origin.clone().addScaledVector(dir, 2.3));
    mesh.rotation.y = yaw; mesh.rotation.z = Math.PI / 2;
    scene.add(mesh); setTimeout(() => scene.remove(mesh), 100);
  }

  function facingStep() {
    const d = yawDir();
    return Math.abs(d.x) > Math.abs(d.z) ? { dx: Math.sign(d.x) * 4, dz: 0 } : { dx: 0, dz: Math.sign(d.z) * 4 };
  }

  function placementCell(range = 5) {
    const ahead = player.pos.clone().addScaledVector(yawDir(), range);
    let x = gridSnap(ahead.x), z = gridSnap(ahead.z);
    if (distXZ(player.pos, new THREE.Vector3(x,0,z)) < 2.5) {
      const step = facingStep();
      x = gridSnap(player.pos.x + step.dx); z = gridSnap(player.pos.z + step.dz);
    }
    return { x, z, key: cellKey(x, z) };
  }

  function blockSizeFor(defn) {
    if (defn.flat) return { sx: 3.5, sy: .18, sz: 3.5 };
    if (defn.button) return { sx: 2.2, sy: .35, sz: 2.2 };
    return { sx: 3.8, sy: 2, sz: 3.8 };
  }

  function placeBlock(stack) {
    const d = itemDefs[stack.id];
    if (d.bed && currentDimension === 'nether') {
      if (gameMode !== 'creative') removeItem(player.inventory, stack.id, 1);
      toast('Beds explode in the Nether!');
      explode(player.pos.clone().addScaledVector(yawDir(), 3), player, 92);
      player.fire = Math.max(player.fire, 4);
      renderInventory(); saveProgress();
      return;
    }
    const { x, z, key } = placementCell(5);
    if (distXZ(player.pos, new THREE.Vector3(x,0,z)) > 8) { toast('Too far to place a block.'); return; }
    let b = placedBlocks.get(key);
    if (b) {
      if (!b.collider || itemDefs[b.type].flat || d.flat) { toast('That redstone tile is already occupied.'); return; }
      if (b.height >= 4) { toast('Block stack is already max height.'); return; }
      if (gameMode !== 'creative' && !removeItem(player.inventory, stack.id, 1)) return;
      b.height += 1; b.mesh.scale.y = b.height; b.mesh.position.y = b.height;
      b.collider.max.y = b.height * 2;
      toast('Stacked block higher.'); renderInventory(); return;
    }
    if (!d.flat && hitsWorld(x, z, 1.8, 0)) { toast('Cannot build inside a wall.'); return; }
    if (gameMode !== 'creative' && !removeItem(player.inventory, stack.id, 1)) return;
    const size = blockSizeFor(d);
    const mesh = addBox('placed block', x, 0, z, size.sx, size.sy, size.sz, mats[d.material] || mats.stone, false);
    if (d.endCrystal) {
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.1), mats.glass);
      crystal.position.y = 2.4; mesh.add(crystal);
      const light = new THREE.PointLight(0xd7b6ff, 1.2, 10);
      light.position.y = 2.4; mesh.add(light);
    } else if (stack.id === 'end_rod') {
      mesh.scale.set(.28, 8, .28);
      mesh.position.y = 1.6;
      const light = new THREE.PointLight(0xf5e7ff, .7, 8);
      light.position.y = 1.6; mesh.add(light);
    }
    let collider = null;
    if (!d.flat && !d.button && !d.powerSwitch) {
      collider = { mesh, min: new THREE.Vector3(x-size.sx/2,0,z-size.sz/2), max: new THREE.Vector3(x+size.sx/2,size.sy,z+size.sz/2), kind:'placed block', dimension: currentDimension };
      colliders.push(collider);
    }
    const step = facingStep();
    const placed = { key, x, z, mesh, collider, type: stack.id, height: 1, hp: d.hp, command: '', active: false, powered: false, ignited: false, extended: false, facing: step, dimension: currentDimension };
    if (d.commandBlock) {
      placed.command = promptCommandBlock('/give @s ender_pearl 4');
      const label = makeLabel('CMD', '#ffd7a3', 'rgba(80,36,0,.72)');
      label.position.set(x, 3.2, z); label.scale.set(3.6, .8, 1); scene.add(label); trackDimensionObject(label, currentDimension); placed.label = label;
      toast('Placed Command Block. Press F near it to run the command.');
    } else if (d.respawnAnchor) {
      placed.charges = 0;
      const label = makeLabel('ANCHOR 0/4', '#bff7ff', 'rgba(8,20,34,.78)');
      label.position.set(x, 3.2, z); label.scale.set(4.8, .8, 1); scene.add(label); trackDimensionObject(label, currentDimension); placed.label = label;
      toast('Placed Respawn Anchor. Press F with Glowstone to charge it in the Nether.');
    } else {
      toast('Placed block cover. Stack blocks like Minecraft-style building.');
    }
    placedBlocks.set(key, placed); renderInventory();
    updateRedstone();
  }

  function placeShulkerBox(stack) {
    const { x, z, key } = placementCell(5);
    if (distXZ(player.pos, new THREE.Vector3(x,0,z)) > 8) { toast('Too far to place a Shulker Box.'); return; }
    if (placedBlocks.has(key) || hitsWorld(x, z, 1.8, 0)) { toast('Cannot place Shulker Box there.'); return; }
    let placedContents = [];
    if (gameMode !== 'creative') {
      const removed = removeStackByUid(player.inventory, stack.uid);
      if (!removed) return;
      placedContents = Array.isArray(removed.contents) ? removed.contents.map(cleanSavedStack).filter(Boolean).slice(0, 27) : [];
    } else {
      placedContents = Array.isArray(stack.contents) ? stack.contents.map(cleanSavedStack).filter(Boolean).slice(0, 27) : [];
    }
    addPlacedShulkerBox(x, z, placedContents, currentDimension);
    toast('Placed Shulker Box. Press F near it to open storage.');
    renderInventory(); saveProgress();
  }

  function addPlacedShulkerBox(x, z, contents = [], dimension = currentDimension) {
    const key = cellKey(x, z);
    const previousBuildDimension = buildDimension;
    buildDimension = dimension;
    const mesh = addBox('shulker box', x, 0, z, 3.5, 1.8, 3.5, mats.netherite || mats.purple || mats.stone, false);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(3.7, .28, 3.7), mats.amethyst || mats.diamond || mats.netherite);
    lid.position.y = 1.92; mesh.add(lid);
    buildDimension = previousBuildDimension;
    const collider = { mesh, min: new THREE.Vector3(x-1.75,0,z-1.75), max: new THREE.Vector3(x+1.75,1.8,z+1.75), kind:'shulker box', dimension };
    colliders.push(collider);
    const label = makeLabel('SHULKER', '#f1d8ff', 'rgba(78,34,112,.72)');
    label.position.set(x, 3.0, z); label.scale.set(3.9, .75, 1); scene.add(label); trackDimensionObject(label, dimension);
    const placed = { key, x, z, mesh, collider, type: 'shulker_box', height: 1, hp: 80, contents: contents.map(cleanSavedStack).filter(Boolean).slice(0, 27), isShulker: true, label, dimension };
    placedBlocks.set(key, placed);
    return placed;
  }

  function restoreSavedShulkers(saved) {
    if (!Array.isArray(saved)) return;
    for (const box of saved) {
      const x = gridSnap(Number(box.x) || 0), z = gridSnap(Number(box.z) || 0), key = cellKey(x, z);
      if (placedBlocks.has(key) || hitsWorld(x, z, 1.8, 0)) continue;
      const dimension = ['overworld','nether','end','aether'].includes(box.dimension) ? box.dimension : 'overworld';
      addPlacedShulkerBox(x, z, Array.isArray(box.contents) ? box.contents : [], dimension);
    }
  }

  function neighborKeys(block) {
    return [
      cellKey(block.x + 4, block.z), cellKey(block.x - 4, block.z),
      cellKey(block.x, block.z + 4), cellKey(block.x, block.z - 4)
    ];
  }

  function isConductor(block) {
    const d = itemDefs[block.type];
    return d.redstone || d.repeater || d.comparator;
  }

  function setPowered(block, powered) {
    block.powered = powered;
    const d = itemDefs[block.type];
    if (d.redstone || d.repeater || d.comparator) block.mesh.material = powered ? mats.fire : mats.redstone;
  }

  function updateRedstone() {
    for (const b of placedBlocks.values()) setPowered(b, false);
    const queue = [];
    for (const b of placedBlocks.values()) {
      const d = itemDefs[b.type];
      if ((d.powerSwitch || d.button) && b.active) { setPowered(b, true); queue.push({ block: b, power: 12 }); }
    }
    while (queue.length) {
      const { block, power } = queue.shift();
      if (power <= 0) continue;
      for (const key of neighborKeys(block)) {
        const nb = placedBlocks.get(key);
        if (!nb) continue;
        const nd = itemDefs[nb.type];
        if (isConductor(nb) && power - 1 > 0 && !nb.powered) {
          setPowered(nb, true); queue.push({ block: nb, power: nd.repeater ? power : power - 1 });
        } else if (nd.tnt) igniteTNT(nb);
        else if (nd.piston) setPiston(nb, true);
        else if (nd.dispenser || nd.dropper) triggerContainerBlock(nb);
      }
    }
    for (const b of placedBlocks.values()) {
      const d = itemDefs[b.type];
      if (d.tnt && b.powered) igniteTNT(b);
      if (d.piston && !neighborKeys(b).some(k => placedBlocks.get(k)?.powered)) setPiston(b, false);
    }
  }

  function togglePowerBlock(block) {
    const d = itemDefs[block.type];
    if (d.powerSwitch) { block.active = !block.active; toast(block.active ? 'Lever on.' : 'Lever off.'); updateRedstone(); }
    else if (d.button) {
      block.active = true; toast('Button pressed.'); updateRedstone();
      setTimeout(() => { block.active = false; updateRedstone(); }, 1000);
    }
  }

  function igniteTNT(block) {
    if (!block || block.ignited) return;
    block.ignited = true; block.mesh.material = mats.fire; toast('TNT primed!');
    setTimeout(() => {
      if (!placedBlocks.has(block.key)) return;
      removePlacedBlock(block);
      explode(new THREE.Vector3(block.x, 1, block.z), player, 72);
      for (const other of [...placedBlocks.values()]) if (itemDefs[other.type].tnt && distXZ(other, block) < 7) igniteTNT(other);
    }, 900);
  }

  function removePlacedBlock(block) {
    if (block === activeShulker) closeShulkerPanel();
    scene.remove(block.mesh); if (block.label) scene.remove(block.label);
    const i = colliders.indexOf(block.collider); if (i >= 0) colliders.splice(i, 1);
    placedBlocks.delete(block.key);
  }

  function movePlacedBlock(block, nx, nz) {
    const nk = cellKey(nx, nz);
    if (placedBlocks.has(nk) || hitsWorld(nx, nz, 1.8, 0)) return false;
    placedBlocks.delete(block.key);
    block.key = nk; block.x = nx; block.z = nz; block.mesh.position.x = nx; block.mesh.position.z = nz;
    if (block.label) block.label.position.set(nx, 3.2, nz);
    if (block.collider) { block.collider.min.x = nx - 1.9; block.collider.max.x = nx + 1.9; block.collider.min.z = nz - 1.9; block.collider.max.z = nz + 1.9; }
    placedBlocks.set(nk, block);
    return true;
  }

  function setPiston(block, powered) {
    const d = itemDefs[block.type];
    if (powered && !block.extended) {
      const tx = block.x + block.facing.dx, tz = block.z + block.facing.dz;
      const pushed = placedBlocks.get(cellKey(tx, tz));
      if (pushed && !itemDefs[pushed.type].redstone) movePlacedBlock(pushed, tx + block.facing.dx, tz + block.facing.dz);
      block.extended = true; block.mesh.scale.z = 1.35; toast(`${d.name} extended.`);
    } else if (!powered && block.extended) {
      if (d.sticky) {
        const px = block.x + block.facing.dx * 2, pz = block.z + block.facing.dz * 2;
        const pulled = placedBlocks.get(cellKey(px, pz));
        if (pulled && !itemDefs[pulled.type].redstone) movePlacedBlock(pulled, block.x + block.facing.dx, block.z + block.facing.dz);
      }
      block.extended = false; block.mesh.scale.z = 1; toast(`${d.name} retracted.`);
    }
  }

  function triggerContainerBlock(block) {
    if (block.lastTrigger && nowSec() - block.lastTrigger < .8) return;
    block.lastTrigger = nowSec();
    if (itemDefs[block.type].dispenser) {
      const start = new THREE.Vector3(block.x, 2, block.z).add(new THREE.Vector3(block.facing.dx,0,block.facing.dz).normalize().multiplyScalar(2));
      makeArrowProjectile(start, new THREE.Vector3(block.facing.dx,0,block.facing.dz).normalize(), 95, 60, player, 18, 'wooden_arrow', null);
      toast('Dispenser fired.');
    } else {
      createLoot(new THREE.Vector3(block.x + block.facing.dx, .8, block.z + block.facing.dz), makeStack(choice(['wood_block','stone_block','ender_pearl']), 1));
      toast('Dropper dropped an item.');
    }
  }

  function promptCommandBlock(defaultCommand = '') {
    const help = [
      'Command Block commands:',
      '/give @s diamond_sword 1',
      '/tp @s 0 64 0',
      '/gamemode creative',
      '/time set day',
      '/weather clear',
      '/summon zombie',
      '/locate structure loot_chest',
      '/gamerule keepInventory true',
      '/effect give @s speed 60 2',
      '/kill @e[type=zombie]',
      '/xp 100'
    ].join('\n');
    const command = window.prompt(help, defaultCommand);
    return (command || defaultCommand || '/give @s ender_pearl 4').trim();
  }

  function runCommandBlock(block) {
    if (!block.command) block.command = promptCommandBlock('/give @s ender_pearl 4');
    executeCommand(block.command, block);
  }

  function isPlayerTarget(target) {
    return ['@p','@s','player','you'].includes(String(target || '').toLowerCase());
  }

  function setWorldTime(value) {
    const colors = {
      day: 0x78a9d6,
      noon: 0x8dc6ef,
      night: 0x111a35,
      midnight: 0x060914
    };
    const color = colors[value] || colors.day;
    scene.background = new THREE.Color(color);
    scene.fog = new THREE.Fog(color, value === 'night' || value === 'midnight' ? 45 : 75, value === 'night' || value === 'midnight' ? 170 : 270);
    sun.intensity = value === 'night' || value === 'midnight' ? .25 : 1.15;
    hemi.intensity = value === 'night' || value === 'midnight' ? .55 : 1.3;
    toast(`Time set to ${value}.`);
  }

  function setWeather(value) {
    if (value === 'clear') {
      scene.fog.near = 75; scene.fog.far = 270; sun.intensity = 1.15; toast('Weather set to clear.');
    } else if (value === 'rain') {
      scene.fog.near = 35; scene.fog.far = 155; sun.intensity = .55; toast('Weather set to rain.');
    } else if (value === 'thunder') {
      scene.fog.near = 20; scene.fog.far = 110; sun.intensity = .25; toast('Weather set to thunder.');
    } else toast('Use: /weather clear|rain|thunder');
  }

  function applyDimensionVisuals() {
    for (const dim of Object.keys(dimensionMeshes)) {
      for (const obj of dimensionMeshes[dim]) obj.visible = dim === currentDimension;
    }
    for (const e of entities) if (e.mesh) e.mesh.visible = e.alive && (!e.ai || e.dimension === currentDimension || e === player);
    if (currentDimension === 'nether') {
      scene.background = new THREE.Color(0x421313);
      scene.fog = new THREE.Fog(0x6c1b15, 18, 125);
      sun.intensity = .18; hemi.intensity = .62;
    } else if (currentDimension === 'end') {
      scene.background = new THREE.Color(0x090411);
      scene.fog = new THREE.Fog(0x14081f, 28, 145);
      sun.intensity = .08; hemi.intensity = .5;
    } else if (currentDimension === 'aether') {
      scene.background = new THREE.Color(0xbfe9ff);
      scene.fog = new THREE.Fog(0xdcf7ff, 55, 260);
      sun.intensity = 1.35; hemi.intensity = 1.55;
    } else {
      scene.background = new THREE.Color(0x78a9d6);
      scene.fog = new THREE.Fog(0x78a9d6, 75, 270);
      sun.intensity = 1.15; hemi.intensity = 1.3;
    }
  }

  function travelDimension(portal) {
    const carryState = clonePlayerCarryState();
    currentDimension = portal.targetDimension;
    player.dimension = currentDimension;
    player.pos.copy(safeArrivalForDimension(currentDimension, portal.targetPos));
    player.vel.set(0, 0, 0);
    player.mesh.position.copy(player.pos);
    restorePlayerCarryState(carryState);
    player.dimension = currentDimension;
    protectAfterDimensionTravel();
    for (let i = projectiles.length - 1; i >= 0; i--) { scene.remove(projectiles[i].mesh); projectiles.splice(i, 1); }
    applyDimensionVisuals();
    renderInventory(); updateUI(); updateCamera(); saveProgress();
    toast(currentDimension === 'nether' ? 'Entered the Nether. Lava burns, fortress loot is stronger.' : currentDimension === 'end' ? 'Entered The End. Find End cities, chorus fruit, and the dragon.' : currentDimension === 'aether' ? 'Entered the Aether. Explore floating islands, clouds, and sky dungeon loot.' : 'Returned to the castle.');
  }

  function locateStructure(name) {
    let target = null, label = name;
    if (name === 'loot_chest' || name === 'chest') {
      target = chests.filter(c => (c.dimension || 'overworld') === currentDimension).reduce((best, c) => !best || distXZ(player.pos, c.pos) < distXZ(player.pos, best.pos) ? c : best, null)?.pos;
      label = 'nearest loot chest';
    } else if (name === 'secret_passage' || name === 'portal') {
      const portals = currentDimension !== 'overworld'
        ? netherPortals.filter(p => p.dimension === currentDimension).map(p => p.pos)
        : [...secretPassages.flatMap(p => [p.a, p.b]), ...netherPortals.filter(p => p.dimension === 'overworld').map(p => p.pos)];
      target = portals.reduce((best, p) => !best || distXZ(player.pos, p) < distXZ(player.pos, best) ? p : best, null);
      label = 'nearest secret passage';
    } else if (name === 'nether_fortress' || name === 'fortress') {
      target = new THREE.Vector3(0, 0, 4); label = 'nether fortress';
    } else if (name === 'aether_dungeon' || name === 'dungeon') {
      target = new THREE.Vector3(48, 0, -48); label = 'aether dungeon';
    } else if (name === 'red_base') { target = flags.red.home; label = 'red base'; }
    else if (name === 'blue_base') { target = flags.blue.home; label = 'blue base'; }
    if (!target) { toast('Structures: loot_chest, secret_passage, aether_dungeon, red_base, blue_base'); return; }
    toast(`${label}: x ${Math.round(target.x)}, z ${Math.round(target.z)} (${Math.round(distXZ(player.pos, target))} away).`);
  }

  function executeCommand(command, block) {
    const parts = String(command || '').trim().split(/\s+/);
    const cmd = (parts.shift() || '').toLowerCase().replace(/^\//, '');
    if (!cmd) { toast('Command Block is empty.'); return; }
    if (cmd === 'give') {
      const target = parts.shift();
      const id = parts.shift();
      if (!isPlayerTarget(target) || !itemDefs[id]) { toast('Use: /give @s item_id amount'); return; }
      const count = clamp(Math.floor(Number(parts.shift()) || 1), 1, stackMax(id));
      addItem(player.inventory, id, count, true); renderInventory(); toast(`Command gave ${count} ${itemDefs[id].name}.`);
    } else if (cmd === 'tp' || cmd === 'teleport') {
      if (isPlayerTarget(parts[0])) parts.shift();
      const place = (parts[0] || '').toLowerCase();
      const named = { base: flags.blue.home, blue: flags.blue.home, red: flags.red.home, middle: new THREE.Vector3(0,0,0) };
      if (named[place]) player.pos.copy(safeSpawnNear(named[place]));
      else {
        const x = Number(parts[0]), z = Number(parts.length >= 3 ? parts[2] : parts[1]);
        if (!Number.isFinite(x) || !Number.isFinite(z)) { toast('Use: /tp @s base or /tp @s x y z'); return; }
        player.pos.set(clamp(x, -WORLD/2 + 8, WORLD/2 - 8), 0, clamp(z, -WORLD/2 + 8, WORLD/2 - 8));
        unstuckActor(player);
      }
      player.vel.set(0,0,0); player.mesh.position.copy(player.pos); updateCamera(); saveProgress(); toast('Command teleported you.');
    } else if (cmd === 'gamemode') {
      const mode = (parts.shift() || '').toLowerCase();
      if (!['survival','creative','adventure','spectator'].includes(mode)) { toast('Use: /gamemode survival|creative|adventure|spectator'); return; }
      gameMode = mode;
      if (mode === 'creative') {
        player.hp = player.maxHp; player.shieldHp = player.maxShield;
        ['command_block','ender_pearl','eye_of_ender','tnt','piston','sticky_piston','redstone_dust','redstone_repeater','redstone_comparator','dispenser','dropper','lever','button','flint_steel','golden_apple','firework_rocket','totem_undying','shulker_box','crafting_table','furnace','bed','respawn_anchor','water_bucket','empty_bucket','compass','clock','emerald','netherrack_block','nether_brick_block','basalt_block','glowstone_block','magma_block','end_stone_block','purpur_block','end_rod','chorus_flower','chorus_fruit','popped_chorus_fruit','shulker_shell','end_crystal','dragon_head','dragon_egg','aether_grass_block','holystone_block','cloud_block','skyroot_block','aether_brick_block','gravitite_ore','ambrosium_shard','zanite_gem','aether_key','valkyrie_lance'].forEach(id => addItem(player.inventory, id, canStack(id) ? 16 : 1, true));
        renderInventory();
      }
      updateUI(); saveProgress(); toast(`Game mode set to ${mode}.`);
    } else if (cmd === 'time') {
      if ((parts.shift() || '').toLowerCase() !== 'set') { toast('Use: /time set day|night|noon|midnight'); return; }
      setWorldTime((parts.shift() || 'day').toLowerCase());
    } else if (cmd === 'weather') {
      setWeather((parts.shift() || 'clear').toLowerCase());
    } else if (cmd === 'effect') {
      if ((parts[0] || '').toLowerCase() === 'give') parts.shift();
      const target = parts.shift();
      if (!isPlayerTarget(target)) { toast('Use: /effect give @s effect seconds amplifier'); return; }
      const effect = (parts.shift() || '').toLowerCase();
      const amplifier = clamp(Math.floor(Number(parts[1]) || Number(parts[0]) || 1), 1, 10);
      if (['healing','instant_health','regeneration'].includes(effect)) { player.hp = player.maxHp; player.shieldHp = player.maxShield; toast('Command healed you.'); }
      else if (['speed','haste','swiftness'].includes(effect)) { player.progress.speed *= 1 + amplifier * .08; toast(`Command gave ${effect}.`); }
      else if (['strength','sharpness'].includes(effect)) { player.progress.damage *= 1 + amplifier * .08; toast(`Command gave ${effect}.`); }
      else if (effect === 'night_vision' || effect === 'invisibility') toast(`${effect} has no visual system here, but command accepted.`);
      else { toast('Effects: healing, speed, strength, night_vision, invisibility'); return; }
      updateUI(); saveProgress();
    } else if (cmd === 'summon') {
      const what = (parts.shift() || '').toLowerCase();
      if (!['red_raider','enemy','zombie','skeleton','pillager','boss'].includes(what)) { toast('Use: /summon zombie|skeleton|pillager|boss'); return; }
      const x = Number(parts[0]), z = Number(parts.length >= 3 ? parts[2] : parts[1]);
      const pos = Number.isFinite(x) && Number.isFinite(z) ? new THREE.Vector3(x, 0, z) : player.pos.clone().addScaledVector(yawDir(), 12);
      const bot = createActor('Summoned Raider', 'red', pos.x, pos.z, true);
      addItem(bot.inventory, what === 'boss' ? 'netherite_sword' : 'iron_sword', 1); entities.push(bot); toast(`Command summoned ${what}.`);
    } else if (cmd === 'locate') {
      if ((parts.shift() || '').toLowerCase() !== 'structure') { toast('Use: /locate structure loot_chest|secret_passage|red_base'); return; }
      locateStructure((parts.shift() || 'loot_chest').toLowerCase());
    } else if (cmd === 'gamerule') {
      const rule = parts.shift();
      const value = (parts.shift() || '').toLowerCase();
      if (!rule || !['true','false'].includes(value)) { toast('Use: /gamerule keepInventory true'); return; }
      worldRules[rule] = value === 'true';
      toast(`Gamerule ${rule} = ${worldRules[rule]}.`);
    } else if (cmd === 'kill') {
      const target = parts.shift() || '@s';
      if (isPlayerTarget(target)) { damageActor(player, 9999, null, 'command'); toast('Command killed player.'); return; }
      if (target.startsWith('@e')) {
        for (const e of entities) if (e.ai && e.team === 'red' && e.alive) damageActor(e, 9999, player, 'command');
        toast('Command cleared enemies.');
      } else toast('Use: /kill @s or /kill @e[type=zombie]');
    } else if (cmd === 'xp' || cmd === 'experience') {
      gainXP(Math.max(1, Math.floor(Number(parts.shift()) || 100)), 'Command Block');
    } else {
      block.command = promptCommandBlock(command);
      toast('Unknown command. Command Block opened for editing.');
    }
  }

  function targetPlacedBlock(range = 5) {
    const { x, z, key } = placementCell(range);
    const direct = placedBlocks.get(key);
    if (direct && (direct.dimension || 'overworld') === currentDimension) return direct;
    const close = placedBlocks.get(cellKey(gridSnap(player.pos.x + yawDir().x * 4), gridSnap(player.pos.z + yawDir().z * 4)));
    return close && (close.dimension || 'overworld') === currentDimension ? close : null;
  }

  function useFlintAndSteel() {
    const b = targetPlacedBlock(5);
    if (b && itemDefs[b.type].tnt) { igniteTNT(b); return; }
    const pos = player.pos.clone().addScaledVector(yawDir(), 4);
    const fire = new THREE.PointLight(0xff6a20, 1.4, 8);
    fire.position.set(pos.x, 1.2, pos.z); scene.add(fire);
    setTimeout(() => scene.remove(fire), 1200);
    toast('Flint and Steel sparked fire.');
  }

  function updateAnchorLabel(block) {
    if (!block.label) return;
    scene.remove(block.label);
    const label = makeLabel(`ANCHOR ${block.charges || 0}/4`, '#bff7ff', 'rgba(8,20,34,.78)');
    label.position.set(block.x, 3.2, block.z); label.scale.set(4.8, .8, 1); scene.add(label); trackDimensionObject(label, block.dimension || currentDimension);
    block.label = label;
  }

  function useRespawnAnchor(block) {
    if (currentDimension !== 'nether') {
      toast('Respawn Anchors only work safely in the Nether.');
      return;
    }
    if (countItem(player.inventory, 'glowstone_block') > 0 && (block.charges || 0) < 4) {
      removeItem(player.inventory, 'glowstone_block', 1);
      block.charges = (block.charges || 0) + 1;
      updateAnchorLabel(block);
      toast(`Respawn Anchor charged to ${block.charges}/4.`);
      renderInventory(); saveProgress();
      return;
    }
    if ((block.charges || 0) <= 0) { toast('Respawn Anchor needs Glowstone.'); return; }
    player.netherRespawn = { x: block.x, y: 0, z: block.z, charges: block.charges };
    toast('Nether respawn point set.');
    saveProgress();
  }

  function useCompass() {
    if (currentDimension === 'nether') toast('Compass spins wildly in the Nether.');
    else toast(`Compass points home: x ${Math.round(flags.blue.home.x)}, z ${Math.round(flags.blue.home.z)}.`);
  }

  function useClock() {
    if (currentDimension === 'nether') toast('Clock spins wildly. The Nether has no daylight cycle.');
    else toast('Clock ticks normally in the castle.');
  }

  function minedBlockDrop(block) {
    const stack = makeStack(block.type, 1);
    if (itemDefs[block.type]?.shulker) stack.contents = (block.contents || []).map(cleanSavedStack).filter(Boolean).slice(0, 27);
    return stack;
  }

  function minePlacedBlock(block) {
    if (!isMiningTool()) { toast('Hold a pickaxe or axe to mine blocks.'); return true; }
    const drop = minedBlockDrop(block);
    if (!insertStack(player.inventory, drop, true)) { toast('Inventory is full.'); return true; }
    block.height -= 1;
    if (block.height <= 0) removePlacedBlock(block);
    else {
      block.mesh.scale.y = block.height;
      block.mesh.position.y = block.height;
      if (block.collider) block.collider.max.y = block.height * 2;
    }
    toast(`Mined ${itemDefs[block.type].name}.`);
    renderInventory(); updateRedstone(); saveProgress();
    return true;
  }

  function targetFloorCellFromCrosshair(maxDist = 18) {
    const look = raycastLook(maxDist);
    if (look.dir.y >= -0.08) return null;
    const t = (GROUND_Y - look.origin.y) / look.dir.y;
    if (t < 0 || t > maxDist) return null;
    const point = look.origin.clone().addScaledVector(look.dir, t);
    const x = gridSnap(point.x), z = gridSnap(point.z), key = cellKey(x, z);
    if (hitsWorld(x, z, 1.8, 0) || placedBlocks.has(key)) return null;
    return { x, z, key };
  }

  function createBrokenFloorHole(x, z, depth = 1) {
    const key = cellKey(x, z);
    const mesh = addBox('mined floor', x, -0.09, z, 4.2, .1, 4.2, mats.black, false);
    const debris = [
      addBox('floor debris', x - 1.6, .02, z - 1.6, .7, .18, .7, mats.dirt, false),
      addBox('floor debris', x + 1.45, .02, z + 1.35, .8, .18, .6, mats.stoneDark, false)
    ];
    const hole = { x, z, mesh, debris, depth: 0 };
    brokenFloor.set(key, hole);
    for (let i = 0; i < depth; i++) deepenFloorHole(hole);
    return hole;
  }

  function deepenFloorHole(hole) {
    hole.depth = Math.min(999, (hole.depth || 0) + 1);
    hole.mesh.position.y = -0.09 - hole.depth * .34;
    hole.mesh.scale.y = 1 + hole.depth * .45;
    for (const d of hole.debris) d.position.y = .02 - Math.min(2.5, hole.depth * .08);
  }

  function restoreSavedBrokenFloors(saved) {
    if (!Array.isArray(saved)) return;
    for (const h of saved) {
      const x = gridSnap(Number(h.x) || 0), z = gridSnap(Number(h.z) || 0), key = cellKey(x, z);
      if (brokenFloor.has(key) || hitsWorld(x, z, 1.8, 0) || placedBlocks.has(key)) continue;
      createBrokenFloorHole(x, z, clamp(Math.floor(Number(h.depth) || 1), 1, 999));
    }
  }

  function mineFloorWithPickaxe() {
    if (!isMiningTool()) return false;
    const cell = targetFloorCellFromCrosshair(18) || placementCell(4);
    const { x, z, key } = cell;
    if (hitsWorld(x, z, 1.8, 0) || placedBlocks.has(key)) return false;
    let hole = brokenFloor.get(key);
    if (!hole) hole = createBrokenFloorHole(x, z, 0);
    deepenFloorHole(hole);
    addItem(player.inventory, 'dirt_block' in itemDefs ? 'dirt_block' : 'stone_block', 1, true);
    toast(`Mined floor depth ${hole.depth} and collected a block.`);
    renderInventory(); saveProgress(); return true;
  }

  function updateHeldFloorMining(dt) {
    if (!player?.alive || !mouseButtons.left || !isMiningTool() || !invPanel.classList.contains('hidden') || !enchantPanel.classList.contains('hidden') || !shulkerPanel.classList.contains('hidden')) {
      miningState.key = null; miningState.progress = 0; return;
    }
    const cell = targetFloorCellFromCrosshair(18);
    if (!cell) { miningState.key = null; miningState.progress = 0; return; }
    if (cell.key !== miningState.key) { miningState.key = cell.key; miningState.progress = 0; }
    miningState.progress += dt;
    if (miningState.progress >= .65) {
      miningState.progress = 0;
      mineFloorWithPickaxe();
    }
  }

  function useConsumable(stack) {
    const d = itemDefs[stack.id];
    if (d.waterBucket) {
      if (currentDimension === 'nether') {
        steamEffect(player.pos.clone().addScaledVector(yawDir(), 2.5));
        player.fire = 0;
        if (gameMode !== 'creative') { removeStackByUid(player.inventory, stack.uid); addItem(player.inventory, 'empty_bucket', 1, true); }
        toast('Water hissed into steam in the Nether. Fire put out.');
        renderInventory(); saveProgress();
      } else {
        player.fire = 0;
        toast('Splashed water and put out fire.');
      }
    } else if (d.chorusFruit) {
      const target = safeSpawnNear(player.pos.clone().add(new THREE.Vector3(rand(-18,18), 0, rand(-18,18))));
      player.pos.copy(target); player.vel.set(0,0,0); player.mesh.position.copy(player.pos); updateCamera();
      if (gameMode !== 'creative') removeItem(player.inventory, stack.id, 1);
      toast('Chorus Fruit teleported you nearby.');
      renderInventory(); saveProgress();
    } else if (d.eyeEnder) {
      toast(currentDimension === 'end' ? 'Eye of Ender drifts toward End City loot.' : 'Eye of Ender points toward the End Portal.');
    } else if (d.heal) {
      if (player.hp >= player.maxHp) { toast('Health is already full.'); return; }
      player.hp = Math.min(player.maxHp, player.hp + d.heal);
      if (gameMode !== 'creative') removeItem(player.inventory, stack.id, 1); toast('Used Med Kit.'); renderInventory();
    } else if (d.goldenApple) {
      player.hp = Math.min(player.maxHp, player.hp + 70);
      player.shieldHp = Math.min(player.maxShield, player.shieldHp + 35);
      player.fire = 0; player.poison = 0;
      if (gameMode !== 'creative') removeItem(player.inventory, stack.id, 1);
      toast('Ate Golden Apple: healed, shielded, and cleared effects.'); renderInventory(); updateUI();
    } else if (d.firework) {
      const wings = player.equipment.wings;
      if (!wings || !itemDefs[wings.id].glide) { toast('Fireworks need Elytra equipped.'); return; }
      const dir = yawDir();
      player.vel.x += dir.x * 18; player.vel.z += dir.z * 18; player.vel.y = Math.max(player.vel.y, 14);
      if (gameMode !== 'creative') removeItem(player.inventory, stack.id, 1);
      toast('Firework boosted your Elytra flight.'); renderInventory();
    } else if (d.blink) {
      const dir = yawDir();
      const target = player.pos.clone().addScaledVector(dir, 18);
      if (!hitsWorld(target.x, target.z, player.radius, 0)) {
        player.pos.copy(target); if (gameMode !== 'creative') removeItem(player.inventory, stack.id, 1); toast('Ender Pearl teleported you forward.'); renderInventory();
      } else toast('Blink blocked by wall.');
    }
  }

  function steamEffect(pos) {
    for (let i = 0; i < 12; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(.32 + Math.random() * .38, 8, 6), mat(0xd9d0c5, false, .46));
      puff.position.copy(pos).add(new THREE.Vector3(rand(-1.8,1.8), rand(.4,2.5), rand(-1.8,1.8)));
      scene.add(puff); trackDimensionObject(puff, currentDimension);
      setTimeout(() => scene.remove(puff), 650 + i * 35);
    }
  }

  function openPlacedShulker(block) {
    activeShulker = block;
    activeShulker.contents ||= [];
    invPanel.classList.remove('hidden');
    shulkerPanel.classList.remove('hidden');
    shulkerTitleEl.textContent = `Shulker Box (${activeShulker.contents.length}/27)`;
    toast('Shulker Box open. Click inventory items to store them; click shulker items to take them out.');
    renderInventory();
  }

  function closeShulkerPanel() {
    activeShulker = null;
    shulkerPanel.classList.add('hidden');
  }

  function renderShulkerPanel() {
    if (!shulkerSlotsEl) return;
    const open = activeShulker && !shulkerPanel.classList.contains('hidden');
    if (!open) { shulkerSlotsEl.innerHTML = ''; return; }
    activeShulker.contents ||= [];
    shulkerTitleEl.textContent = `Shulker Box (${activeShulker.contents.length}/27)`;
    shulkerSlotsEl.innerHTML = '';
    for (let i = 0; i < 27; i++) {
      const s = activeShulker.contents[i];
      const div = document.createElement('div');
      div.className = 'slot' + (!s ? ' empty' : '');
      if (s) {
        const d = itemDefs[s.id];
        div.title = `Take ${stackLabel(s)}`;
        div.innerHTML = `<span class="icon">${d.icon}</span><span class="name">${d.name}</span>${s.count > 1 ? `<span class="count">${s.count}</span>` : ''}${enchantPower(s) ? `<span class="ench">âœ¦${enchantPower(s)}</span>` : ''}`;
        div.onclick = () => takeFromShulker(i);
      } else {
        div.title = 'Empty shulker slot';
      }
      shulkerSlotsEl.appendChild(div);
    }
  }

  function storeStackInActiveShulker(slots, index) {
    if (!activeShulker || shulkerPanel.classList.contains('hidden')) return false;
    const stack = slots[index];
    if (!stack) return true;
    activeShulker.contents ||= [];
    if (itemDefs[stack.id]?.shulker) { toast('Shulker Boxes cannot go inside Shulker Boxes.'); return true; }
    if (activeShulker.contents.length >= 27) { toast('Shulker Box is full.'); return true; }
    slots[index] = null;
    activeShulker.contents.push(cleanSavedStack(stack));
    toast(`Stored ${stackLabel(stack)} in Shulker Box.`);
    renderInventory(); saveProgress();
    return true;
  }

  function takeFromShulker(index) {
    if (!activeShulker) return;
    activeShulker.contents ||= [];
    const stack = activeShulker.contents.splice(index, 1)[0];
    if (!stack) return;
    if (!insertStack(player.inventory, stack, true)) {
      activeShulker.contents.splice(index, 0, stack);
      toast('Inventory is full.');
    } else {
      toast(`Took ${stackLabel(stack)} from Shulker Box.`);
    }
    renderInventory(); saveProgress();
  }

  function closeStationPanels() {
    craftingPanel.classList.add('hidden');
    furnacePanel.classList.add('hidden');
    tradePanel.classList.add('hidden');
  }

  function openRecipePanel(kind) {
    closeShulkerPanel();
    invPanel.classList.remove('hidden');
    if (kind === 'crafting') {
      furnacePanel.classList.add('hidden');
      craftingPanel.classList.remove('hidden');
      renderRecipes(craftingRecipesEl, CRAFTING_RECIPES, 'Craft');
      toast('Crafting Table open. Click a recipe you can afford.');
    } else {
      craftingPanel.classList.add('hidden');
      furnacePanel.classList.remove('hidden');
      renderRecipes(furnaceRecipesEl, FURNACE_RECIPES, 'Smelt');
      toast('Furnace open. Click a smelting recipe you can afford.');
    }
    renderInventory();
  }

  function recipeCostText(recipe) {
    return Object.entries(recipe.in).map(([id, count]) => `${count} ${itemDefs[id].name}`).join(' + ');
  }

  function canAffordRecipe(recipe) {
    return Object.entries(recipe.in).every(([id, count]) => countItem(player.inventory, id) >= count);
  }

  function craftRecipe(recipe, action) {
    if (!canAffordRecipe(recipe)) { toast(`Need: ${recipeCostText(recipe)}.`); return; }
    for (const [id, count] of Object.entries(recipe.in)) removeItem(player.inventory, id, count);
    addItem(player.inventory, recipe.out, recipe.count, true);
    toast(`${action}ed ${recipe.count} ${itemDefs[recipe.out].name}.`);
    renderInventory(); renderRecipes(craftingRecipesEl, CRAFTING_RECIPES, 'Craft'); renderRecipes(furnaceRecipesEl, FURNACE_RECIPES, 'Smelt'); saveProgress();
  }

  function renderRecipes(root, recipes, action) {
    if (!root) return;
    root.innerHTML = '';
    for (const recipe of recipes) {
      const ok = canAffordRecipe(recipe);
      const out = itemDefs[recipe.out];
      const btn = document.createElement('button');
      btn.className = 'recipeBtn' + (ok ? '' : ' disabled');
      btn.innerHTML = `<span><b>${out.icon} ${out.name} x${recipe.count}</b><small>${recipeCostText(recipe)}</small></span><span class="make">${action}</span>`;
      btn.onclick = () => craftRecipe(recipe, action);
      root.appendChild(btn);
    }
  }

  function openTradePanel(villager) {
    closeShulkerPanel(); closeStationPanels();
    invPanel.classList.remove('hidden');
    tradePanel.classList.remove('hidden');
    tradeTitleEl.textContent = `${villager.job} Trading`;
    renderTradeOptions(villager);
    toast(`Trading with ${villager.job}.`);
    renderInventory();
  }

  function renderTradeOptions(villager) {
    tradeOptionsEl.innerHTML = '';
    for (const trade of villager.trades) {
      const ok = canAffordRecipe(trade);
      const out = itemDefs[trade.out];
      const btn = document.createElement('button');
      btn.className = 'recipeBtn' + (ok ? '' : ' disabled');
      btn.innerHTML = `<span><b>${out.icon} ${out.name} x${trade.count}</b><small>${recipeCostText(trade)}</small></span><span class="make">Trade</span>`;
      btn.onclick = () => { craftRecipe(trade, 'Trad'); renderTradeOptions(villager); };
      tradeOptionsEl.appendChild(btn);
    }
  }

  function doPoost() {
    const t = nowSec();
    if (player.cooldowns.poost > t) { toast('Poost cooling down.'); return; }
    const stack = selectedStack();
    const d = stack && itemDefs[stack.id];
    const poke = d && d.type === 'melee' && d.poost ? stack : findFirst(player.inventory, (s, id) => id.type === 'melee' && id.poost);
    if (!poke) { toast('Poost needs a poke weapon like Short Spear, Sharpened Branch, Pitchfork, Spear, Halberd, or Trident.'); return; }
    const pd = itemDefs[poke.id];
    const dir = yawDir();
    const boostBonus = hasEnchant(poke, 'Poost Burst') ? 1 + poke.enchants['Poost Burst'] * .18 : 1;
    const nearLadder = distXZ(player.pos, new THREE.Vector3(-8,0,0)) < 8 || distXZ(player.pos, new THREE.Vector3(64,0,-64)) < 8 || distXZ(player.pos, new THREE.Vector3(-64,0,64)) < 8;
    const nearEdge = hitsWorld(player.pos.x + dir.x * 2.2, player.pos.z + dir.z * 2.2, player.radius + .2, player.pos.y) || distXZ(player.pos, new THREE.Vector3(-16,0,13)) < 7 || distXZ(player.pos, new THREE.Vector3(18,0,-14)) < 7;
    let kind = 'Switch Poost';
    let forward = pd.family === 'pokeLight' ? 16 : 12;
    let up = player.onGround ? 2.5 : 4.3;
    if (nearLadder) { kind = 'Ladder Poost'; forward = 7; up = 12.5; }
    else if (nearEdge) { kind = 'Edge Poost'; forward = 10; up = 10.5; }
    else if (keys.has('s')) { kind = 'Spin / 180 Poost'; forward = 18; up = 3.2; }
    player.vel.x += dir.x * forward * boostBonus;
    player.vel.z += dir.z * forward * boostBonus;
    player.vel.y = Math.max(player.vel.y, up * boostBonus);
    player.cooldowns.poost = t + (pd.family === 'pokeLight' ? 1.25 : 1.65);
    slashEffect(player.pos.clone().add(new THREE.Vector3(0,1.2,0)), dir, 0x94f6ff);
    toast(`${kind}! ${itemDefs[poke.id].name} launched you forward.`);
  }

  function pickupOpenMine() {
    let best = null, bestD = 3.4;
    for (const l of lootDrops) {
      if ((l.dimension || 'overworld') !== currentDimension) continue;
      const d = distXZ(player.pos, l.pos);
      if (d < bestD) { bestD = d; best = l; }
    }
    if (best) {
      const ok = addItem(player.inventory, best.stack.id, best.stack.count, true);
      if (ok) {
        toast(`Picked up ${best.stack.count} ${stackLabel(best.stack)}.`);
        scene.remove(best.mesh); lootDrops.splice(lootDrops.indexOf(best), 1); renderInventory(); return;
      }
      toast('Inventory is full.'); return;
    }
    for (const c of chests) {
      if ((c.dimension || 'overworld') === currentDimension && distXZ(player.pos, c.pos) < 5) { openChest(c); return; }
    }
    if (currentDimension === 'overworld') {
      const villager = villagers.find(v => distXZ(player.pos, v.pos) < 5);
      if (villager) { openTradePanel(villager); return; }
    }
    const nearbyShulker = [...placedBlocks.values()].find(b => (b.dimension || 'overworld') === currentDimension && itemDefs[b.type]?.shulker && distXZ(player.pos, b) < 5.5);
    if (nearbyShulker && isMiningTool()) { minePlacedBlock(nearbyShulker); return; }
    if (nearbyShulker) { openPlacedShulker(nearbyShulker); return; }
    const look = raycastLook(5);
    const x = gridSnap(look.point.x), z = gridSnap(look.point.z), key = cellKey(x,z);
    const b = placedBlocks.get(key);
    if (b && (b.dimension || 'overworld') === currentDimension && distXZ(player.pos, new THREE.Vector3(x,0,z)) < 7) {
      if (isMiningTool()) { minePlacedBlock(b); return; }
      if (itemDefs[b.type].shulker) { openPlacedShulker(b); return; }
      if (itemDefs[b.type].craftingTable) { openRecipePanel('crafting'); return; }
      if (itemDefs[b.type].furnace) { openRecipePanel('furnace'); return; }
      if (itemDefs[b.type].respawnAnchor) { useRespawnAnchor(b); return; }
      if (itemDefs[b.type].commandBlock) { runCommandBlock(b); return; }
      if (itemDefs[b.type].powerSwitch || itemDefs[b.type].button) { togglePowerBlock(b); return; }
      if (itemDefs[b.type].dispenser || itemDefs[b.type].dropper) { triggerContainerBlock(b); return; }
      minePlacedBlock(b); return;
    }
    if (mineFloorWithPickaxe()) return;
    const node = resourceNodeNearby();
    if (node) { addItem(player.inventory, node.id, node.amount, true); toast(`Collected ${node.amount} ${itemDefs[node.id].name}.`); renderInventory(); return; }
    toast('Nothing nearby. Try a chest, loot drop, block, or resource pile.');
  }

  function resourceNodeNearby() {
    const nodes = currentDimension === 'end' ? [
      { pos: new THREE.Vector3(0,0,0), id: 'end_stone_block', amount: 10 },
      { pos: new THREE.Vector3(58,0,-42), id: 'purpur_block', amount: 6 },
      { pos: new THREE.Vector3(-22,0,10), id: 'chorus_fruit', amount: 5 },
      { pos: new THREE.Vector3(48,0,58), id: 'end_rod', amount: 4 },
      { pos: new THREE.Vector3(28,0,-26), id: 'end_crystal', amount: 1 }
    ] : currentDimension === 'nether' ? [
      { pos: new THREE.Vector3(-64,0,-58), id: 'basalt_block', amount: 5 },
      { pos: new THREE.Vector3(-18,0,-58), id: 'netherrack_block', amount: 10 },
      { pos: new THREE.Vector3(20,0,76), id: 'glowstone_block', amount: 3 },
      { pos: new THREE.Vector3(56,0,28), id: 'magma_block', amount: 4 },
      { pos: new THREE.Vector3(0,0,4), id: 'nether_brick_block', amount: 4 }
    ] : [
      { pos: new THREE.Vector3(-45,0,12), id: 'wood_block', amount: 8 },
      { pos: new THREE.Vector3(45,0,-10), id: 'stone_block', amount: 8 },
      { pos: new THREE.Vector3(0,0,60), id: 'gold_block', amount: 3 },
      { pos: new THREE.Vector3(0,0,-60), id: 'obsidian_block', amount: 2 }
    ];
    return nodes.find(n => distXZ(player.pos, n.pos) < 6);
  }

  function openChest(c) {
    if (c.cooldown > nowSec()) { toast('This chest is refilling.'); return; }
    c.opened = true; c.cooldown = nowSec() + 30;
    c.lid.rotation.x = -0.8;
    setTimeout(() => { c.lid.rotation.x = 0; c.opened = false; }, 1800);
    const loot = chestLoot(c.quality);
    for (const [id,count] of loot) addItem(player.inventory, id, count, true);
    const names = loot.map(([id,count]) => `${count} ${itemDefs[id].name}`).join(', ');
    toast(`Chest opened: ${names}`); renderInventory();
  }
  function chestLoot(q) {
    const pools = {
      good: ['iron_arrow','wood_block','stone_block','medkit','lapis','wood_sword','stone_axe','short_spear','leather_chestplate','gold_helmet','scout_bow','redstone_dust','lever','button'],
      rare: ['fire_arrow','poison_arrow','iron_sword','iron_axe','pitchfork','iron_shield','iron_chestplate','chainmail_leggings','crossbow','gold_block','lapis','ender_pearl','tnt','piston','dispenser','dropper','flint_steel','golden_apple','netherrack_block','glowstone_block','magma_block','aether_grass_block','holystone_block','cloud_block','skyroot_block','ambrosium_shard'],
      epic: ['piercing_arrow','diamond_sword','diamond_axe','halberd','trident','tower_shield','diamond_chestplate','turtle_helmet','sharpshooter_bow','ender_pearl','command_block','obsidian_block','sticky_piston','redstone_repeater','redstone_comparator','firework_rocket','shulker_box','nether_brick_block','basalt_block','glowstone_block','end_stone_block','chorus_fruit','purpur_block','shulker_shell','aether_brick_block','gravitite_ore','zanite_gem','aether_key'],
      legendary: ['explosive_arrow','netherite_sword','netherite_axe','mace_weapon','fang_tian','netherite_shield','netherite_chestplate','elytra_wings','storm_bow','command_block','tnt','sticky_piston','totem_undying','shulker_box','lapis','nether_brick_block','magma_block','dragon_head','dragon_egg','end_crystal','end_rod','eye_of_ender','valkyrie_lance','zanite_gem','gravitite_ore','aether_key']
    };
    const picks = q === 'legendary' ? 5 : q === 'epic' ? 4 : 3;
    const out = [];
    for (let i=0;i<picks;i++) {
      const id = choice(pools[q] || pools.good);
      const d = itemDefs[id];
      let count = d.type === 'arrow' ? Math.floor(rand(8, 24)) : d.type === 'block' || d.type === 'material' ? Math.floor(rand(3, 11)) : 1;
      out.push([id, count]);
    }
    return out;
  }

  function useSecretPassage() {
    for (const portal of netherPortals) {
      if (portal.dimension === currentDimension && distXZ(player.pos, portal.pos) < 6) { travelDimension(portal); return; }
    }
    if (currentDimension !== 'overworld') { toast('No return portal nearby. Look for the purple frame.'); return; }
    for (const p of secretPassages) {
      if ((p.dimension || 'overworld') !== currentDimension) continue;
      const atA = distXZ(player.pos, p.a) < 8;
      const atB = distXZ(player.pos, p.b) < 8;
      if (!atA && !atB) continue;
      const target = atA ? p.b : p.a;
      player.pos.copy(safeSpawnNear(target));
      player.vel.set(0, 0, 0);
      player.mesh.position.copy(player.pos);
      updateCamera();
      saveProgress();
      toast(`Used ${p.name}.`);
      return;
    }
    toast('No secret passage nearby. Look for glowing blue doors.');
  }

  function updatePlayer(dt) {
    if (!player.alive) return;
    if (unstuckActor(player)) return;
    const forward = yawDir(); const right = rightDir();
    const creative = gameMode === 'creative' || gameMode === 'spectator';
    let wish = new THREE.Vector3();
    if (keys.has('w')) wish.add(forward);
    if (keys.has('s')) wish.addScaledVector(forward, -1);
    // Standard strafing: A moves left and D moves right.
    if (keys.has('a')) wish.addScaledVector(right, -1);
    if (keys.has('d')) wish.add(right);
    if (wish.lengthSq() > 0) wish.normalize();
    const speedBase = (creative ? 18 : 13.5) * player.progress.speed * (activeItemDef()?.moveBonus ? 1 + activeItemDef().moveBonus : 1);
    const sneakBonus = player.equipment.boots && hasEnchant(player.equipment.boots, 'Swift Sneak') ? 1 + player.equipment.boots.enchants['Swift Sneak'] * .04 : 1;
    const speed = speedBase * sneakBonus * (player.blocking ? .58 : 1);
    const accel = creative ? 36 : player.onGround ? 42 : 12;
    player.vel.x += wish.x * accel * dt; player.vel.z += wish.z * accel * dt;
    const horiz = Math.hypot(player.vel.x, player.vel.z);
    const max = speed + (player.onGround ? 0 : 4);
    if (horiz > max) { player.vel.x = player.vel.x / horiz * max; player.vel.z = player.vel.z / horiz * max; }
    player.blocking = !creative && (mouseButtons.right || keys.has('shift'));
    const wings = player.equipment.wings;
    const glide = !creative && wings && itemDefs[wings.id].glide && keys.has(' ') && player.vel.y < -0.3 && !player.onGround;
    ui.elytraText.textContent = creative ? 'Creative Fly' : glide ? 'Gliding' : wings ? 'Equipped' : 'Off';
    if (creative) {
      const fly = (keys.has(' ') ? 1 : 0) - (keys.has('shift') ? 1 : 0);
      player.vel.y = fly * 18;
    } else {
      const gravity = glide ? -5.2 : -23;
      player.vel.y += gravity * dt;
    }
    if (glide) {
      const glideBonus = hasEnchant(wings, 'Swift Glide') ? 1 + wings.enchants['Swift Glide'] * .12 : 1;
      player.vel.x += forward.x * 8 * glideBonus * dt; player.vel.z += forward.z * 8 * glideBonus * dt;
      player.vel.y = Math.max(player.vel.y, -3.8);
    }
    const desired = player.pos.clone().add(new THREE.Vector3(player.vel.x * dt, 0, player.vel.z * dt));
    if (creative) player.pos.x = clamp(desired.x, -WORLD/2 + 5, WORLD/2 - 5), player.pos.z = clamp(desired.z, -WORLD/2 + 5, WORLD/2 - 5);
    else collideHorizontal(player, desired);
    player.pos.y += player.vel.y * dt;
    if (creative) {
      player.pos.y = clamp(player.pos.y, GROUND_Y, 140);
      player.onGround = player.pos.y <= GROUND_Y + .01;
    } else if (player.pos.y <= GROUND_Y) { player.pos.y = GROUND_Y; player.vel.y = 0; player.onGround = true; }
    else player.onGround = false;
    player.vel.x *= Math.pow(player.onGround ? .03 : .28, dt); player.vel.z *= Math.pow(player.onGround ? .03 : .45, dt);
    player.mesh.position.copy(player.pos); player.mesh.rotation.y = yaw;
  }

  function jump() {
    if (!player.alive) return;
    if (gameMode === 'creative' || gameMode === 'spectator') { player.vel.y = Math.max(player.vel.y, 12); player.onGround = false; return; }
    if (player.onGround) { player.vel.y = 9.2; player.onGround = false; }
  }

  function updateBots(dt) {
    for (const bot of entities) {
      if (!bot.ai) continue;
      if ((bot.dimension || 'overworld') !== currentDimension) { bot.mesh.visible = false; continue; }
      bot.mesh.visible = bot.alive;
      if (!bot.alive) { bot.respawn -= dt; if (bot.respawn <= 0) respawnActor(bot); continue; }
      bot.aiTimer -= dt;
      const enemies = entities.filter(e => e.alive && e.team !== bot.team && (e.dimension || 'overworld') === currentDimension);
      let target = enemies[0]; let best = Infinity;
      for (const e of enemies) { const d = distXZ(bot.pos, e.pos); if (d < best) { best = d; target = e; } }
      const enemyFlag = flags[bot.team === 'blue' ? 'red' : 'blue'];
      const ownBase = bot.team === 'blue' ? flags.blue.home : flags.red.home;
      let goal = target ? target.pos : enemyFlag.pos;
      if (!target || best > 28) goal = bot.carrying ? ownBase : enemyFlag.pos;
      const to = goal.clone().sub(bot.pos); const flat = new THREE.Vector3(to.x,0,to.z); const len = flat.length();
      if (len > 0.1) {
        flat.normalize(); bot.yaw = Math.atan2(flat.x, flat.z);
        bot.vel.x += flat.x * 22 * dt; bot.vel.z += flat.z * 22 * dt;
      }
      if (target && best < 55) {
        const toT = target.pos.clone().sub(bot.pos); bot.yaw = Math.atan2(toT.x, toT.z);
        const bow = findFirst(bot.inventory, (s,d)=>d.type === 'bow');
        const meleeW = findFirst(bot.inventory, (s,d)=>d.type === 'melee');
        if (best < 4.7 && meleeW) meleeAttack(bot, meleeW);
        else if (bow) shootBow(bot, bow);
        if (best < 12 && meleeW && itemDefs[meleeW.id].poost && Math.random() < .01) {
          const dir = new THREE.Vector3(Math.sin(bot.yaw),0,Math.cos(bot.yaw)); bot.vel.addScaledVector(dir, 7); bot.vel.y = Math.max(bot.vel.y, 2.5);
        }
      }
      const horiz = Math.hypot(bot.vel.x, bot.vel.z); const max = 10;
      if (horiz > max) { bot.vel.x = bot.vel.x / horiz * max; bot.vel.z = bot.vel.z / horiz * max; }
      bot.vel.y += -23 * dt;
      collideHorizontal(bot, bot.pos.clone().add(new THREE.Vector3(bot.vel.x*dt,0,bot.vel.z*dt)));
      bot.pos.y += bot.vel.y * dt; if (bot.pos.y <= 0) { bot.pos.y = 0; bot.vel.y = 0; bot.onGround = true; }
      bot.vel.x *= Math.pow(.08, dt); bot.vel.z *= Math.pow(.08, dt);
      bot.mesh.position.copy(bot.pos); bot.mesh.rotation.y = bot.yaw;
      updateFlagPickup(bot);
    }
  }

  function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      if ((p.dimension || 'overworld') !== currentDimension) continue;
      p.life -= dt; p.vel.y -= 9.2 * dt; p.pos.addScaledVector(p.vel, dt); p.mesh.position.copy(p.pos); p.mesh.lookAt(p.pos.clone().add(p.vel));
      if (p.life <= 0 || p.pos.y < 0 || hitsWorld(p.pos.x, p.pos.z, .25, Math.max(0,p.pos.y))) { scene.remove(p.mesh); projectiles.splice(i,1); continue; }
      for (const e of entities) {
        if ((e.dimension || 'overworld') !== (p.dimension || currentDimension)) continue;
        if (!e.alive || e.team === p.team || p.hit.has(e.id)) continue;
        if (distXZ(e.pos, p.pos) < e.radius + .45 && p.pos.y < 3.6) {
          p.hit.add(e.id);
          const arrow = itemDefs[p.arrowId];
          let kind = arrow.fire ? 'fire' : arrow.explosive ? 'blast' : 'projectile';
          damageActor(e, p.damage, p.owner, kind);
          if (arrow.fire) e.fire = Math.max(e.fire, 3);
          if (arrow.poison) e.poison = Math.max(e.poison, 4);
          if (arrow.explosive) explode(p.pos, p.owner, p.damage * .7);
          if (!arrow.pierce && !hasEnchant(p.weaponStack, 'Piercing')) { scene.remove(p.mesh); projectiles.splice(i,1); }
          break;
        }
      }
    }
  }

  function explode(pos, owner, damage) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mats.fire);
    mesh.position.copy(pos); scene.add(mesh); trackDimensionObject(mesh, owner?.dimension || currentDimension); let s = 1;
    const timer = setInterval(() => { s += .8; mesh.scale.setScalar(s); if (s > 5) { clearInterval(timer); scene.remove(mesh); } }, 30);
    for (const e of entities) if ((e.dimension || 'overworld') === (owner?.dimension || currentDimension) && e.alive && e.team !== owner.team && distXZ(e.pos, pos) < 8) damageActor(e, damage, owner, 'blast');
  }

  function consumeTotem() {
    const totem = findFirst(player.inventory, (s, d) => d.totem);
    if (!totem) return false;
    removeStackByUid(player.inventory, totem.uid);
    player.hp = Math.max(1, Math.floor(player.maxHp * .45));
    player.shieldHp = player.maxShield;
    player.fire = 0; player.poison = 0; player.vel.y = 8;
    toast('Totem of Undying saved you!');
    renderInventory(); updateUI(); saveProgress();
    return true;
  }

  function damageActor(target, amount, source, kind) {
    if (!target.alive) return;
    if (target === player && player.dimensionGraceUntil && nowSec() < player.dimensionGraceUntil) {
      player.hp = Math.max(player.hp, Math.ceil(player.maxHp * .75));
      player.shieldHp = player.maxShield;
      updateUI();
      return;
    }
    if (target === player && gameMode === 'creative') {
      player.hp = player.maxHp; player.shieldHp = player.maxShield; updateUI();
      return;
    }
    let dmg = amount * (source && source.progress ? source.progress.damage : 1);
    if (target.blocking && target.equipment.shield && target.shieldHp > 0) {
      if (target === player) toast('Shield blocked all damage.');
      if (hasEnchant(target.equipment.shield, 'Thorns') && source && source.alive) source.hp -= 3 * target.equipment.shield.enchants['Thorns'];
      return;
    } else if (target.shieldHp > 0) {
      const absorb = Math.min(target.shieldHp, dmg * .22); target.shieldHp -= absorb; dmg -= absorb;
    }
    dmg *= 1 - armorReduction(target, kind);
    target.hp -= Math.max(1, dmg);
    hitFlash(target);
    if (target === player && target.hp <= 0 && consumeTotem()) return;
    if (target.hp <= 0) killActor(target, source);
  }

  function hitFlash(actor) {
    const flash = new THREE.PointLight(0xffdf9e, 1.5, 7);
    flash.position.copy(actor.pos).add(new THREE.Vector3(0,2,0)); scene.add(flash);
    setTimeout(() => scene.remove(flash), 80);
  }

  function killActor(victim, killer) {
    victim.alive = false; victim.respawn = victim.ai ? 5 : 3; victim.hp = 0; victim.mesh.visible = false;
    if (victim.carrying) { const f = flags[victim.carrying]; f.carrier = null; f.pos.copy(victim.pos); f.mesh.visible = true; victim.carrying = null; toast(`${victim.name} dropped the flag!`); }
    const keepPlayerItems = victim === player && (worldRules.keepInventory || gameMode === 'creative' || currentDimension === 'end' || currentDimension === 'aether');
    if (!keepPlayerItems) dropLoot(victim);
    if (killer === player) {
      player.kills++;
      if (/ender dragon/i.test(victim.name)) rewardDragonDefeat(victim);
      else gainXP(clamp(victim.xpValue || 60, 1, 1200), `Eliminated ${victim.name} and took loot`);
    }
    else if (killer && killer.team === 'blue' && victim.team === 'red') gainXP(15, 'Team assist');
    if (victim === player) toast(currentDimension === 'end' || currentDimension === 'aether' ? 'You were defeated in this dimension. Inventory kept.' : 'You were defeated. Respawning soon.');
  }

  function rewardDragonDefeat(victim) {
    const levelGain = 12;
    player.progress.level = clamp(player.progress.level + levelGain, 1, MAX_SAFE_PROGRESS);
    player.progress.upgradePoints = clamp(player.progress.upgradePoints + levelGain, 0, MAX_SAFE_PROGRESS);
    player.progress.xp = 0;
    addItem(player.inventory, 'dragon_egg', 1, true);
    addItem(player.inventory, 'dragon_head', 1, true);
    addItem(player.inventory, 'elytra_wings', 1, true);
    addItem(player.inventory, 'shulker_shell', 6, true);
    addItem(player.inventory, 'end_crystal', 2, true);
    toast(`Ender Dragon defeated! +${levelGain} levels, dragon loot kept in inventory.`);
    renderInventory(); updateUI(); saveProgress();
  }
  function respawnActor(actor) {
    if (actor === player && currentDimension === 'nether' && player.netherRespawn?.charges > 0) {
      player.netherRespawn.charges--;
      actor.pos.copy(safeSpawnNear(new THREE.Vector3(player.netherRespawn.x, 0, player.netherRespawn.z)));
      actor.vel.set(0,0,0);
    } else {
      const dimension = actor.dimension || 'overworld';
      const base = dimension === 'nether'
        ? new THREE.Vector3(rand(-30, 30), 0, rand(22, 68))
        : dimension === 'end'
          ? safeEndArrival(new THREE.Vector3(rand(-28, 28), 0, rand(-28, 28)))
          : dimension === 'aether'
            ? safeAetherArrival(new THREE.Vector3(rand(-18, 18), 0, rand(-16, 16)))
            : actor.team === 'blue' ? flags.blue.home : flags.red.home;
      actor.pos.copy(dimension === 'end' || dimension === 'aether' ? base : safeSpawnNear(base.clone().add(new THREE.Vector3(rand(-8,8),0,rand(-8,8)))));
      actor.vel.set(0,0,0);
    }
    actor.hp = actor.maxHp; actor.shieldHp = actor.maxShield; actor.alive = true; actor.mesh.visible = true; actor.fire = 0; actor.poison = 0;
    actor.respawn = 0; actor.blocking = false; actor.onGround = true; actor.carrying = null;
    actor.mesh.position.copy(actor.pos); actor.mesh.rotation.y = actor.yaw;
    if (actor === player) {
      keys.clear(); mouseButtons.left = false; mouseButtons.right = false;
      yaw = actor.team === 'blue' ? Math.PI * -0.25 : Math.PI * .75;
      actor.yaw = yaw; actor.mesh.rotation.y = yaw;
      updateCamera(); saveProgress(); toast('Respawned. You can move again.');
    }
  }
  function dropLoot(actor) {
    const drops = [];
    for (const area of [actor.inventory.hotbar, actor.inventory.backpack]) for (const s of area) if (s) {
      const d = itemDefs[s.id];
      let chance = d.type === 'arrow' || d.type === 'block' ? .7 : d.type === 'material' ? .45 : .52;
      if (actor.team === 'red') chance += .14;
      if (Math.random() < chance) drops.push(makeStack(s.id, canStack(s.id) ? Math.max(1, Math.floor(s.count * rand(.25,.75))) : 1));
    }
    for (const slot in actor.equipment) {
      const s = actor.equipment[slot]; if (s && Math.random() < .6) drops.push(s);
    }
    if (!drops.length) drops.push(makeStack('wooden_arrow', 12));
    drops.slice(0,8).forEach((s, idx) => createLoot(actor.pos.clone().add(new THREE.Vector3(rand(-2,2), .8, rand(-2,2))), s));
  }
  function createLoot(pos, stack) {
    const color = rarityColor(itemDefs[stack.id].rarity);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, .55, 1.1), mat(color, true));
    mesh.position.copy(pos); mesh.castShadow = true; scene.add(mesh);
    trackDimensionObject(mesh, currentDimension);
    lootDrops.push({ pos, mesh, stack, dimension: currentDimension, bob: rand(0,10) });
  }
  function rarityColor(r) { return ({ common:0xffffff, uncommon:0x8dff9b, rare:0x77b8ff, epic:0xc188ff, legendary:0xffdc5c })[r || 'common']; }

  function updateStatusEffects(dt) {
    for (const e of entities) {
      if (!e.alive) continue;
      if (e.fire > 0) { e.fire -= dt; e.hp -= 4 * dt; if (e.hp <= 0) killActor(e, null); }
      if (e.poison > 0) { e.poison -= dt; e.hp -= 2 * dt; if (e.hp <= 0) killActor(e, null); }
    }
  }

  function updateFlags() {
    flags.blue.mesh.visible = currentDimension === 'overworld';
    flags.red.mesh.visible = currentDimension === 'overworld';
    if (currentDimension !== 'overworld') return;
    for (const team of ['blue','red']) {
      const f = flags[team];
      if (f.carrier) { f.pos.copy(f.carrier.pos).add(new THREE.Vector3(0,3.4,0)); f.mesh.position.copy(f.pos); }
      else f.mesh.position.copy(f.pos);
    }
    updateFlagPickup(player);
  }
  function updateFlagPickup(actor) {
    if ((actor.dimension || 'overworld') !== 'overworld') return;
    if (!actor.alive) return;
    const enemyTeam = actor.team === 'blue' ? 'red' : 'blue';
    const enemyFlag = flags[enemyTeam];
    if (!actor.carrying && !enemyFlag.carrier && distXZ(actor.pos, enemyFlag.pos) < 4) {
      actor.carrying = enemyTeam; enemyFlag.carrier = actor; enemyFlag.mesh.visible = true;
      if (actor === player) toast('You took the enemy flag! Return to your base.');
    }
    const ownFlag = flags[actor.team];
    if (actor.carrying && distXZ(actor.pos, ownFlag.home) < 7 && !ownFlag.carrier) {
      score[actor.team]++; flags[actor.carrying].carrier = null; flags[actor.carrying].pos.copy(flags[actor.carrying].home); flags[actor.carrying].mesh.position.copy(flags[actor.carrying].home);
      actor.carrying = null; toast(`${actor.name} captured the flag!`);
      if (actor === player) gainXP(85, 'Flag capture');
    }
  }

  function gainXP(amount, reason) {
    const safeAmount = clamp(Math.floor(Number(amount) || 0), 0, MAX_SAFE_PROGRESS);
    const p = player.progress;
    p.level = clamp(Math.floor(Number(p.level) || 1), 1, MAX_SAFE_PROGRESS);
    p.xp = clamp(Number(p.xp) || 0, 0, MAX_SAFE_PROGRESS);
    p.upgradePoints = clamp(Math.floor(Number(p.upgradePoints) || 0), 0, MAX_SAFE_PROGRESS);
    p.xp = clamp(p.xp + safeAmount, 0, MAX_SAFE_PROGRESS);
    toast(`+${safeAmount} XP · ${reason}`);
    let levelUps = 0;
    while (p.level < MAX_SAFE_PROGRESS && p.xp >= xpToNext() && levelUps < 250) {
      p.xp -= xpToNext(); p.level++; p.upgradePoints++;
      const unlocked = unlocksByLevel[p.level] || [];
      const grant = unlocked.filter(id => rarityOrder[itemDefs[id].rarity] >= Math.min(5, Math.ceil(p.level/2))).slice(0, 5);
      grant.forEach(id => addItem(player.inventory, id, itemDefs[id].type === 'arrow' ? 20 : 1, true));
      toast(`Level ${p.level}! ${grant.length ? 'Unlocked: ' + grant.map(id=>itemDefs[id].name).join(', ') : 'Upgrade point gained.'}`);
      levelUps++;
    }
    if (p.xp >= xpToNext()) toast('More levels are banked. Earn or run XP again to keep counting them up.');
    renderInventory(); updateUI();
  }
  function xpToNext() { return Math.min(MAX_SAFE_PROGRESS, 100 + (clamp(player.progress.level, 1, MAX_SAFE_PROGRESS) - 1) * 75); }
  function applyUpgrade(k) {
    const p = player.progress; if (p.upgradePoints <= 0) { toast('No upgrade points yet. Get XP from kills, chests, and flag captures.'); return; }
    if (k === 'h') { player.maxHp += 20; player.hp = player.maxHp; toast('Upgrade: Max Health +20'); }
    else if (k === 'j') { player.maxShield += 15; player.shieldHp = player.maxShield; toast('Upgrade: Shield +15'); }
    else if (k === 'k') { p.damage *= 1.1; toast('Upgrade: Attack Damage +10%'); }
    else if (k === 'l') { p.speed *= 1.05; toast('Upgrade: Move Speed +5%'); }
    else return;
    p.upgradePoints--; updateUI();
  }

  function openEnchantPanel() {
    const stack = selectedStack();
    enchantPanel.classList.toggle('hidden');
    if (!enchantPanel.classList.contains('hidden')) renderEnchantOptions(stack);
  }
  function renderEnchantOptions(stack) {
    enchantOptionsEl.innerHTML = '';
    if (!stack) { enchantTargetEl.textContent = 'Select a weapon, bow, shield, armor item, or elytra in your hotbar.'; return; }
    const d = itemDefs[stack.id];
    let group = d.type;
    if (d.type === 'armor') group = d.slot === 'wings' ? 'wings' : 'armor';
    if (!ENCHANTS[group]) { enchantTargetEl.textContent = `${d.name} cannot be enchanted.`; return; }
    enchantTargetEl.textContent = `Enchanting: ${d.name}. Lapis: ${countItem(player.inventory, 'lapis')} · XP level: ${player.progress.level}`;
    const options = [...ENCHANTS[group]].sort(()=>Math.random()-.5).slice(0,3);
    options.forEach((name, idx) => {
      const level = clamp(Math.floor(player.progress.level / 2) + idx + 1, 1, 5);
      const costXp = 18 + level * 12;
      const costLapis = 1 + Math.floor(level / 2);
      const btn = document.createElement('button'); btn.className = 'enchantBtn';
      btn.innerHTML = `<b>${name} ${roman(level)}</b><br><span>Cost: ${costXp} XP + ${costLapis} lapis</span>`;
      btn.onclick = () => applyEnchant(stack, name, level, costXp, costLapis);
      enchantOptionsEl.appendChild(btn);
    });
  }
  function applyEnchant(stack, name, level, costXp, costLapis) {
    if (gameMode !== 'creative') {
      if (player.progress.xp < costXp) { toast('Not enough XP for that enchantment.'); return; }
      if (countItem(player.inventory, 'lapis') < costLapis) { toast('Not enough lapis. Open chests.'); return; }
      player.progress.xp -= costXp; removeItem(player.inventory, 'lapis', costLapis);
    }
    stack.enchants ||= {}; stack.enchants[name] = Math.max(stack.enchants[name] || 0, level);
    toast(`Enchanted ${itemDefs[stack.id].name} with ${name} ${roman(level)}${gameMode === 'creative' ? ' for free' : ''}.`);
    renderInventory(); renderEnchantOptions(stack); updateUI();
  }
  function roman(n) { return ['','I','II','III','IV','V'][n] || String(n); }

  function renderInventory() {
    if (!player || !player.inventory) return;
    renderSlots(hotbarEl, player.inventory.hotbar, true, false);
    renderSlots(invHotbarEl, player.inventory.hotbar, true, true);
    renderSlots(backpackEl, player.inventory.backpack, false, true);
    renderCreativeInventory();
    renderShulkerPanel();
    renderEquipment(); updateUI();
  }
  function renderCreativeInventory() {
    if (!creativeInventoryEl || !creativeItemsEl) return;
    const creative = gameMode === 'creative';
    creativeInventoryEl.classList.toggle('hidden', !creative);
    if (!creative) { creativeItemsEl.innerHTML = ''; return; }
    creativeItemsEl.innerHTML = '';
    const typeOrder = { block: 1, tool: 2, bow: 3, arrow: 4, melee: 5, shield: 6, armor: 7, consumable: 8, totem: 9, shulker: 10, material: 11 };
    const ids = Object.keys(itemDefs).sort((a, b) => (typeOrder[itemDefs[a].type] || 99) - (typeOrder[itemDefs[b].type] || 99) || itemDefs[a].name.localeCompare(itemDefs[b].name));
    for (const id of ids) {
      const d = itemDefs[id];
      const div = document.createElement('div');
      div.className = 'slot creativeSlot';
      div.title = `${d.name} (${id})`;
      div.innerHTML = `<span class="icon">${d.icon}</span><span class="name">${d.name}</span>`;
      div.onclick = () => giveCreativeItem(id);
      creativeItemsEl.appendChild(div);
    }
  }
  function giveCreativeItem(id) {
    const count = canStack(id) ? stackMax(id) : 1;
    if (addItem(player.inventory, id, count, true)) toast(`Creative: added ${itemDefs[id].name}.`);
    else toast('Inventory full. Add a Shulker Box from Creative Items for more storage.');
    renderInventory(); saveProgress();
  }
  function moveBackpackStackToHotbar(backpackSlots, backpackIndex) {
    const stack = backpackSlots[backpackIndex];
    if (!stack) return;
    let target = player.inventory.hotbar.findIndex(x => !x);
    if (target < 0) target = player.inventory.selected;
    backpackSlots[backpackIndex] = player.inventory.hotbar[target];
    player.inventory.hotbar[target] = stack;
    player.inventory.selected = target;
    saveProgress();
  }
  function renderSlots(root, arr, hot, clickable) {
    root.innerHTML = '';
    arr.forEach((s, i) => {
      const div = document.createElement('div');
      div.className = 'slot' + (!s ? ' empty' : '') + (hot && i === player.inventory.selected ? ' selected' : '');
      if (s) {
        const d = itemDefs[s.id];
        div.innerHTML = `<span class="num">${hot ? i+1 : ''}</span><span class="icon">${d.icon}</span><span class="name">${d.name}</span>${s.count > 1 ? `<span class="count">${s.count}</span>` : ''}${s.contents && s.contents.length ? `<span class="count">${s.contents.length}/27</span>` : ''}${enchantPower(s) ? `<span class="ench">✦${enchantPower(s)}</span>` : ''}`;
      }
      if (clickable) div.onclick = () => {
        if (storeStackInActiveShulker(arr, i)) return;
        if (hot) { player.inventory.selected = i; saveProgress(); }
        else moveBackpackStackToHotbar(arr, i);
        renderInventory();
      };
      root.appendChild(div);
    });
  }
  function renderEquipment() {
    equipmentEl.innerHTML = '';
    const slots = ['helmet','chestplate','leggings','boots','shield','wings'];
    slots.forEach(slot => {
      const s = player.equipment[slot], d = s && itemDefs[s.id];
      const div = document.createElement('div'); div.className = 'equipSlot';
      div.innerHTML = `<span class="label">${slot}</span><span class="icon">${d ? d.icon : '□'}</span><span class="itemName">${d ? d.name : 'Empty'}</span>${s && enchantPower(s) ? `<span class="ench">✦${enchantPower(s)}</span>` : ''}`;
      div.onclick = () => { if (s) { player.equipment[slot] = null; insertStack(player.inventory, s, true); renderInventory(); } };
      equipmentEl.appendChild(div);
    });
  }

  function updateUI() {
    if (!player) return;
    if (gameMode === 'creative') {
      player.hp = player.maxHp; player.shieldHp = player.maxShield;
      ui.hpText.textContent = '∞/∞'; ui.hpBar.style.width = '100%';
    } else {
      ui.hpText.textContent = `${Math.ceil(player.hp)}/${player.maxHp}`; ui.hpBar.style.width = `${clamp(player.hp / player.maxHp * 100,0,100)}%`;
    }
    ui.shieldText.textContent = `${Math.ceil(player.shieldHp)}/${player.maxShield}`; ui.shieldBar.style.width = `${clamp(player.shieldHp / player.maxShield * 100,0,100)}%`;
    const armorPct = Math.round(armorReduction(player) * 100); ui.armorText.textContent = `${armorPct}%`; ui.armorBar.style.width = `${armorPct}%`;
    const p = player.progress; ui.xpText.textContent = `${Math.floor(p.xp)}/${xpToNext()}`; ui.xpBar.style.width = `${clamp(p.xp / xpToNext() * 100,0,100)}%`;
    ui.levelText.textContent = p.level; ui.upgradeText.textContent = p.upgradePoints;
    const remaining = Math.max(0, player.cooldowns.poost - nowSec()); ui.poostText.textContent = remaining > 0 ? remaining.toFixed(1)+'s' : 'Ready';
    ui.scoreText.textContent = currentDimension === 'nether' ? `Dimension: Nether · Blue ${score.blue} : ${score.red} Red` : currentDimension === 'end' ? `Dimension: The End · Blue ${score.blue} : ${score.red} Red` : currentDimension === 'aether' ? `Dimension: The Aether · Blue ${score.blue} : ${score.red} Red` : `Dimension: Castle · Blue ${score.blue} : ${score.red} Red`;
  }

  function toast(text) {
    if (!messagesEl) return;
    const div = document.createElement('div'); div.className = 'toast'; div.textContent = text;
    messagesEl.appendChild(div); setTimeout(() => div.remove(), 3400);
  }

  function updateWorld(dt) {
    if (player && !player.alive) { player.respawn -= dt; if (player.respawn <= 0) respawnActor(player); }
    updatePlayer(dt); updateBots(dt); updateProjectiles(dt); updateStatusEffects(dt); updateFlags(); updateHeldFloorMining(dt); updateDimensionHazards(dt);
    for (const l of lootDrops) {
      l.mesh.visible = (l.dimension || 'overworld') === currentDimension;
      if (!l.mesh.visible) continue;
      l.bob += dt * 4; l.mesh.position.y = l.pos.y + Math.sin(l.bob) * .25; l.mesh.rotation.y += dt * 1.4;
    }
    for (const c of chests) {
      if ((c.dimension || 'overworld') !== currentDimension) continue;
      c.glow.intensity = c.cooldown > nowSec() ? .18 : (c.quality === 'legendary' ? 1.2 : .65);
    }
    if (player && player.shieldHp < player.maxShield) player.shieldHp = Math.min(player.maxShield, player.shieldHp + dt * 2.2);
    if (player && player.alive && nowSec() - lastAutoSave > 2) { saveProgress(); lastAutoSave = nowSec(); }
    updateCamera(); updateUI();
  }

  function updateDimensionHazards(dt) {
    if (!player?.alive || gameMode === 'creative') return;
    if (player.dimensionGraceUntil && nowSec() < player.dimensionGraceUntil) return;
    if (currentDimension === 'nether') {
      const onLava = lavaHazards.some(h => h.dimension === 'nether' && Math.abs(player.pos.x - h.x) <= h.sx / 2 && Math.abs(player.pos.z - h.z) <= h.sz / 2);
      if (onLava) { player.fire = Math.max(player.fire, 2.5); damageActor(player, 22 * dt, null, 'fire'); }
    } else if (currentDimension === 'end') {
      const onIsland = endVoidZones.some(h => Math.abs(player.pos.x - h.x) <= h.sx / 2 && Math.abs(player.pos.z - h.z) <= h.sz / 2);
      if (!onIsland) damageActor(player, 38 * dt, null, 'void');
    } else if (currentDimension === 'aether') {
      if (!isOnAetherIsland(player.pos)) {
        damageActor(player, 10, null, 'void');
        player.pos.copy(safeAetherArrival());
        player.vel.set(0, 5, 0);
        player.mesh.position.copy(player.pos);
        protectAfterDimensionTravel();
        toast('Cloud currents carried you back to an Aether island.');
      }
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    const t = performance.now(); const dt = Math.min(.05, (t - lastTime) / 1000); lastTime = t;
    if (running) updateWorld(dt);
    renderer.render(scene, camera);
  }

  window.addEventListener('resize', () => {
    camera.aspect = mount.clientWidth / mount.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth, mount.clientHeight);
  });
  function keyAliases(e) {
    // Very defensive keyboard mapping: some browsers report Arrow Keys by
    // e.code, some by e.key, and some older contexts only by keyCode.
    const aliases = new Set();
    const byCode = {
      KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd',
      ArrowUp: 'w', ArrowLeft: 'a', ArrowDown: 's', ArrowRight: 'd',
      Space: ' ', ShiftLeft: 'shift', ShiftRight: 'shift'
    };
    const byKey = {
      w: 'w', a: 'a', s: 's', d: 'd',
      arrowup: 'w', up: 'w',
      arrowleft: 'a', left: 'a',
      arrowdown: 's', down: 's',
      arrowright: 'd', right: 'd',
      ' ': ' ', space: ' ', shift: 'shift'
    };
    const byKeyCode = { 87: 'w', 65: 'a', 83: 's', 68: 'd', 38: 'w', 37: 'a', 40: 's', 39: 'd', 32: ' ', 16: 'shift' };
    if (byCode[e.code]) aliases.add(byCode[e.code]);
    const key = String(e.key || '').toLowerCase();
    if (byKey[key]) aliases.add(byKey[key]);
    if (byKeyCode[e.keyCode]) aliases.add(byKeyCode[e.keyCode]);
    if (/^[1-9]$/.test(key)) aliases.add(key);
    if (!aliases.size && key) aliases.add(key);
    return [...aliases];
  }
  function firstAlias(e) { return keyAliases(e)[0] || ''; }
  function isMovementOrActionKey(e, aliases) {
    const actionKeys = new Set(['w','a','s','d',' ','shift','arrowup','arrowdown','arrowleft','arrowright']);
    return aliases.some(k => actionKeys.has(k)) || [37,38,39,40,32].includes(e.keyCode);
  }

  document.addEventListener('keydown', e => {
    const aliases = keyAliases(e);
    const k = aliases[0] || '';
    if (isMovementOrActionKey(e, aliases)) { e.preventDefault(); e.stopPropagation(); }
    for (const key of aliases) keys.add(key);
    if (k === ' ') { jump(); }
    if (/^[1-9]$/.test(k)) { player.inventory.selected = Number(k)-1; renderInventory(); }
    if (k === 'i') {
      invPanel.classList.toggle('hidden');
      if (invPanel.classList.contains('hidden')) { closeShulkerPanel(); closeStationPanels(); }
      renderInventory();
    }
    if (k === 'c') openEnchantPanel();
    if (k === 'f') pickupOpenMine();
    if (k === 'e') useSecretPassage();
    if (k === 'q') doPoost();
    if (k === 'g') dropSelected();
    if (['h','j','k','l'].includes(k)) applyUpgrade(k);
    if (k === 'r') resetGame(false);
  }, { passive: false, capture: true });
  document.addEventListener('keyup', e => {
    const aliases = keyAliases(e);
    if (isMovementOrActionKey(e, aliases)) { e.preventDefault(); e.stopPropagation(); }
    for (const key of aliases) keys.delete(key);
  }, { passive: false, capture: true });
  renderer.domElement.addEventListener('click', () => { if (!pointer.locked) renderer.domElement.requestPointerLock(); });
  playBtn.addEventListener('click', () => { startOverlay.classList.add('hidden'); renderer.domElement.requestPointerLock(); });
  document.addEventListener('pointerlockchange', () => { pointer.locked = document.pointerLockElement === renderer.domElement; });
  document.addEventListener('mousemove', e => {
    if (!pointer.locked) return;
    yaw -= e.movementX * 0.0022; pitch -= e.movementY * 0.002;
  });
  document.addEventListener('mousedown', e => {
    if (e.button === 0) {
      mouseButtons.left = true;
      if (isMiningTool() && targetFloorCellFromCrosshair(18)) return;
      useActive();
    }
    if (e.button === 2) mouseButtons.right = true;
  });
  document.addEventListener('mouseup', e => { if (e.button === 0) mouseButtons.left = false; if (e.button === 2) mouseButtons.right = false; });
  document.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('beforeunload', saveProgress);
  window.addEventListener('pagehide', saveProgress);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveProgress(); });

  function dropSelected() {
    const s = selectedStack(); if (!s) return;
    player.inventory.hotbar[player.inventory.selected] = null;
    createLoot(player.pos.clone().add(yawDir().multiplyScalar(2)).add(new THREE.Vector3(0,1,0)), s);
    toast(`Dropped ${stackLabel(s)}.`); renderInventory();
  }

  buildWorldAndStart();
})();
