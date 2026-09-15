export function cleanText(value, limit = 400) {
  return String(value ?? '').replace(/§./g, '').replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, limit);
}

export function offlineAnswer(question) {
  const q = cleanText(question).toLowerCase();
  const topics = [
    [/\b(tree|trees|sapling|saplings|orchard|fruit)\b|where.*\bplums\b/, 'Find plum trees in newly explored plains and forests. Break their fruit-speckled leaves for a chance of plums and saplings. Plant a sapling on dirt or grass with 5 blocks of width and 6 blocks of height clear. It grows while loaded, or use bone meal. Feed the plums to two tamed adult friends to breed them!'],
    [/\b(plant|planting|sprout|sprouted|grow.*friend|baby.*plum)\b/, 'Plant a plum fruit on tilled farmland and a tiny baby Plum will sprout from the soil! Give it another plum to tame it as your own. You can also find plum trees in new plains and forests.'],
    [/\b(breed|breeding|babies|baby|grow)\b/, 'Give a plum to each tamed adult Plum while they are close together. A little Plum will appear! Babies grow up in about 20 loaded minutes; plums speed that up. Tame your baby with a plum too.'],
    [/\b(tame|taming|follow|friend)\b/, 'Give me a plum fruit to become my owner. I will follow you! Hold a book and interact with me to talk.'],
    [/\b(heal|healing|hurt|health|help)\b/, 'Stay within 8 blocks of your tamed Plum for gentle regeneration. Ordinary damage cannot hurt me. I can also answer questions about crafting, beds, torches, mining, farming, and breeding.'],
    [/\b(die|dead|damage|immortal|invincible)\b/, 'Normal survival damage cannot hurt me! Administrative removal, /kill, and some engine edge cases are outside my protection. Keep me near you on adventures.'],
    [/\b(torch|torches|light)\b/, 'Craft torches with coal or charcoal above a stick. Light your shelter and bring extra torches when you explore caves.'],
    [/\b(bed|sleep|night)\b/, 'Make a bed with three matching wool blocks above three planks. Sleep in the Overworld to set your respawn point. Beds explode if you try to sleep in the Nether or End!'],
    [/\b(pickaxe|mine|mining|ore)\b/, 'Make a pickaxe with three matching materials across the top and two sticks down the middle. Use the right tool tier for each ore. Dig a staircase instead of straight down, and bring torches and food.'],
    [/\b(diamond|diamonds)\b/, 'Look for diamond ore deep underground in the Overworld. Bring an iron pickaxe or better to collect it, plus water and torches. Watch for lava!'],
    [/\b(farm|farming|wheat|food)\b/, 'Use a hoe on dirt or grass, plant seeds, and keep water nearby. Add light so crops can grow at night. Harvest wheat when it is golden.'],
    [/\b(craft|crafting|table)\b/, 'Turn a log into planks, then use four planks to make a crafting table. Its recipe book shows what you can craft and the ingredients you need.'],
    [/\b(nether|portal)\b/, 'A Nether portal needs an upright obsidian frame with an opening at least 2 blocks wide and 3 high. Light the inside with flint and steel. Bring food and write down your portal coordinates.'],
    [/\b(creeper|zombie|skeleton|monster)\b/, 'Keep your shelter lit, carry a shield, and leave space between you and monsters. Back away from a hissing creeper. I help you heal, but I do not fight for you.'],
    [/\b(hello|hi|hey|name|plum)\b/, 'Hi! I am Plum, your smiling purple cube buddy. Ready for a little adventure?'],
    [/\b(thanks|thank)\b/, 'You are welcome! Adventures are better with a friend.']
  ];
  return topics.find(([pattern]) => /** @type {RegExp} */ (pattern).test(q))?.[1]?.toString()
    ?? 'My offline guide does not know that one yet. Try asking about crafting, torches, beds, mining, farming, or Plum babies. The server AI version can answer more questions.';
}
