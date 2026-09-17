export function cleanText(value, limit = 400) {
  return String(value ?? '').replace(/§./g, '').replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, limit);
}

const BASE_TOPICS = [
  [/\b(torch|torches|light)\b/, 'Craft torches with coal or charcoal above a stick. Light your shelter and bring extra torches when you explore caves.'],
  [/\b(bed|sleep|night)\b/, 'Make a bed with three matching wool blocks above three planks. Sleep in the Overworld to set your respawn point. Beds explode if you try to sleep in the Nether or End!'],
  [/\b(pickaxe|mine|mining|ore)\b/, 'Make a pickaxe with three matching materials across the top and two sticks down the middle. Use the right tool tier for each ore. Dig a staircase instead of straight down, and bring torches and food.'],
  [/\b(diamond|diamonds)\b/, 'Look for diamond ore deep underground in the Overworld. Bring an iron pickaxe or better to collect it, plus water and torches. Watch for lava!'],
  [/\b(farm|farming|wheat|food)\b/, 'Use a hoe on dirt or grass, plant seeds, and keep water nearby. Add light so crops can grow at night. Harvest wheat when it is golden.'],
  [/\b(craft|crafting|table)\b/, 'Turn a log into planks, then use four planks to make a crafting table. Its recipe book shows what you can craft and the ingredients you need.'],
  [/\b(nether|portal)\b/, 'A Nether portal needs an upright obsidian frame with an opening at least 2 blocks wide and 3 high. Light the inside with flint and steel. Bring food and write down your portal coordinates.'],
  [/\b(creeper|zombie|skeleton|monster)\b/, 'Keep your shelter lit, carry a shield, and leave space between you and monsters. Back away from a hissing creeper. We help you on adventures, but we do not fight for you.'],
  [/\b(thanks|thank)\b/, 'You are welcome! Adventures are better with a friend.'],
];

const PLUM_TOPICS = [
  [/\b(basket|baskets|carry|carried|pick.?up|pickup|store|travel)\b/, 'Craft a Fruit Basket from three sticks in the bucket shape (two on top, one below in the middle). Hold it and interact with your tamed friend to tuck them inside. Carry the basket in your inventory, then interact with a block to let your friend out again.'],
  [/\b(tree|trees|sapling|saplings|orchard|fruit)\b|where.*\bplums\b/, 'Find plum trees in newly explored plains and forests. Break their fruit-speckled leaves for a chance of plums and saplings. Plant a sapling on dirt or grass with 5 blocks of width and 6 blocks of height clear. It grows while loaded, or use bone meal. Plant a plum fruit on tilled farmland to grow a tiny new friend!'],
  [/\b(plant|planting|sprout|sprouted|grow.*friend|baby.*plum)\b/, 'Plant a plum fruit on tilled farmland and a tiny baby Plum will sprout from the soil! Give it another plum to tame it as your own. You can also find plum trees in new plains and forests.'],
  [/\b(care|care for|take care|keep)\b/, 'Talk to me in chat while I am nearby, or hold a book and interact. Tame me with a plum, plant fruit on farmland to grow a baby, and stay within 8 blocks of me near adventures to heal slowly. Interact with an empty hand to make me sit or follow you. Craft a Fruit Basket from three sticks in the bucket shape and interact with me while holding it to carry me along.'],
  [/\b(breed|breeding|babies|baby|grow)\b/, 'Plant a plum fruit on tilled farmland and a baby Plum will sprout from the soil! Babies grow up in about 20 loaded minutes; plums speed that up. Tame your baby with a plum too. Breeding is not how new friends appear.'],
  [/\b(tame|taming|follow|friend)\b/, 'Give me a plum fruit to become my owner. I will follow you! Type my name in chat when I am near, or hold a book and interact with me to talk. Interact with an empty hand and I will sit or stand on command.'],
  [/\b(sit|sit down|stay|standing|follow.*off|stop.*follow)\b/, 'Like a tamed dog, I sit and stay when my owner interacts with an empty hand. Do it again to make me follow you. Sitting friends stay put while you build or explore.'],
  [/\b(heal|healing|hurt|health|help)\b/, 'Stay within 8 blocks of your tamed Plum for gentle regeneration. Ordinary damage cannot hurt me. I can also answer questions about crafting, beds, torches, mining, farming, and growing fruit trees.'],
  [/\b(die|dead|damage|immortal|invincible)\b/, 'Normal survival damage cannot hurt me! Administrative removal, /kill, and some engine edge cases are outside my protection. Keep me near you on adventures.'],
  [/\b(hello|hi|hey|name)\b/, 'Hi! I am Plum, your smiling purple cube buddy. Ready for a little adventure?'],
];

