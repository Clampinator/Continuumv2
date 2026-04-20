// All player-selectable Benefits. mechanic: "diceBonus" | "passive" | "narrative"
// diceBonus benefits appear as toggle buttons in the dice roller dialog.
export const BENEFIT_DEFINITIONS = [
    {
        id: "ambidextrous",
        name: "Ambidextrous",
        mechanic: "passive",
        description: "The character can use either hand with equal proficiency. Use of the off-hand normally results in a -1 modifier to the Target Number."
    },
    {
        id: "aptitude",
        name: "Aptitude",
        mechanic: "diceBonus",
        bonusAmount: 1,
        description: "+1 to the existing Resonance of a roll where the roll relates to the chosen Aptitude. The need for a teacher is also waived as long as the character can acquire information on their own."
    },
    {
        id: "connections",
        name: "Connections",
        mechanic: "narrative",
        description: "The character knows people in high places. The player and GM agree on an NPC in a powerful position that is friends with the character, from their native locality."
    },
    {
        id: "contortionist",
        name: "Contortionist",
        mechanic: "diceBonus",
        bonusAmount: 1,
        description: "+1 to Force or Move rolls related to physical flexibility."
    },
    {
        id: "extraordinaryBeauty",
        name: "Extraordinary Beauty",
        mechanic: "diceBonus",
        bonusAmount: 1,
        description: "People find the character captivating. +1 to any existing Resonance involving Relate rolls. Stacks with Fame."
    },
    {
        id: "fame",
        name: "Fame",
        mechanic: "diceBonus",
        bonusAmount: 1,
        description: "The character is well-known and generally liked in their locality. +1 to any existing Resonance involving Relate rolls. Stacks with Extraordinary Beauty."
    },
    {
        id: "internalClock",
        name: "Internal Clock",
        mechanic: "narrative",
        description: "The character naturally has an accurate sense of what time it is. If disoriented (knocked unconscious, shock, etc.) they must re-establish the correct time before this ability works again."
    },
    {
        id: "lucky",
        name: "Lucky",
        mechanic: "passive",
        description: "Once per game session, the player may reroll any one die roll and accept the results from either roll."
    },
    {
        id: "mathWiz",
        name: "Math Wiz",
        mechanic: "diceBonus",
        bonusAmount: 2,
        description: "The character can perform complicated math in their head at a rapid rate. +2 to any existing Resonance involving Math for Analyze rolls."
    },
    {
        id: "perceptive",
        name: "Perceptive",
        mechanic: "diceBonus",
        bonusAmount: 2,
        description: "+2 to Analyze for any rolls related to perception."
    },
    {
        id: "photographicMemory",
        name: "Photographic Memory",
        mechanic: "diceBonus",
        bonusAmount: 2,
        description: "The character has total recall of past events and information. For complex or distant-past situations an Analyze roll may be required, made with +2 to Analyze."
    },
    {
        id: "sharpReflexes",
        name: "Sharp Reflexes",
        mechanic: "diceBonus",
        bonusAmount: 2,
        description: "+2 to Move for purposes of rolling for Action Points in combat."
    },
    {
        id: "senseOfDirection",
        name: "Sense of Direction",
        mechanic: "diceBonus",
        bonusAmount: 1,
        description: "The character has an innate sense of direction. With a successful Move roll, the character can tell what direction they are facing. +1 modifier applies to this roll."
    },
    {
        id: "speedReader",
        name: "Speed Reader",
        mechanic: "diceBonus",
        bonusAmount: 1,
        description: "+1 to any Analyze roll involving reading. Stacks with other Analyze Benefits."
    },
    {
        id: "tough",
        name: "Tough",
        mechanic: "passive",
        description: "The character takes 1 less IP from wounds inflicting Bruise damage. This reduction is applied automatically."
    },
    {
        id: "wealthy",
        name: "Wealthy",
        mechanic: "narrative",
        description: "Make two assets rolls to represent your wealth. Applies at character creation."
    },
    {
        id: "willpower",
        name: "Willpower",
        mechanic: "passive",
        description: "You may have an extra point of Permanent Willpower. Adjust your Perm Will spinner manually to reflect this bonus."
    }
];
