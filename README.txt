Castle Loot Archers 3D
======================

This is an original 3D browser game inspired by medieval castle archery games.
It is not a copy of Narrow One or Minecraft, but it includes similar-style ideas:
low-poly castle combat, bows, melee, shields, armor, enchanting, chests, block building, elytra gliding, and poosting-style movement abilities.

How to play
-----------
1. Unzip the folder.
2. Open index.html in Chrome or Edge.
3. You need internet the first time because the game loads the free Three.js 3D library from a CDN.
4. Click "Click to Play 3D" and allow mouse lock.

Controls
--------
WASD or Arrow Keys: Move (A/Left Arrow = left, D/Right Arrow = right)
Mouse: Look and aim
Space: Jump
Hold Space while falling with Elytra equipped: Glide
Left Click: Shoot / melee / place block / equip selected gear
Right Click or Shift: Shield block
Q: Poost ability with poke weapons
1-9: Select hotbar slot
I: Open inventory
C: Open enchanting table
F: Pick up loot / open chest / mine block / collect resources
E: Use secret passage
G: Drop selected item
H/J/K/L: Character upgrades
R: Restart match

New 3D features
---------------
- First-person 3D camera and low-poly castle arena
- Jumping, gravity, falling, and elytra glide
- Secret passage doors
- Chest loot around the map
- Fortnite-style enemy loot drops after kills
- XP, levels, upgrades, and gear unlocks
- Minecraft-style hotbar/backpack inventory and stackable blocks
- Armor slots: helmet, chestplate, leggings, boots, shield, wings
- Minecraft armor types: leather, gold, chainmail, iron, diamond, netherite, turtle helmet, and elytra
- Minecraft-inspired enchanting system using XP and lapis
- Bows, arrows, melee weapons, shields, blocks, consumables, and materials in inventory

Poosting abilities
------------------
Use Q with a poke weapon such as Short Spear, Sharpened Branch, Pitchfork, Spear, Halberd, Trident, or Fang Tian Ji.
The game includes:
- Switch Poost: forward lunge boost
- Spin / 180 Poost: hold S and press Q for a stronger turn boost
- Ladder Poost: press Q near ladder/tower spots to launch upward
- Edge Poost: press Q near walls, crates, or edge-boost objects for a high jump

Good loot tips
--------------
- Legendary chests can drop Elytra, Netherite gear, Storm Bow, explosive arrows, and rare poke weapons.
- Enchant bows with Power, Flame, Infinity, Multishot, Quick Charge, or Piercing.
- Enchant melee with Sharpness, Knockback, Looting, Fire Aspect, or Poost Burst.
- Enchant armor with Protection, Projectile Protection, Fire Protection, Blast Protection, Thorns, Feather Falling, Swift Sneak, or Mending.


FIX NOTES (latest):
- Fixed Arrow Keys again with a stronger keyboard listener that reads e.code, e.key, and keyCode, so arrows work even when the 3D canvas has focus.
- Fixed the blank 3D screen bug caused by the player being created before the hotbar renderer was ready.
- Fixed the missing hotbar bug; the 9 slots now render after game reset.
- Added Arrow Key movement support alongside WASD.
- Made the starting castle keeps non-blocking so the player/camera does not spawn inside a solid wall.
- Added a forced renderer resize after loading to prevent a black/zero-size canvas.