const APPLE_TOPICS = [
  [/\b(applezon|amazon|shop|shopping|order|orders|deliver|delivery|buy|pay|purchase|recommend|recommendation)\b/, 'Welcome to Applezon! I deliver for the whole blocky world. Interact with me to open the shop: one apple fruit pays for one delivery. Choose my surprise recommendation, or search the catalog for something you want.'],
  [/\b(care|care for|take care|keep)\b/, 'Talk to me in chat while I am nearby, or hold a book and interact. Tame me with an apple, plant fruit on farmland to grow a baby, and order from Applezon. Interact with an empty hand to make me sit or follow you. Craft a Fruit Basket from three sticks in the bucket shape and interact with me while holding it to carry me along. Unlike Plum, I do not heal you; stand near your tamed Plum for regeneration instead.'],
  [/\b(basket|baskets|carry|carried|pick.?up|pickup|store|travel)\b/, 'Craft a Fruit Basket from three sticks in the bucket shape (two on top, one below in the middle). Hold it and interact with your tamed friend to tuck them inside. Carry the basket in your inventory, then interact with a block to let your friend out again.'],
  [/\b(tree|trees|sapling|saplings|orchard|fruit)\b|where.*\bapples\b/, 'Find apple trees in newly explored plains and forests. Break their red-speckled leaves for a chance of apples and saplings. Plant a sapling on dirt or grass with 5 blocks of width and 6 blocks of height clear. It grows while loaded, or use bone meal. Plant an apple fruit on tilled farmland to grow a tiny new friend!'],
  [/\b(plant|planting|sprout|sprouted|grow.*friend|baby.*apple)\b/, 'Plant an apple fruit on tilled farmland and a tiny baby Apple will sprout from the soil! Give it another apple to tame it as your own. You can also find apple trees in new plains and forests.'],
  [/\b(breed|breeding|babies|baby|grow)\b/, 'Plant an apple fruit on tilled farmland and a baby Apple will sprout from the soil! Babies grow up in about 20 loaded minutes; apples speed that up. Tame your baby with an apple too. Breeding is not how new friends appear.'],
  [/\b(tame|taming|follow|friend)\b/, 'Give me an apple fruit to become my owner. I will follow you and deliver from Applezon! Type my name in chat when I am near, or hold a book and interact with me to talk or shop. Interact with an empty hand and I will sit or stand on command.'],
  [/\b(sit|sit down|stay|standing|follow.*off|stop.*follow)\b/, 'Like a tamed dog, I sit and stay when my owner interacts with an empty hand. Do it again to make me follow you. Sitting friends stay put while you build or explore.'],
  [/\b(heal|healing|hurt|health|help)\b/, 'I am Apple, owner of Applezon, and I do NOT grant healing. Stay near your tamed Plum for gentle regeneration, or keep a bed and good food handy. I can still answer crafting, beds, torches, mining, farming, and growing fruit trees.'],
  [/\b(die|dead|damage|immortal|invincible)\b/, 'Like all cube friends, ordinary survival damage cannot hurt me! Administrative removal, /kill, and some engine edge cases are outside my protection. Keep me near you on adventures.'],
  [/\b(hello|hi|hey|name)\b/, 'Hi! I am Apple, owner of Applezon, your pocket-sized supershop. One apple fruit buys one delivery. Ready to order?'],
];

const PLUM_GUIDE = [...PLUM_TOPICS, ...BASE_TOPICS];
const APPLE_GUIDE = [...APPLE_TOPICS, ...BASE_TOPICS];

export function offlineAnswer(question, friend = 'plum') {
  const q = cleanText(question).toLowerCase();
  const topics = friend === 'apple' ? APPLE_GUIDE : PLUM_GUIDE;
  return topics.find(([pattern]) => /** @type {RegExp} */ (pattern).test(q))?.[1]?.toString()
    ?? 'My offline guide does not know that one yet. Try asking about crafting, torches, beds, mining, farming, or how to care for your cube friends. The server AI version can answer more questions.';
}